import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Visions } from "./visions";

export class UserPasteBin {
    static TABLE_NAME = "user_paste_bin" as const;

    static columns = v.object({
        userId: v.id("users"),
        visionId: v.id(Visions.TABLE_NAME),

        // Mode
        mode: v.string(), // 'idle' | 'text' | 'ai' | 'media' | 'embed' | 'transcription'

        // Type using NodeVariants enum
        type: v.optional(v.string()), // NodeVariants type

        // Value - string for most types, array of objects for transcription
        value: v.optional(v.string()),
        valueArray: v.optional(v.array(v.object({
            text: v.string(),
            timestamp: v.number(),
        }))), // For transcription chunks with timestamps

        // Additional metadata (for text content alongside media/ai)
        textContent: v.optional(v.string()),

        // AI chat reference
        chatId: v.optional(v.id("chats")),

        // Timestamps
        updatedAt: v.number(),
        createdAt: v.number(),
    })

    static Table = defineTable(this.columns)
        .index("by_user_vision", ["userId", "visionId"]);
}