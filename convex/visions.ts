import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireVisionAccess } from "./utils/auth";
import { Vision, VisionAccessRole } from "./tables/visions";
import { createDefaultChannel } from "./utils/channel";

export const create = mutation({
  args: {
    organization: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const now = Date.now();

    if (!identity.userId) {
        throw new Error("Failed to get userId")
    }

    const visionId = await ctx.db.insert("visions", {
      title: "Untitled",
      banner: "",
      description: "",
      organization: args.organization || "",
      updatedAt: now,
    });

    await ctx.db.insert("vision_users", {
      userId: identity.userId.toString(),
      role: VisionAccessRole.Owner,
      visionId,
    });

    await createDefaultChannel(ctx, visionId);

    return visionId;
  },
});

export const update = mutation({
  args: {
    id: v.id("visions"),
    title: v.optional(v.string()),
    banner: v.optional(v.string()),
    description: v.optional(v.string()),
    organization: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.id, VisionAccessRole.Editor);

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.banner !== undefined) updates.banner = args.banner;
    if (args.description !== undefined) updates.description = args.description;
    if (args.organization !== undefined) updates.organization = args.organization;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.id("visions"),
  },
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.id, VisionAccessRole.Owner);

    const visionUsers = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.id))
      .collect();

    for (const visionUser of visionUsers) {
      await ctx.db.delete(visionUser._id);
    }

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_vision", (q) => q.eq("vision", args.id))
      .collect();

    for (const channel of channels) {
      const frames = await ctx.db
        .query("frames")
        .withIndex("by_channel", (q) => q.eq("channel", channel._id))
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

      await ctx.db.delete(channel._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const get = query({
  args: {
    id: v.id("visions"),
  },
  handler: async (ctx, args): Promise<Vision> => {
    await requireVisionAccess(ctx, args.id);
    
    const vision = await ctx.db.get(args.id);
    if (!vision) {
      throw new Error("Vision not found");
    }

    return vision;
  },
});

export const list = query({
  args: {
    organization: v.optional(v.string()),
    search: v.optional(v.string()),
    sortBy: v.optional(v.union(v.literal("updatedAt"), v.literal("createdAt"), v.literal("title"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const limit = args.limit ?? 20;
    const sortBy = args.sortBy ?? "updatedAt";
    const sortOrder = args.sortOrder ?? "desc";

    const userVisions = await ctx.db
      .query("vision_users")
      .withIndex("by_userId", (q) => q.eq("userId", identity.userId?.toString() || ""))
      .collect();

    const visionIds = userVisions.map((uv) => uv.visionId);

    if (visionIds.length === 0) {
      return {
        visions: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    let query = ctx.db.query("visions");
    let visions = await query.collect();

    visions = visions.filter((vision) => visionIds.includes(vision._id));

    if (args.organization) {
      visions = visions.filter((vision) => vision.organization === args.organization);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      visions = visions.filter(
        (vision) =>
          vision.title.toLowerCase().includes(searchLower) ||
          (vision.description && vision.description.toLowerCase().includes(searchLower))
      );
    }

    visions.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "createdAt":
          aValue = new Date(a._creationTime);
          bValue = new Date(b._creationTime);
          break;
        case "updatedAt":
        default:
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = visions.findIndex((v) => v._id === args.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedVisions = visions.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < visions.length;
    const nextCursor = hasMore ? paginatedVisions[paginatedVisions.length - 1]._id : null;

    return {
      visions: paginatedVisions,
      nextCursor,
      hasMore,
    };
  },
});
