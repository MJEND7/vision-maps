import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Visions } from "./visions";

export class Channel {
    static TABLE_NAME = "channels"
    static Table = defineTable({
        title: v.string(),
        description: v.optional(v.string()),
        updatedAt: v.string(),
        createdAt: v.string(),
        vision: v.optional(v.id(Visions.TABLE_NAME))
    });
}
