import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireVisionAccess } from "./utils/auth";
import { nodeValidator } from "./reactflow/types";
import { Nodes } from "./tables/nodes";

// Args schemas
const createArgs = v.object({
    channelId: v.id("channels"),
    title: v.string(),
});

const updateArgs = v.object({
    id: v.id("frames"),
    title: v.optional(v.string()),
});

const removeArgs = v.object({
    id: v.id("frames"),
});

const getArgs = v.object({
    id: v.id("frames"),
});

const listByChannelArgs = v.object({
    channelId: v.id("channels"),
});

const reorderArgs = v.object({
    channelId: v.id("channels"),
    frameIds: v.array(v.id("frames")),
});

const listByVisionArgs = v.object({
    visionId: v.id("visions"),
});

export const create = mutation({
    args: createArgs,
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel) {
            throw new Error("Channel not found");
        }

        if (channel.vision) {
            await requireVisionAccess(ctx, channel.vision);
        }

        const now = new Date().toISOString();

        // Get the next sort order for this channel
        const existingFrames = await ctx.db
            .query("frames")
            .withIndex("by_channel", (q) => q.eq("channel", args.channelId))
            .collect();

        const maxSortOrder = Math.max(0, ...existingFrames.map(f => f.sortOrder || 0));
        const newSortOrder = maxSortOrder + 1;

        const frameId = await ctx.db.insert("frames", {
            title: args.title,
            sortOrder: newSortOrder,
            channel: args.channelId,
            vision: channel.vision,
            createdAt: now,
            updatedAt: now,
        });

        return frameId;
    },
});

export const update = mutation({
    args: updateArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const updates: any = {
            updatedAt: new Date().toISOString(),
        };

        if (args.title !== undefined) updates.title = args.title;

        await ctx.db.patch(args.id, updates);
    },
});

export const remove = mutation({
    args: removeArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const nodes = await ctx.db
            .query("nodes")
            .withIndex("by_frame", (q) => q.eq("frame", args.id))
            .collect();

        for (const node of nodes) {
            await ctx.db.delete(node._id);
        }

        await ctx.db.delete(args.id);
    },
});

export const get = query({
    args: getArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        return frame;
    },
});

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

        const frames = await ctx.db
            .query("frames")
            .withIndex("by_channel", (q) => q.eq("channel", args.channelId))
            .collect();

        // Sort by sortOrder, fallback to creation time for legacy data
        frames.sort((a, b) => {
            const orderA = a.sortOrder ?? 0;
            const orderB = b.sortOrder ?? 0;
            return orderA - orderB;
        });

        return frames;
    },
});

export const reorder = mutation({
    args: reorderArgs,
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel) {
            throw new Error("Channel not found");
        }

        if (channel.vision) {
            await requireVisionAccess(ctx, channel.vision);
        }

        // Update sort order for each frame based on its position in the array
        for (let i = 0; i < args.frameIds.length; i++) {
            const frameId = args.frameIds[i];
            const frame = await ctx.db.get(frameId);

            if (!frame) {
                throw new Error(`Frame ${frameId} not found`);
            }

            if (frame.channel !== args.channelId) {
                throw new Error(`Frame ${frameId} does not belong to channel ${args.channelId}`);
            }

            await ctx.db.patch(frameId, {
                sortOrder: i + 1,
                updatedAt: new Date().toISOString(),
            });
        }
    },
});

export const listByVision = query({
    args: listByVisionArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.visionId);

        const frames = await ctx.db
            .query("frames")
            .withIndex("by_vision", (q) => q.eq("vision", args.visionId))
            .collect();

        // Sort by sortOrder, fallback to creation time for legacy data
        frames.sort((a, b) => {
            const orderA = a.sortOrder ?? 0;
            const orderB = b.sortOrder ?? 0;
            return orderA - orderB;
        });

        return frames;
    },
});

export const batchMovment = mutation({
    args: {
        frameId: v.id("frames"),
        batch: v.array(nodeValidator(v.id("nodes")))    ,
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Invalid frame");
        }

        if (!requireVisionAccess(ctx, frame.vision)) {
            throw new Error("Unauthorized");
        }

        // Create a shared timestamp for this batch
        const batchTimestamp = new Date().toISOString();
        let batchId: string | null = null;
        // Process each node in the batch
        for (const batchNode of args.batch) {
            // Update framed_node with the newest state
            const existingFramedNode = await ctx.db
                .query("framed_node")
                .withIndex("id", (q) => q.eq("node.id", batchNode.id))
                .first();

            if (existingFramedNode) {
                await ctx.db.patch(existingFramedNode._id, {
                    node: batchNode
                });
            }

            // Create or update frame_positions for this specific node
            const existingFramePosition = await ctx.db
                .query("frame_positions")
                .withIndex("by_node_frame", (q) => q.eq("nodeId", batchNode.data).eq("frameId", args.frameId))
                .first();

            if (existingFramePosition) {
                // Patch existing frame_positions with new batch
                batchId = existingFramePosition._id.toString();
                await ctx.db.patch(existingFramePosition._id, {
                    batch: args.batch,
                    batchTimestamp,
                });
            } else {
                // Create new frame_positions entry for this node
                batchId = await ctx.db.insert("frame_positions", {
                    frameId: args.frameId,
                    nodeId: batchNode.data,
                    batch: args.batch,
                    batchTimestamp,
                });
            }
        }

        return batchId
    },
});

export const listMovments = query({
    args: {
        frameId: v.id("frames")
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Invalid frame");
        }

        if (!requireVisionAccess(ctx, frame.vision)) {
            throw new Error("Unauthorized");
        }
        
        const framePositions = await ctx.db.query("frame_positions").withIndex("by_frame", (q) => q.eq("frameId", args.frameId)).collect()

        // Group by batchTimestamp to reconstruct original batches
        const batchMap = new Map<string, any>();
        
        framePositions.forEach(fp => {
            if (!batchMap.has(fp.batchTimestamp)) {
                batchMap.set(fp.batchTimestamp, {
                    _id: fp._id, // Use first entry's ID for compatibility
                    _creationTime: fp._creationTime,
                    frameId: fp.frameId,
                    batch: fp.batch,
                    batchTimestamp: fp.batchTimestamp,
                });
            }
        });

        // Return batches sorted by timestamp
        return Array.from(batchMap.values()).sort((a, b) => 
            new Date(a.batchTimestamp).getTime() - new Date(b.batchTimestamp).getTime()
        )
    }
}) 

const getFrameNodesArgs = v.object({
    frameId: v.id("frames"),
});

export const getFrameNodes = query({
    args: getFrameNodesArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const framedNodes = await ctx.db
            .query("framed_node")
            .withIndex("by_frame", (q) => q.eq("frameId", args.frameId))
            .collect();

        return framedNodes;
    },
});

// Type exports
export type CreateFrameArgs = Infer<typeof createArgs>;
export type UpdateFrameArgs = Infer<typeof updateArgs>;
export type RemoveFrameArgs = Infer<typeof removeArgs>;
export type GetFrameArgs = Infer<typeof getArgs>;
export type ListFramesByChannelArgs = Infer<typeof listByChannelArgs>;
export type ReorderFramesArgs = Infer<typeof reorderArgs>;
export type ListFramesByVisionArgs = Infer<typeof listByVisionArgs>;
export type GetFrameNodesArgs = Infer<typeof getFrameNodesArgs>;
