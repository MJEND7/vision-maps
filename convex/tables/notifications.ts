import { defineTable } from "convex/server";
import { v } from "convex/values";
import { User } from "./user";
import { Visions } from "./visions";
import { Comments } from "./comments";

export enum NotificationType {
    DEFAULT = "default",
    MENTION = "mention", 
    COMMENT_REPLY = "comment_reply",
    INVITE = "invite",
    // Add more types as needed
}

export class Notifications {
    static TABLE_NAME = "notifications" as "notifications"
    static Table = defineTable({
        // Who receives this notification
        recipientId: v.string(), // Using string to match existing pattern
        // Who triggered this notification
        senderId: v.string(), // Using string to match existing pattern
        // Notification type and content
        type: v.string(), // NotificationType enum values
        title: v.string(),
        message: v.string(),
        // Related entities
        visionId: v.optional(v.id(Visions.TABLE_NAME)),
        commentId: v.optional(v.id("comments")),
        // Invite-specific data
        inviteStatus: v.optional(v.string()), // "pending", "accepted", "rejected"
        inviteData: v.optional(v.object({
            visionId: v.id(Visions.TABLE_NAME),
            role: v.string() // "owner" or "editor"
        })),
        // Notification state
        isRead: v.boolean(),
        isDeleted: v.optional(v.boolean()),
        // Timestamps
        createdAt: v.string(),
        readAt: v.optional(v.string())
    })
    .index("by_recipient", ["recipientId"])
    .index("by_recipient_unread", ["recipientId", "isRead"])
    .index("by_recipient_created", ["recipientId", "createdAt"])
    .index("by_vision", ["visionId"])
    .index("by_sender", ["senderId"]);
}