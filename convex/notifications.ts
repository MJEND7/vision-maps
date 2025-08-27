import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireVisionAccess } from "./utils/auth";
import { Id } from "./_generated/dataModel";

export const getUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
    onlyUnread: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    
    if (!identity.userId) {
      throw new Error("Failed to get userId");
    }

    let query = ctx.db
      .query("notifications")
      .withIndex("by_recipient_created", (q) => q.eq("recipientId", identity.userId!.toString()))
      .order("desc")
      .filter((q) => q.neq(q.field("isDeleted"), true));

    if (args.onlyUnread) {
      query = query.filter((q) => q.eq(q.field("isRead"), false));
    }

    const notifications = await query.take(args.limit || 50);

    // Populate sender information
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const sender = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("externalId"), notification.senderId))
          .first();
        const vision = notification.visionId ? await ctx.db.get(notification.visionId) : null;
        
        return {
          ...notification,
          sender: sender ? {
            _id: sender._id,
            name: sender.name,
            picture: sender.picture
          } : null,
          vision: vision ? {
            _id: vision._id,
            title: vision.title
          } : null
        };
      })
    );

    return enrichedNotifications;
  }
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    
    if (!identity.userId) {
      throw new Error("Failed to get userId");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_unread", (q) => 
        q.eq("recipientId", identity.userId!.toString()).eq("isRead", false)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    return unreadNotifications.length;
  }
});

export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications")
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    
    if (!identity.userId) {
      throw new Error("Failed to get userId");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (identity.userId!.toString() !== notification.recipientId) {
      throw new Error("You can only mark your own notifications as read");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: new Date().toISOString()
    });

    return args.notificationId;
  }
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    
    if (!identity.userId) {
      throw new Error("Failed to get userId");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_unread", (q) => 
        q.eq("recipientId", identity.userId!.toString()).eq("isRead", false)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const now = new Date().toISOString();
    const updates = unreadNotifications.map(notification => 
      ctx.db.patch(notification._id, {
        isRead: true,
        readAt: now
      })
    );

    await Promise.all(updates);

    return unreadNotifications.length;
  }
});

export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications")
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    
    if (!identity.userId) {
      throw new Error("Failed to get userId");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (identity.userId!.toString() !== notification.recipientId) {
      throw new Error("You can only delete your own notifications");
    }

    // Soft delete
    await ctx.db.patch(args.notificationId, {
      isDeleted: true
    });

    return args.notificationId;
  }
});

export const createNotification = mutation({
  args: {
    recipientId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    visionId: v.optional(v.id("visions")),
    commentId: v.optional(v.id("comments"))
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    
    if (!identity.userId) {
      throw new Error("Failed to get userId");
    }

    const notificationId = await ctx.db.insert("notifications", {
      recipientId: args.recipientId,
      senderId: identity.userId!.toString(),
      type: args.type,
      title: args.title,
      message: args.message,
      visionId: args.visionId,
      commentId: args.commentId,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return notificationId;
  }
});

export const acceptInvite = mutation({
  args: {
    notificationId: v.id("notifications")
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    
    if (!identity.userId) {
      throw new Error("Failed to get userId");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (identity.userId!.toString() !== notification.recipientId) {
      throw new Error("You can only accept your own invitations");
    }

    if (notification.type !== "invite" || !notification.inviteData) {
      throw new Error("This is not an invitation notification");
    }

    if (notification.inviteStatus !== "pending") {
      throw new Error("This invitation has already been processed");
    }

    // Add user to vision
    const existingVisionUser = await ctx.db
      .query("vision_users")
      .withIndex("by_visionId", (q) => q.eq("visionId", notification.inviteData!.visionId))
      .filter((q) => q.eq(q.field("userId"), identity.userId!.toString()))
      .first();

    if (existingVisionUser) {
      throw new Error("You are already a member of this vision");
    }

    await ctx.db.insert("vision_users", {
      userId: identity.userId!.toString(),
      role: notification.inviteData.role,
      visionId: notification.inviteData.visionId
    });

    // Update notification status
    await ctx.db.patch(args.notificationId, {
      inviteStatus: "accepted",
      isRead: true,
      readAt: new Date().toISOString()
    });

    return args.notificationId;
  }
});

export const rejectInvite = mutation({
  args: {
    notificationId: v.id("notifications")
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    
    if (!identity.userId) {
      throw new Error("Failed to get userId");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (identity.userId!.toString() !== notification.recipientId) {
      throw new Error("You can only reject your own invitations");
    }

    if (notification.type !== "invite" || !notification.inviteData) {
      throw new Error("This is not an invitation notification");
    }

    if (notification.inviteStatus !== "pending") {
      throw new Error("This invitation has already been processed");
    }

    // Update notification status
    await ctx.db.patch(args.notificationId, {
      inviteStatus: "rejected",
      isRead: true,
      readAt: new Date().toISOString()
    });

    return args.notificationId;
  }
});

export const createInviteNotification = mutation({
  args: {
    recipientId: v.string(),
    visionId: v.id("visions"),
    role: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    
    if (!identity.userId) {
      throw new Error("Failed to get userId");
    }

    // Verify the sender has permission to invite to this vision
    await requireVisionAccess(ctx, args.visionId);

    // Get vision info for the message
    const vision = await ctx.db.get(args.visionId);
    if (!vision) {
      throw new Error("Vision not found");
    }

    // Get sender info
    const sender = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("externalId"), identity.userId!.toString()))
      .first();

    const notificationId = await ctx.db.insert("notifications", {
      recipientId: args.recipientId,
      senderId: identity.userId!.toString(),
      type: "invite",
      title: "Vision Invitation",
      message: `${sender?.name || 'Someone'} invited you to join "${vision.title}" as ${args.role}`,
      visionId: args.visionId,
      inviteStatus: "pending",
      inviteData: {
        visionId: args.visionId,
        role: args.role
      },
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return notificationId;
  }
});