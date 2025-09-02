import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Nodes } from "./nodes";

// Chat wrapper for messages
export class Chats {
    static TABLE_NAME = "chats" as "chats"
    static Table = defineTable({
        title: v.string(),
        userId: v.string(),
        nodeId: v.optional(v.id(Nodes.TABLE_NAME))
    }).index("by_userId", ["userId"]);
}
