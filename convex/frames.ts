import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireVisionAccess } from "./utils/auth";

export const create = mutation({
  args: {
    channelId: v.id("channels"),
    title: v.string(),
  },
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
  args: {
    id: v.id("frames"),
    title: v.optional(v.string()),
  },
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
  args: {
    id: v.id("frames"),
  },
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
  args: {
    id: v.id("frames"),
  },
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
  args: {
    channelId: v.id("channels"),
  },
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
  args: {
    channelId: v.id("channels"),
    frameIds: v.array(v.id("frames")),
  },
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
  args: {
    visionId: v.id("visions"),
  },
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
