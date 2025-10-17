import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getUserByIdenityId, requireAuth, requireVisionAccess } from "./utils/auth";
import { paginationOptsValidator } from "convex/server";
import { nodeValidator } from "./reactflow/types";

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
    messageText: v.string(),
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
            nodesQuery = ctx.db
                .query("nodes")
                .withSearchIndex("search_thought", (q) =>
                    q
                        .search("thought", args.filters?.search || "")
                        .eq("channel", args.channelId)
                )
        } else {
            nodesQuery = ctx.db
                .query("nodes")
                .withIndex("by_channel", (q) => q.eq("channel", args.channelId)).order(sortBy === "latest" ? "asc" : "desc");
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

        return {
            page: nodesWithFrames,
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

        // Create the text node
        const textNodeId = await ctx.db.insert("nodes", {
            title: `Text from AI`,
            variant: "Text",
            value: args.messageText,
            frame: frameId,
            channel: aiNode.channel,
            vision: aiNode.vision,
            userId,
            updatedAt: now,
        });

        // Calculate position for the new text node (150px below the AI node)
        const newPosition = {
            x: framedAiNode.node.position.x,
            y: framedAiNode.node.position.y + 150,
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
            sourceHandle: null,
            targetHandle: null,
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
