import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireVisionAccess } from "./utils/auth";
import { Id } from "./_generated/dataModel";

export const create = mutation({
    args: {
        frameId: v.id("frames"),
        title: v.string(),
        height: v.number(),
        thought: v.optional(v.string()),
        width: v.number(),
        weight: v.number(),
        variant: v.string(),
        value: v.string(),
        x: v.number(),
        y: v.number(),
        threads: v.optional(v.array(v.id("nodes"))),
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const now = new Date().toISOString();
        const identity = await requireAuth(ctx);

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
            channel: frame.channel,
            vision: frame.vision,
            userId: identity.userId as Id<"users">,
            createdAt: now,
            updatedAt: now,
        });

        return nodeId;
    },
});

export const update = mutation({
    args: {
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
    },
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
    args: {
        id: v.id("nodes"),
    },
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
    args: {
        id: v.id("nodes"),
    },
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
    args: {
        frameId: v.id("frames"),
    },
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
    args: {
        nodeId: v.id("nodes"),
        targetNodeId: v.id("nodes"),
    },
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
    args: {
        nodeId: v.id("nodes"),
        targetNodeId: v.id("nodes"),
    },
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
