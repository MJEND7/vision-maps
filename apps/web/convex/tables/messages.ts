import { defineTable } from "convex/server";
import { v } from "convex/values";

export class Messages {
    static TABLE_NAME = "messages" as "messages"
    static Table = defineTable({
        chatId: v.id("chats"),
        content: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
        userId: v.string(),
        streamId: v.string(),
        // Reply threading support
        replyToMessageId: v.optional(v.id("messages")),
    }).index("by_chatId", ["chatId"])
    .index("by_userId", ["userId"])
    .index("by_replyTo", ["replyToMessageId"]);
}

