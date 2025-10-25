import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getUserByIdenityId, requireAuth, requireVisionAccess } from "./utils/auth";
import { paginationOptsValidator } from "convex/server";
import { nodeValidator } from "./reactflow/types";
import { persistentTextStreaming } from "./messages";
import { Position } from "@xyflow/react";
import { ReferencesMapItem } from "./tables/references";
import { internal } from "./_generated/api";

/**
 * Helper function to extract reference node IDs from text content
 * Parses markdown link format: [ref:label](node_id)
 */
function extractReferencesFromText(text: string): Id<"nodes">[] {
    if (!text) return [];

    // Match pattern: [ref:label](node_id)
    const referencePattern = /\[ref:[^\]]+\]\(([^)]+)\)/g;
    const references: Id<"nodes">[] = [];
    let match;

    while ((match = referencePattern.exec(text)) !== null) {
        const nodeId = match[1];
        if (nodeId) {
            references.push(nodeId as Id<"nodes">);
        }
    }

    return references;
}

const createArgs = v.object({
    frameId: v.optional(v.id("frames")),
    channel: v.id("channels"),
    title: v.string(),
    position: v.optional(nodeValidator(v.string())),
    variant: v.string(),
    value: v.string(),
    thought: v.optional(v.string()),
    sourceNode: v.optional(v.object({
        id: v.string(),
        handlepos: v.optional(v.string()),
    })),
    audioUrl: v.optional(v.string()),
});

const updateArgs = v.object({
    id: v.id("nodes"),
    title: v.optional(v.string()),
    variant: v.optional(v.string()),
    thought: v.optional(v.string()),
    value: v.optional(v.string()),
    threads: v.optional(v.array(v.id("nodes"))),
});

const removeArgs = v.object({
    id: v.id("nodes"),
});

const getArgs = v.object({
    id: v.id("nodes"),
});

const listByFrameArgs = v.object({
    frameId: v.id("frames"),
});

const connectNodesArgs = v.object({
    nodeId: v.id("nodes"),
    targetNodeId: v.id("nodes"),
});

const disconnectNodesArgs = v.object({
    nodeId: v.id("nodes"),
    targetNodeId: v.id("nodes"),
});

const createTextNodeFromMessageArgs = v.object({
    messageId: v.id("messages"),
    chatId: v.id("chats"),
});

export const create = mutation({
    args: createArgs,
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channel);
        if (!channel) {
            throw new Error("Channel not found");
        }

        if (channel.vision) {
            await requireVisionAccess(ctx, channel.vision);
        }

        if (args.frameId) {
            const frame = await ctx.db.get(args.frameId);
            if (!frame) {
                throw new Error("Frame not found");
            }
            if (frame.channel !== args.channel) {
                throw new Error("Frame does not belong to the specified channel");
            }
        }

        const now = new Date().toISOString();
        const identity = await requireAuth(ctx);

        const userId = (await getUserByIdenityId(ctx, identity.userId as string))?._id;

        if (!userId) {
            throw new Error("Failed to get userId from identity")
        }

        const data = {
            title: args.title,
            variant: args.variant,
            value: args.value,
            thought: args.thought,
            frame: args.frameId,
            channel: channel._id,
            vision: channel.vision,
            userId,
            updatedAt: now,
            audioUrl: args.audioUrl,
        }
        const nodeId = await ctx.db.insert("nodes", data);

        if (args.position && args.frameId) {
            const node = { ...args.position, data: nodeId, type: args.variant || "Text" }

            await ctx.db.insert("framed_node", {
                frameId: args.frameId,
                node
            })

            await ctx.db.insert("frame_positions", {
                frameId: args.frameId,
                nodeId: nodeId,
                batch: [node],
                batchTimestamp: Date.now(),
            })
        }

        // Extract and create references from node content (value and thought fields)
        if (channel.vision) {
            const referencedNodeIds = [
                ...extractReferencesFromText(args.value),
                ...extractReferencesFromText(args.thought || ""),
            ];

            // Remove duplicates
            const uniqueReferencedNodeIds = Array.from(new Set(referencedNodeIds));

            if (uniqueReferencedNodeIds.length > 0) {
                await ctx.runMutation(internal.references.createReferences, {
                    nodeIdList: [nodeId, ...uniqueReferencedNodeIds],
                    vision: channel.vision,
                    channel: channel._id,
                    frame: args.frameId,
                });
            }
        }

        return nodeId;
    },
});

export const update = mutation({
    args: updateArgs,
    handler: async (ctx, args) => {
        const node = await ctx.db.get(args.id);
        if (!node) {
            throw new Error("Node not found");
        }

        if (node.vision) {
            await requireVisionAccess(ctx, node.vision);
        }

        // Extract old references from current node content
        const oldReferences = [
            ...extractReferencesFromText(node.value || ""),
            ...extractReferencesFromText(node.thought || ""),
        ];

        // Extract new references from updated content
        const newValue = args.value !== undefined ? args.value : node.value;
        const newThought = args.thought !== undefined ? args.thought : node.thought;
        const newReferences = [
            ...extractReferencesFromText(newValue || ""),
            ...extractReferencesFromText(newThought || ""),
        ];

        // Find removed and added references
        const oldRefSet = new Set(oldReferences);
        const newRefSet = new Set(newReferences);

        const removedReferences = oldReferences.filter((ref) => !newRefSet.has(ref));
        const addedReferences = newReferences.filter((ref) => !oldRefSet.has(ref));

        // Delete references that were removed
        if (node.vision && removedReferences.length > 0) {
            const referenceIds = await ctx.db
                .query("references")
                .withIndex("by_parent", (q) => q.eq("parent", args.id))
                .collect()
                .then((refs) =>
                    refs
                        .filter((ref) => removedReferences.includes(ref.ref))
                        .map((ref) => ref._id)
                );

            if (referenceIds.length > 0) {
                await ctx.runMutation(internal.references.deleteReferences, {
                    referenceIdList: referenceIds,
                    vision: node.vision,
                });
            }
        }

        // Create references that were added
        if (node.vision && addedReferences.length > 0) {
            await ctx.runMutation(internal.references.createReferences, {
                nodeIdList: [args.id, ...addedReferences],
                vision: node.vision,
                channel: node.channel,
                frame: node.frame as Id<"frames"> | undefined,
            });
        }

        const updates: any = {
            updatedAt: new Date().toISOString(),
        };

        if (args.title !== undefined) updates.title = args.title;
        if (args.thought !== undefined) updates.thought = args.thought;
        if (args.variant !== undefined) updates.variant = args.variant;
        if (args.value !== undefined) updates.value = args.value;
        if (args.threads !== undefined) updates.threads = args.threads;

        await ctx.db.patch(args.id, updates);
    },
});

export const remove = mutation({
    args: removeArgs,
    handler: async (ctx, args) => {
        const node = await ctx.db.get(args.id);
        if (!node) {
            throw new Error("Node not found");
        }

        if (node.vision) {
            await requireVisionAccess(ctx, node.vision);
        }

        // Delete all references for the node being deleted
        // This includes references where the node is a parent and references where the node is referenced
        if (node.vision) {
            const parentReferences = await ctx.db
                .query("references")
                .withIndex("by_parent", (q) => q.eq("parent", args.id))
                .collect();

            const refReferences = await ctx.db
                .query("references")
                .withIndex("by_ref", (q) => q.eq("ref", args.id))
                .collect();

            const allReferenceIds = [
                ...parentReferences.map((ref) => ref._id),
                ...refReferences.map((ref) => ref._id),
            ];

            if (allReferenceIds.length > 0) {
                await ctx.runMutation(internal.references.deleteReferences, {
                    referenceIdList: allReferenceIds,
                    vision: node.vision,
                });
            }
        }

        await ctx.db.delete(args.id);
    },
});

export const getMany = query({
    args: {
        ids: v.array(v.id("nodes")),
    },
    handler: async (ctx, args) => {
        return await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    },
});

export const get = query({
    args: getArgs,
    handler: async (ctx, args) => {
        const node = await ctx.db.get(args.id);
        if (!node) {
            throw new Error("Node not found");
        }

        if (node.vision) {
            await requireVisionAccess(ctx, node.vision);
        }

        return node;
    },
});

export const listByFrame = query({
    args: listByFrameArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const nodes = await ctx.db
            .query("nodes")
            .withIndex("by_frame", (q) => q.eq("frame", args.frameId))
            .collect();

        return nodes;
    },
});

const listByChannelArgs = v.object({
    channelId: v.id("channels"),
    paginationOpts: paginationOptsValidator,
    filters: v.optional(v.object({
        search: v.optional(v.string()),
        variant: v.optional(v.string()),
        userIds: v.optional(v.array(v.id("users"))),
        sortBy: v.optional(v.string()), 
    })),
})
export const listByChannel = query({
    args: listByChannelArgs,
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel) {
            throw new Error("Channel not found");
        }

        if (channel.vision) {
            await requireVisionAccess(ctx, channel.vision);
        }

        const sortBy = args.filters?.sortBy || "latest";
        const paginationOpts = args.paginationOpts;

        let nodesQuery;

        if (args.filters?.search) {
            const search = (args.filters?.search || "").toLowerCase();

            // Helper function to check if a string is a URL
            const isUrl = (str: string): boolean => {
                try {
                    new URL(str);
                    return true;
                } catch {
                    return false;
                }
            };

            // Search across title, thought, and value fields using separate search indexes
            const searchTitleResults = await ctx.db
                .query("nodes")
                .withSearchIndex("search_title", (q) =>
                    q
                        .search("title", search)
                        .eq("channel", args.channelId)
                )
                .collect();

            const searchThoughtResults = await ctx.db
                .query("nodes")
                .withSearchIndex("search_thought", (q) =>
                    q
                        .search("thought", search)
                        .eq("channel", args.channelId)
                )
                .collect();

            const searchValueResults = await ctx.db
                .query("nodes")
                .withSearchIndex("search_value", (q) =>
                    q
                        .search("value", search)
                        .eq("channel", args.channelId)
                )
                .collect();

            // Combine results and deduplicate using a map
            const resultMap = new Map<string, (typeof searchTitleResults)[0]>();

            // Add title matches
            searchTitleResults.forEach((node) => {
                resultMap.set(node._id.toString(), node);
            });

            // Add thought matches
            searchThoughtResults.forEach((node) => {
                resultMap.set(node._id.toString(), node);
            });

            // Add value matches (only if not a URL)
            searchValueResults.forEach((node) => {
                if (!isUrl(node.value)) {
                    resultMap.set(node._id.toString(), node);
                }
            });

            let allResults = Array.from(resultMap.values());

            // Apply variant filter if provided
            if (args.filters?.variant) {
                allResults = allResults.filter((node) => node.variant === args.filters!.variant);
            }

            // Apply userIds filter if provided
            if (args.filters?.userIds && args.filters.userIds.length > 0) {
                const userIdSet = new Set(args.filters.userIds);
                allResults = allResults.filter((node) => userIdSet.has(node.userId));
            }

            // Apply sorting
            if (sortBy !== "latest") {
                allResults.reverse();
            }

            // Create a paginated result from the filtered data
            const startIndex = paginationOpts.cursor ? parseInt(paginationOpts.cursor) : 0;
            const endIndex = startIndex + paginationOpts.numItems;
            const paginatedPage = allResults.slice(startIndex, endIndex);
            const isDone = endIndex >= allResults.length;
            const continueCursor = isDone ? null : (endIndex.toString() as any);

            // Enrich paginated nodes with frame information
            const nodesWithFrames = await Promise.all(
                paginatedPage.map(async (node) => {
                    let frameTitle = null;
                    if (node.frame) {
                        const frame = await ctx.db.get(node.frame as Id<"frames">);
                        frameTitle = frame?.title || null;
                    }
                    return {
                        ...node,
                        frameTitle,
                    };
                })
            );

            // Fetch all references for the nodes in this page
            const nodeIds = nodesWithFrames.map((node) => node._id);
            const referencesMap: ReferencesMapItem[] = await ctx.runQuery(internal.references.getReferences, {
                nodeIdList: nodeIds,
                vision: channel.vision,
            });

            // Create a map for quick lookup
            const referencesByNodeId = new Map(
                referencesMap.map((ref) => [ref.nodeId, ref.referencingNodes])
            );

            // Integrate references into nodes
            const nodesWithReferences = nodesWithFrames.map((node) => ({
                ...node,
                referencedIn: referencesByNodeId.get(node._id) || [],
            }));

            return {
                page: nodesWithReferences,
                isDone,
                continueCursor,
            };
        } else {
            nodesQuery = ctx.db
                .query("nodes")
                .withIndex("by_channel", (q) => q.eq("channel", args.channelId))
                .order(sortBy === "latest" ? "asc" : "desc");
        }

        if (args.filters?.variant) {
            nodesQuery = nodesQuery.filter((q) =>
                q.eq(q.field("variant"), args.filters!.variant)
            );
        }

        if (args.filters?.userIds && args.filters.userIds.length > 0) {
            nodesQuery = nodesQuery.filter((q) =>
                q.or(
                    ...args.filters!.userIds!.map((id) => q.eq(q.field("userId"), id))
                )
            );
        }

        const { page, isDone, continueCursor } = await nodesQuery.paginate(
            paginationOpts
        );

        // Enrich nodes with frame information
        const nodesWithFrames = await Promise.all(
            page.map(async (node) => {
                let frameTitle = null;
                if (node.frame) {
                    const frame = await ctx.db.get(node.frame as Id<"frames">);
                    frameTitle = frame?.title || null;
                }
                return {
                    ...node,
                    frameTitle,
                };
            })
        );

        // Fetch all references for the nodes in this page
        const nodeIds = nodesWithFrames.map((node) => node._id);
        const referencesMap: ReferencesMapItem[] = await ctx.runQuery(internal.references.getReferences, {
            nodeIdList: nodeIds,
            vision: channel.vision,
        });

        // Create a map for quick lookup
        const referencesByNodeId = new Map(
            referencesMap.map((ref) => [ref.nodeId, ref.referencingNodes])
        );

        // Integrate references into nodes
        const nodesWithReferences = nodesWithFrames.map((node) => ({
            ...node,
            referencedIn: referencesByNodeId.get(node._id) || [],
        }));

        return {
            page: nodesWithReferences,
            isDone,
            continueCursor,
        };
    },
});

export type CreateNodeArgs = Infer<typeof createArgs>;

export type UpdateNodeArgs = Infer<typeof updateArgs>;

export type RemoveNodeArgs = Infer<typeof removeArgs>;

export type GetNodeArgs = Infer<typeof getArgs>;

export type ListNodeByFrameArgs = Infer<typeof listByFrameArgs>;

export type ConnectNodesArgs = Infer<typeof connectNodesArgs>;

export type DisconnectNodesArgs = Infer<typeof disconnectNodesArgs>;

const findDuplicateNodesArgs = v.object({
    visionId: v.id("visions"),
    value: v.string(),
    variant: v.string(),
    excludeNodeId: v.optional(v.id("nodes")),
});

export const findDuplicateNodes = query({
    args: findDuplicateNodesArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.visionId);

        let query = ctx.db
            .query("nodes")
            .withIndex("by_vision", (q) => q.eq("vision", args.visionId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("value"), args.value),
                    q.eq(q.field("variant"), args.variant)
                )
            );

        const duplicateNodes = await query.collect();

        const filteredNodes = args.excludeNodeId
            ? duplicateNodes.filter(node => node._id !== args.excludeNodeId)
            : duplicateNodes;

        const nodesWithChannelInfo = await Promise.all(
            filteredNodes.map(async (node) => {
                const channel = await ctx.db.get(node.channel);
                const user = await ctx.db.get(node.userId);
                return {
                    ...node,
                    channelTitle: channel?.title || "Unknown Channel",
                    channelId: channel?._id,
                    userName: user?.name || "Unknown User",
                    userProfileImage: user?.picture || null,
                };
            })
        );

        return nodesWithChannelInfo.sort((a, b) =>
            new Date(a._creationTime).getTime() - new Date(b._creationTime).getTime()
        );
    },
});

export type FindDuplicateNodesArgs = Infer<typeof findDuplicateNodesArgs>;

const addToFrameArgs = v.object({
    nodeId: v.id("nodes"),
    frameId: v.id("frames"),
    position: v.object({
        x: v.number(),
        y: v.number(),
    }),
});

export const addToFrame = mutation({
    args: addToFrameArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }

        const node = await ctx.db.get(args.nodeId);
        if (!node) {
            throw new Error("Node not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const existingFramedNode = await ctx.db
            .query("framed_node")
            .withIndex("by_frame", (q) => q.eq("frameId", args.frameId))
            .filter((q) => q.eq(q.field("node.data"), args.nodeId))
            .first();

        if (existingFramedNode) {
            throw new Error("Node is already in this frame");
        }

        const reactFlowNode = {
            id: crypto.randomUUID(),
            position: args.position,
            type: node.variant || "Text",
            data: args.nodeId,
        };

        await ctx.db.insert("framed_node", {
            frameId: args.frameId,
            node: reactFlowNode,
        });

        await ctx.db.insert("frame_positions", {
            frameId: args.frameId,
            nodeId: args.nodeId,
            batch: [reactFlowNode],
            batchTimestamp: Date.now(),
        });

        await ctx.db.patch(args.nodeId, {
            frame: args.frameId,
        });

        return reactFlowNode.id;
    },
});

export type AddToFrameArgs = Infer<typeof addToFrameArgs>;

export const createTextNodeFromMessage = mutation({
    args: createTextNodeFromMessageArgs,
    handler: async (ctx, args) => {
        // Get the message to access its streamId
        const message = await ctx.db.get(args.messageId);
        if (!message) {
            throw new Error(`Message with ID ${args.messageId} not found`);
        }

        if (!message.streamId) {
            throw new Error(`Message ${args.messageId} has no stream ID`);
        }

        // Get the AI response text from the stream
        const streamBody = await persistentTextStreaming.getStreamBody(
            ctx,
            message.streamId as any
        );

        if (!streamBody?.text) {
            throw new Error("No AI response text found in stream");
        }

        // Get the chat to find the linked AI node
        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            throw new Error(`Chat with ID ${args.chatId} not found`);
        }
        if (!chat.nodeId) {
            throw new Error(`Chat ${args.chatId} is not linked to any node. Chat data: ${JSON.stringify(chat)}`);
        }

        // Get the AI node to find its frame and position
        const aiNode = await ctx.db.get(chat.nodeId);
        if (!aiNode) {
            throw new Error(`AI node with ID ${chat.nodeId} not found`);
        }

        // Check if the AI node is placed on any frame (check framed_node table)
        const framedAiNode = await ctx.db
            .query("framed_node")
            .filter((q) => q.eq(q.field("node.data"), aiNode._id))
            .first();

        if (!framedAiNode) {
            throw new Error(`This AI chat is not connected to an AI node on any frame. To create text nodes, you need to first add the AI node to a frame. You can do this by opening the chat from an AI node that's already placed on a frame, or by adding the AI node to a frame first.`);
        }

        // Use the frame from the framed_node table
        const frameId = framedAiNode.frameId as Id<"frames">;

        // Check vision access
        if (aiNode.vision) {
            await requireVisionAccess(ctx, aiNode.vision);
        }

        const now = new Date().toISOString();
        const identity = await requireAuth(ctx);
        const userId = (await getUserByIdenityId(ctx, identity.userId as string))?._id;

        if (!userId) {
            throw new Error("Failed to get userId from identity");
        }

        // Create the text node with the AI response
        const textNodeId = await ctx.db.insert("nodes", {
            title: `Text from AI`,
            variant: "Text",
            value: streamBody.text,
            frame: frameId,
            channel: aiNode.channel,
            vision: aiNode.vision,
            userId,
            updatedAt: now,
        });

        // Calculate position for the new text node (150px below the AI node)
        const newPosition = {
            x: framedAiNode.node.position.x * 1.1,
            y: framedAiNode.node.position.y * 1.5,
        };

        const reactFlowNode = {
            id: crypto.randomUUID(),
            position: newPosition,
            type: "Text",
            data: textNodeId,
        };

        // Add the text node to the frame
        await ctx.db.insert("framed_node", {
            frameId: frameId,
            node: reactFlowNode,
        });

        await ctx.db.insert("frame_positions", {
            frameId: frameId,
            nodeId: textNodeId,
            batch: [reactFlowNode],
            batchTimestamp: Date.now(),
        });

        // Create an edge from AI node to text node
        const edgeId = `${framedAiNode.node.id}-${reactFlowNode.id}`;
        const edge = {
            id: edgeId,
            source: framedAiNode.node.id,
            target: reactFlowNode.id,
            sourceHandle: Position.Bottom,
            targetHandle: Position.Top,
            data: { name: undefined },
        };

        // Get the framed node IDs for the edge
        const sourceFramedNode = framedAiNode; // We already have this

        const targetFramedNode = await ctx.db
            .query("framed_node")
            .withIndex("by_frame", (q) => q.eq("frameId", frameId))
            .filter((q) => q.eq(q.field("node.data"), textNodeId))
            .unique();

        if (sourceFramedNode && targetFramedNode) {
            await ctx.db.insert("edges", {
                frameId: frameId,
                edge,
                source: sourceFramedNode._id,
                target: targetFramedNode._id,
            });
        }

        return {
            textNodeId,
            nodePosition: newPosition,
            frameId: frameId,
        };
    },
});

const checkChatNodeOnFrameArgs = v.object({
    chatId: v.id("chats"),
});

export const checkChatNodeOnFrame = query({
    args: checkChatNodeOnFrameArgs,
    handler: async (ctx, args) => {
        const chat = await ctx.db.get(args.chatId);
        if (!chat || !chat.nodeId) {
            return false;
        }

        const framedAiNode = await ctx.db
            .query("framed_node")
            .filter((q) => q.eq(q.field("node.data"), chat.nodeId))
            .first();

        return !!framedAiNode;
    },
});

export type CreateTextNodeFromMessageArgs = Infer<typeof createTextNodeFromMessageArgs>;
