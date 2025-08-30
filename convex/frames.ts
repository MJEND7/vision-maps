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

    const frameId = await ctx.db.insert("frames", {
      title: args.title,
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
      .order("desc")
      .collect();

    return frames;
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
      .order("desc")
      .collect();

    return frames;
  },
});
