import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Visions } from "./visions";

// Group of frames around a given context
export class Channel {
    static TABLE_NAME = "channels" as "channels"
    static Table = defineTable({
        title: v.string(),
        description: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        updatedAt: v.string(),
        createdAt: v.string(),
        vision: v.id(Visions.TABLE_NAME)
    }).index("by_vision", ["vision"]);
}
