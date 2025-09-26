import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Nodes } from "./nodes";
import { Visions } from "./visions";
import { Channel } from "./channel";

// Chat wrapper for messages
export class Chats {
    static TABLE_NAME = "chats" as "chats"
    static Table = defineTable({
        title: v.string(),
        userId: v.string(),
        nodeId: v.optional(v.id(Nodes.TABLE_NAME)),
        visionId: v.id(Visions.TABLE_NAME),
        channelId: v.optional(v.id(Channel.TABLE_NAME)),
        // Comment chat support - indicates this chat is for node comments
        isCommentChat: v.optional(v.boolean()),
        // Store the initial comment ID that started this chat
        rootCommentId: v.optional(v.id("comments"))
    }).index("by_userId", ["userId"])
      .index("by_visionId", ["visionId"])
      .index("by_channelId", ["channelId"])
      .index("by_nodeId", ["nodeId"])
      .index("by_rootComment", ["rootCommentId"]);
}
