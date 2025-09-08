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
        channelId: v.optional(v.id(Channel.TABLE_NAME))
    }).index("by_userId", ["userId"])
      .index("by_visionId", ["visionId"])
      .index("by_channelId", ["channelId"]);
}
