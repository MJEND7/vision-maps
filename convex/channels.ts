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

    const channelId = await ctx.db.insert("channels", {
      title: args.title,
      description: args.description,
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

export const listByVision = query({
  args: {
    visionId: v.id("visions"),
  },
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId);

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_vision", (q) => q.eq("vision", args.visionId))
      .order("desc")
      .collect();

    return channels;
  },
});
