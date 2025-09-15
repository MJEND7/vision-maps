import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireVisionAccess } from "./utils/auth";
import { Doc, Id } from "./_generated/dataModel";

// Args schemas
const createArgs = v.object({
  visionId: v.id("visions"),
  title: v.string(),
  description: v.optional(v.string()),
});

const updateArgs = v.object({
  id: v.id("channels"),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
});

const removeArgs = v.object({
  id: v.id("channels"),
});

const getArgs = v.object({
  id: v.id("channels"),
});

const reorderArgs = v.object({
  visionId: v.id("visions"),
  channelIds: v.array(v.id("channels")),
});

const listByVisionArgs = v.object({
  visionId: v.id("visions"),
});

const getVisionUsersArgs = v.object({
  visionId: v.id("visions"),
  search: v.optional(v.string()),
});

const getUserArgs = v.object({
  userId: v.id("users"),
});

export type Node = Doc<"nodes">;
export type NodeWithFrame = Node & {
  frameTitle: string | null;
};

export type ChannelWithNodesResponse = {
  channel: Doc<"channels">;
  nodes: NodeWithFrame[];
  isDone: boolean;
  continueCursor: string | null;
};

export const create = mutation({
  args: createArgs,
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

    return channelId;
  },
});

export const update = mutation({
  args: updateArgs,
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
  args: removeArgs,
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
  args: getArgs,
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
  args: reorderArgs,
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
  args: listByVisionArgs,
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

export const listWithFramesByVision = query({
  args: listByVisionArgs,
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId);

    // Get all channels for this vision
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_vision", (q) => q.eq("vision", args.visionId))
      .collect();

    // Sort channels by sortOrder
    channels.sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      return orderA - orderB;
    });

    // Get all frames for this vision in one query
    const allFrames = await ctx.db
      .query("frames")
      .withIndex("by_vision", (q) => q.eq("vision", args.visionId))
      .collect();

    // Sort frames by sortOrder
    allFrames.sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      return orderA - orderB;
    });

    // Group frames by channel
    const framesByChannel: Record<string, any[]> = {};
    for (const frame of allFrames) {
      const channelId = frame.channel;
      if (!framesByChannel[channelId]) {
        framesByChannel[channelId] = [];
      }
      framesByChannel[channelId].push(frame);
    }

    return {
      channels,
      framesByChannel
    };
  },
});

export const getVisionUsers = query({
  args: getVisionUsersArgs,
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId);

    // Get all vision users
    const visionUsers = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .collect();

    // Fetch user details for each vision user
    const usersWithDetails = await Promise.all(
      visionUsers.map(async (visionUser) => {
        try {
          // Handle both string and Id formats
          let userId: Id<"users">;
          if (typeof visionUser.userId === 'string') {
            // If it's a string, find the user by external ID or tokenIdentifier
            const userByIdentifier = await ctx.db
              .query("users")
              .filter((q) => q.eq(q.field("externalId"), visionUser.userId))
              .first();
            
            if (!userByIdentifier) {
              console.warn(`User not found for identifier: ${visionUser.userId}`);
              return null;
            }
            userId = userByIdentifier._id;
          } else {
            userId = visionUser.userId;
          }

          const user = await ctx.db.get(userId);
          if (!user || !('name' in user)) return null;
          
          return {
            _id: user._id,
            name: user.name,
            email: user.email || undefined,
            profileImage: user.picture || undefined,
            role: visionUser.role
          };
        } catch (error) {
          console.warn(`Error fetching user for ID ${visionUser.userId}:`, error);
          return null;
        }
      })
    );

    // Filter out null users and apply search filter
    let filteredUsers = usersWithDetails.filter((user): user is NonNullable<typeof user> => user !== null);

    if (args.search) {
      const searchTerm = args.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        (user.email && user.email.toLowerCase().includes(searchTerm))
      );
    }

    return filteredUsers;
  },
});

export const getUser = query({
  args: getUserArgs,
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !('name' in user)) {
      return null;
    }
    
    return {
      _id: user._id,
      name: user.name,
      email: user.email || undefined,
      profileImage: user.picture || undefined
    };
  },
});

// Type exports
export type CreateChannelArgs = Infer<typeof createArgs>;
export type UpdateChannelArgs = Infer<typeof updateArgs>;
export type RemoveChannelArgs = Infer<typeof removeArgs>;
export type GetChannelArgs = Infer<typeof getArgs>;
export type ReorderChannelsArgs = Infer<typeof reorderArgs>;
export type ListChannelsByVisionArgs = Infer<typeof listByVisionArgs>;
export type GetVisionUsersArgs = Infer<typeof getVisionUsersArgs>;
export type GetUserArgs = Infer<typeof getUserArgs>;
