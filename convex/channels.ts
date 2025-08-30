import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireVisionAccess } from "./utils/auth";

export const create = mutation({
  args: {
    visionId: v.id("visions"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId);

    const now = new Date().toISOString();

    // Get the next sort order for this vision
    const existingChannels = await ctx.db
      .query("channels")
      .withIndex("by_vision", (q) => q.eq("vision", args.visionId))
      .collect();
    
    const maxSortOrder = Math.max(0, ...existingChannels.map(c => c.sortOrder || 0));
    const newSortOrder = maxSortOrder + 1;

    const channelId = await ctx.db.insert("channels", {
      title: args.title,
      description: args.description,
      sortOrder: newSortOrder,
      vision: args.visionId,
      createdAt: now,
      updatedAt: now,
    });

    //await createDefaultFrame(ctx, channelId, args.visionId);

    return channelId;
  },
});

export const update = mutation({
  args: {
    id: v.id("channels"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.id);
    if (!channel) {
      throw new Error("Channel not found");
    }

    if (channel.vision) {
      await requireVisionAccess(ctx, channel.vision);
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.id);
    if (!channel) {
      throw new Error("Channel not found");
    }

    if (channel.vision) {
      await requireVisionAccess(ctx, channel.vision);
    }

    const frames = await ctx.db
      .query("frames")
      .withIndex("by_channel", (q) => q.eq("channel", args.id))
      .collect();

    for (const frame of frames) {
      const nodes = await ctx.db
        .query("nodes")
        .withIndex("by_frame", (q) => q.eq("frame", frame._id))
        .collect();

      for (const node of nodes) {
        await ctx.db.delete(node._id);
      }

      await ctx.db.delete(frame._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const get = query({
  args: {
    id: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.id);
    if (!channel) {
      throw new Error("Channel not found");
    }

    if (channel.vision) {
      await requireVisionAccess(ctx, channel.vision);
    }

    return channel;
  },
});

export const reorder = mutation({
  args: {
    visionId: v.id("visions"),
    channelIds: v.array(v.id("channels")),
  },
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId);

    // Update sort order for each channel based on its position in the array
    for (let i = 0; i < args.channelIds.length; i++) {
      const channelId = args.channelIds[i];
      const channel = await ctx.db.get(channelId);
      
      if (!channel) {
        throw new Error(`Channel ${channelId} not found`);
      }
      
      if (channel.vision !== args.visionId) {
        throw new Error(`Channel ${channelId} does not belong to vision ${args.visionId}`);
      }

      await ctx.db.patch(channelId, {
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

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_vision", (q) => q.eq("vision", args.visionId))
      .collect();

    // Sort by sortOrder, fallback to creation time for legacy data
    channels.sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      return orderA - orderB;
    });

    return channels;
  },
});
