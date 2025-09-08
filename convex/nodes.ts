import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getUserByIdenityId, requireAuth, requireVisionAccess } from "./utils/auth";
import { paginationOptsValidator } from "convex/server";

// Args schemas
const createArgs = v.object({
    frameId: v.optional(v.id("frames")),
    channel: v.id("channels"),
    title: v.string(),
    height: v.optional(v.number()),
    thought: v.optional(v.string()),
    width: v.optional(v.number()),
    weight: v.optional(v.number()),
    variant: v.string(),
    value: v.string(),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    threads: v.optional(v.array(v.id("nodes"))),
});

const updateArgs = v.object({
    id: v.id("nodes"),
    title: v.optional(v.string()),
    variant: v.optional(v.string()),
    height: v.number(),
    thought: v.optional(v.string()),
    width: v.number(),
    weight: v.number(),
    value: v.optional(v.string()),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
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

export const create = mutation({
    args: createArgs,
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channel);
        if (!channel) {
            throw new Error("Frame not found");
        }

        if (channel.vision) {
            await requireVisionAccess(ctx, channel.vision);
        }

        const now = new Date().toISOString();
        const identity = await requireAuth(ctx);

        const userId = (await getUserByIdenityId(ctx, identity.userId as string))?._id;

        if (!userId) {
            throw new Error("Failed to get userId from identity")
        }

        const nodeId = await ctx.db.insert("nodes", {
            title: args.title,
            variant: args.variant,
            value: args.value,
            thought: args.thought,
            threads: args.threads || [],
            height: args.height,
            width: args.width,
            weight: args.weight,
            x: args.x,
            y: args.y,
            frame: args.frameId,
            channel: channel._id,
            vision: channel.vision,
            userId,
            updatedAt: now,
        });

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
        if (args.height !== undefined) updates.height = args.height;
        if (args.width !== undefined) updates.width = args.width;
        if (args.weight !== undefined) updates.weight = args.weight;
        if (args.x !== undefined) updates.x = args.x;
        if (args.y !== undefined) updates.y = args.y;
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

        const allNodes = await ctx.db
            .query("nodes")
            .withIndex("by_frame", (q) => q.eq("frame", node.frame))
            .collect();

        for (const otherNode of allNodes) {
            if (otherNode.threads.includes(args.id)) {
                const updatedThreads = otherNode.threads.filter((threadId) => threadId !== args.id);
                await ctx.db.patch(otherNode._id, {
                    threads: updatedThreads,
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        await ctx.db.delete(args.id);
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

export const connectNodes = mutation({
    args: connectNodesArgs,
    handler: async (ctx, args) => {
        const node = await ctx.db.get(args.nodeId);
        const targetNode = await ctx.db.get(args.targetNodeId);

        if (!node || !targetNode) {
            throw new Error("Node not found");
        }

        if (node.vision) {
            await requireVisionAccess(ctx, node.vision);
        }
        if (targetNode.vision) {
            await requireVisionAccess(ctx, targetNode.vision);
        }

        if (!node.threads.includes(args.targetNodeId)) {
            await ctx.db.patch(args.nodeId, {
                threads: [...node.threads, args.targetNodeId],
                updatedAt: new Date().toISOString(),
            });
        }

        if (!targetNode.threads.includes(args.nodeId)) {
            await ctx.db.patch(args.targetNodeId, {
                threads: [...targetNode.threads, args.nodeId],
                updatedAt: new Date().toISOString(),
            });
        }
    },
});

export const disconnectNodes = mutation({
    args: disconnectNodesArgs,
    handler: async (ctx, args) => {
        const node = await ctx.db.get(args.nodeId);
        const targetNode = await ctx.db.get(args.targetNodeId);

        if (!node || !targetNode) {
            throw new Error("Node not found");
        }

        if (node.vision) {
            await requireVisionAccess(ctx, node.vision);
        }
        if (targetNode.vision) {
            await requireVisionAccess(ctx, targetNode.vision);
        }

        const updatedNodeThreads = node.threads.filter((id) => id !== args.targetNodeId);
        const updatedTargetThreads = targetNode.threads.filter((id) => id !== args.nodeId);

        await ctx.db.patch(args.nodeId, {
            threads: updatedNodeThreads,
            updatedAt: new Date().toISOString(),
        });

        await ctx.db.patch(args.targetNodeId, {
            threads: updatedTargetThreads,
            updatedAt: new Date().toISOString(),
        });
    },
});

const listByChannelArgs = v.object({
    channelId: v.id("channels"),
    paginationOpts: paginationOptsValidator,
    filters: v.optional(v.object({
        search: v.optional(v.string()),
        variant: v.optional(v.string()),
        userIds: v.optional(v.array(v.id("users"))),
        sortBy: v.optional(v.string()), // "latest" or "oldest"
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

        // If search is provided → use search index
        if (args.filters?.search) {
            nodesQuery = ctx.db
                .query("nodes")
                .withSearchIndex("search_thought", (q) =>
                    q
                        .search("thought", args.filters?.search || "")
                        .eq("channel", args.channelId)
                )
        } else {
            // Otherwise → use normal index
            nodesQuery = ctx.db
                .query("nodes")
                .withIndex("by_channel", (q) => q.eq("channel", args.channelId)).order(sortBy === "latest" ? "asc" : "desc");
        }

        // Apply variant filter
        if (args.filters?.variant) {
            nodesQuery = nodesQuery.filter((q) =>
                q.eq(q.field("variant"), args.filters!.variant)
            );
        }

        // Apply user filter
        if (args.filters?.userIds && args.filters.userIds.length > 0) {
            nodesQuery = nodesQuery.filter((q) =>
                q.or(
                    ...args.filters!.userIds!.map((id) => q.eq(q.field("userId"), id))
                )
            );
        }

        // Pagination
        const { page, isDone, continueCursor } = await nodesQuery.paginate(
            paginationOpts
        );

        // Fetch frame info
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

// Type exports
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

        // Filter out the excluded node if provided
        const filteredNodes = args.excludeNodeId 
            ? duplicateNodes.filter(node => node._id !== args.excludeNodeId)
            : duplicateNodes;

        // Get channel info and user info for each node
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

        // Sort by creation time (oldest first)
        return nodesWithChannelInfo.sort((a, b) => 
            new Date(a._creationTime).getTime() - new Date(b._creationTime).getTime()
        );
    },
});

export type FindDuplicateNodesArgs = Infer<typeof findDuplicateNodesArgs>;
