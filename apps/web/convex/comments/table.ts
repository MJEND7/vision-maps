import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Visions } from "../visions/table";
import { Channel } from "../channels/table";
import { Nodes } from "../nodes/table";
import { User } from "../users/table";

export class Comments {
    static TABLE_NAME = "comments" as "comments"
    static Table = defineTable({
        content: v.string(),
        authorId: v.string(), // Using string to match existing pattern
        // Target relationships - comments can be on nodes, channels, or visions
        nodeId: v.optional(v.id(Nodes.TABLE_NAME)),
        channelId: v.id(Channel.TABLE_NAME), // Required - comments are always in a channel
        visionId: v.id(Visions.TABLE_NAME), // Always required for permission checking
        // Thread support for replies
        parentCommentId: v.optional(v.id("comments")),
        // Mentions - array of user IDs mentioned in this comment
        mentions: v.array(v.string()),
        // Timestamps
        createdAt: v.string(),
        updatedAt: v.string(),
        // Soft delete support
        isDeleted: v.optional(v.boolean())
    })
    .index("by_vision", ["visionId"])
    .index("by_node", ["nodeId"])
    .index("by_channel", ["channelId"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentCommentId"])
    .index("by_vision_created", ["visionId", "createdAt"])
    .index("by_channel_created", ["channelId", "createdAt"]);
}