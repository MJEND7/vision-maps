import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireAuth, requireVisionAccess } from "./utils/auth";
import { Vision, VisionAccessRole, VisionUserStatus } from "./tables/visions";
import { createDefaultChannel } from "./utils/channel";

// Args schemas
const createArgs = v.object({
  organization: v.optional(v.string()),
});

const updateArgs = v.object({
  id: v.id("visions"),
  title: v.optional(v.string()),
  banner: v.optional(v.string()),
  description: v.optional(v.string()),
  organization: v.optional(v.string()),
});

const removeArgs = v.object({
  id: v.id("visions"),
});

const getArgs = v.object({
  id: v.id("visions"),
});

const listArgs = v.object({
  organization: v.optional(v.string()),
  search: v.optional(v.string()),
  sortBy: v.optional(v.union(v.literal("updatedAt"), v.literal("createdAt"), v.literal("title"))),
  sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  limit: v.optional(v.number()),
  cursor: v.optional(v.string()),
});

const getMembersArgs = v.object({
  visionId: v.id("visions"),
});

const addMemberArgs = v.object({
  visionId: v.id("visions"),
  userId: v.string(),
  role: v.string(),
});

const removeMemberArgs = v.object({
  visionId: v.id("visions"),
  userId: v.string(),
});

const updateMemberRoleArgs = v.object({
  visionId: v.id("visions"),
  userId: v.string(),
  newRole: v.string(),
});

const requestToJoinArgs = v.object({
  visionId: v.id("visions"),
});

const approveJoinRequestArgs = v.object({
  visionId: v.id("visions"),
  userId: v.string(),
});

const rejectJoinRequestArgs = v.object({
  visionId: v.id("visions"),
  userId: v.string(),
});

const getPendingRequestsArgs = v.object({
  visionId: v.id("visions"),
});

export const create = mutation({
  args: createArgs,
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
      status: VisionUserStatus.Approved,
      visionId,
    });

    await createDefaultChannel(ctx, visionId);

    return visionId;
  },
});

export const update = mutation({
  args: updateArgs,
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.id, VisionAccessRole.Editor);

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.banner !== undefined) updates.banner = args.banner;
    if (args.description !== undefined) updates.description = args.description;
    if (args.organization !== undefined) updates.organization = args.organization;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: removeArgs,
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
  args: getArgs,
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
  args: listArgs,
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

export const getMembers = query({
  args: getMembersArgs,
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId);

    const visionUsers = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .filter((q) => q.eq(q.field("status"), VisionUserStatus.Approved))
      .collect();

    const members = [];
    for (const visionUser of visionUsers) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_external_id", (q) => q.eq("externalId", visionUser.userId))
        .first();

      if (user) {
        members.push({
          id: user._id,
          userId: visionUser.userId,
          name: user.name,
          email: user.email,
          picture: user.picture,
          role: visionUser.role,
        });
      }
    }

    return members;
  },
});

export const addMember = mutation({
  args: addMemberArgs,
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId, VisionAccessRole.Owner);

    const existingMember = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingMember) {
      throw new Error("User is already a member of this vision");
    }

    if (args.role !== VisionAccessRole.Owner && args.role !== VisionAccessRole.Editor) {
      throw new Error("Invalid role");
    }

    await ctx.db.insert("vision_users", {
      userId: args.userId,
      role: args.role,
      status: VisionUserStatus.Approved,
      visionId: args.visionId,
    });
  },
});

export const removeMember = mutation({
  args: removeMemberArgs,
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId, VisionAccessRole.Owner);

    const visionUser = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!visionUser) {
      throw new Error("User is not a member of this vision");
    }

    const remainingOwners = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .filter((q) => q.eq(q.field("role"), VisionAccessRole.Owner))
      .collect();

    if (visionUser.role === VisionAccessRole.Owner && remainingOwners.length === 1) {
      throw new Error("Cannot remove the last owner of a vision");
    }

    await ctx.db.delete(visionUser._id);
  },
});

export const updateMemberRole = mutation({
  args: updateMemberRoleArgs,
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId, VisionAccessRole.Owner);

    if (args.newRole !== VisionAccessRole.Owner && args.newRole !== VisionAccessRole.Editor) {
      throw new Error("Invalid role");
    }

    const visionUser = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!visionUser) {
      throw new Error("User is not a member of this vision");
    }

    if (visionUser.role === VisionAccessRole.Owner && args.newRole === VisionAccessRole.Editor) {
      throw new Error("Cannot demote owners to editors");
    }

    await ctx.db.patch(visionUser._id, {
      role: args.newRole,
    });
  },
});

export const requestToJoin = mutation({
  args: requestToJoinArgs,
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    
    if (!identity.userId) {
      throw new Error("Failed to get userId");
    }

    // Check if user is already a member or has pending request
    const existingRequest = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .filter((q) => q.eq(q.field("userId"), identity.userId!.toString()))
      .first();

    if (existingRequest) {
      if (existingRequest.status === VisionUserStatus.Approved) {
        throw new Error("You are already a member of this vision");
      } else {
        throw new Error("You already have a pending request for this vision");
      }
    }

    // Create pending request
    await ctx.db.insert("vision_users", {
      userId: identity.userId.toString(),
      role: VisionAccessRole.Editor, // Default role for requests
      status: VisionUserStatus.Pending,
      visionId: args.visionId,
    });

    // Send notification to vision owners
    const visionOwners = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .filter((q) => 
        q.and(
          q.eq(q.field("role"), VisionAccessRole.Owner),
          q.eq(q.field("status"), VisionUserStatus.Approved)
        )
      )
      .collect();

    const vision = await ctx.db.get(args.visionId);
    const requestingUser = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.userId!.toString()))
      .first();

    // Create notifications for each owner
    for (const owner of visionOwners) {
      await ctx.db.insert("notifications", {
        recipientId: owner.userId,
        senderId: identity.userId!.toString(),
        type: "join_request",
        title: "Join Request",
        message: `${requestingUser?.name || 'Someone'} wants to join "${vision?.title || 'your vision'}"`,
        visionId: args.visionId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return true;
  },
});

export const approveJoinRequest = mutation({
  args: approveJoinRequestArgs,
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId, VisionAccessRole.Owner);

    const pendingRequest = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("status"), VisionUserStatus.Pending)
        )
      )
      .first();

    if (!pendingRequest) {
      throw new Error("No pending request found for this user");
    }

    await ctx.db.patch(pendingRequest._id, {
      status: VisionUserStatus.Approved,
    });

    // Send notification to the user that their request was approved
    const vision = await ctx.db.get(args.visionId);
    const identity = await requireAuth(ctx);
    const approver = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.userId!.toString()))
      .first();

    await ctx.db.insert("notifications", {
      recipientId: args.userId,
      senderId: identity.userId!.toString(),
      type: "request_approved",
      title: "Request Approved",
      message: `${approver?.name || 'Someone'} approved your request to join "${vision?.title || 'the vision'}"`,
      visionId: args.visionId,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return true;
  },
});

export const rejectJoinRequest = mutation({
  args: rejectJoinRequestArgs,
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId, VisionAccessRole.Owner);

    const pendingRequest = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("status"), VisionUserStatus.Pending)
        )
      )
      .first();

    if (!pendingRequest) {
      throw new Error("No pending request found for this user");
    }

    await ctx.db.delete(pendingRequest._id);

    // Send notification to the user that their request was rejected
    const vision = await ctx.db.get(args.visionId);
    const identity = await requireAuth(ctx);
    const rejector = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.userId!.toString()))
      .first();

    await ctx.db.insert("notifications", {
      recipientId: args.userId,
      senderId: identity.userId!.toString(),
      type: "request_rejected",
      title: "Request Rejected",
      message: `${rejector?.name || 'Someone'} rejected your request to join "${vision?.title || 'the vision'}"`,
      visionId: args.visionId,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return true;
  },
});

export const getPendingRequests = query({
  args: getPendingRequestsArgs,
  handler: async (ctx, args) => {
    await requireVisionAccess(ctx, args.visionId, VisionAccessRole.Owner);

    const pendingRequests = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
      .filter((q) => q.eq(q.field("status"), VisionUserStatus.Pending))
      .collect();

    const requestsWithUserInfo = [];
    for (const request of pendingRequests) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_external_id", (q) => q.eq("externalId", request.userId))
        .first();

      if (user) {
        requestsWithUserInfo.push({
          id: request._id,
          userId: request.userId,
          name: user.name,
          email: user.email,
          picture: user.picture,
          role: request.role,
          createdAt: request._creationTime,
        });
      }
    }

    return requestsWithUserInfo;
  },
});

// TypeScript types
export type CreateVisionArgs = Infer<typeof createArgs>;
export type UpdateVisionArgs = Infer<typeof updateArgs>;
export type RemoveVisionArgs = Infer<typeof removeArgs>;
export type GetVisionArgs = Infer<typeof getArgs>;
export type ListVisionsArgs = Infer<typeof listArgs>;
export type GetVisionMembersArgs = Infer<typeof getMembersArgs>;
export type AddVisionMemberArgs = Infer<typeof addMemberArgs>;
export type RemoveVisionMemberArgs = Infer<typeof removeMemberArgs>;
export type UpdateVisionMemberRoleArgs = Infer<typeof updateMemberRoleArgs>;
export type RequestToJoinArgs = Infer<typeof requestToJoinArgs>;
export type ApproveJoinRequestArgs = Infer<typeof approveJoinRequestArgs>;
export type RejectJoinRequestArgs = Infer<typeof rejectJoinRequestArgs>;
export type GetPendingRequestsArgs = Infer<typeof getPendingRequestsArgs>;
