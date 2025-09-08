import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireVisionAccess } from "./utils/auth";
import { nodeChangeValidator } from "./reactflow/types";
import { applyNodeChanges } from "@xyflow/react";
import type { Id } from "./_generated/dataModel";

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

export const getNodes = query({
    args: { frameId: v.id("frames") },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Invalid frame");
        }

        if (!requireVisionAccess(ctx, frame.vision)) {
            throw new Error("Unauthorized");
        }

        const all = await ctx.db
            .query("nodes")
            .withIndex("by_frame", (q) => q.eq("frame", args.frameId))
            .collect();
    
        const nodes = all.map((a) => a.core).filter((a) => a !== undefined)
        return nodes;
    },
});

export const updateNodes = mutation({
    args: {
        frameId: v.id("frames"),
        changes: v.array(nodeChangeValidator()),
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Invalid frame");
        }

        if (!requireVisionAccess(ctx, frame.vision)) {
            throw new Error("Unauthorized");
        }

        // Get the ids of the nodes that are being changed
        const ids = args.changes.flatMap((change) =>
            change.type === "add" || change.type === "replace"
                ? change.item ? [change.item.id] : []
                : [change.id],
        );
        // Only fetch the nodes that are being changed
        const nodes = (
            await Promise.all(
                ids.map(async (id) =>
                    ctx.db
                        .query("nodes")
                        .withIndex("id", (q) => q.eq("core.id", id))
                        .unique(),
                ),
            )
        ).flatMap((n) => (n ? [n] : []));
        const nodesById = new Map(nodes.map((n) => [n.core?.id, n]));

        // Filter out add/reset changes with undefined items
        const validChanges = args.changes.filter(change => {
            if (change.type === 'add' || change.type === 'replace') {
                return change.item !== undefined;
            }
            return true;
        });

        const updatedNodes = applyNodeChanges(
            validChanges as any, // Type assertion needed due to custom validator
            nodes.map((node) => node.core)
                .filter((core): core is NonNullable<typeof core> => Boolean(core && core.id))
                .map(core => ({
                    ...core,
                    id: core.id!, // We know id exists due to filter
                    position: core.position || { x: 0, y: 0 }, // Ensure position is defined
                    width: core.width ?? undefined, // Convert null to undefined
                    height: core.height ?? undefined, // Convert null to undefined
                    data: {} // React Flow requires data property
                })),
        );
        const updatedIds = new Set(updatedNodes.map((n) => n.id));

        await Promise.all(
            updatedNodes.map(async (node) => {
                const existing = nodesById.get(node.id);
                if (existing) {
                    // Handle extent type before saving to database
                    const { extent, ...coreNode } = node;
                    const coreUpdate = {
                        ...coreNode,
                        data: node.data || {},
                        // Handle extent property type conversion
                        ...(extent && extent !== null && {
                            extent: extent === "parent" ? "parent" as const : extent as [[number, number], [number, number]]
                        })
                    };
                    await ctx.db.patch(existing._id, { core: coreUpdate });
                } else {
                    throw new Error("Failed to find an existing node")
                }
            }),
        );
        // Handle deletions
        await Promise.all(
            nodes.map(async (node) => {
                if (node.core && !updatedIds.has(node.core.id)) {
                    await ctx.db.delete(node._id);
                }
            }),
        );
    },
});

// Query for streaming live node positions (for real-time updates)
export const getLiveNodePositions = query({
    args: {
        frameId: v.id("frames"),
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }

        // Check if it's a frames document and has vision property
        if ('vision' in frame && frame.vision && !requireVisionAccess(ctx, frame.vision)) {
            throw new Error("Unauthorized");
        }

        // Get current node positions from database
        const nodes = await ctx.db
            .query("nodes")
            .withIndex("by_frame", (q) => q.eq("frame", args.frameId))
            .collect();

        // Return just the positions for live updates
        return nodes
            .filter(node => node.core && node.core.id)
            .map(node => ({
                nodeId: node.core!.id,
                position: node.core!.position || { x: 0, y: 0 }
            }));
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
