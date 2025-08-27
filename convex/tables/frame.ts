import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Visions } from "./visions";
import { Channel } from "./channel";

// A frame is a place where you can group nodes and we automaticly 
// order them for the best view experience.
export class Frame {
    static TABLE_NAME = "frames"
    static Table = defineTable({
        title: v.string(),
        updatedAt: v.string(),
        createdAt: v.string(),
        channel: v.optional(v.id(Channel.TABLE_NAME)),
        vision: v.optional(v.id(Visions.TABLE_NAME))
    }).index("by_channel", ["channel"])
      .index("by_vision", ["vision"]);
}
