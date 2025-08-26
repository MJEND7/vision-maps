import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Visions } from "./visions";
import { Channel } from "./channel";

export class Frame {
    static TABLE_NAME = "frames"
    static Table = defineTable({
        title: v.string(),
        updatedAt: v.string(),
        createdAt: v.string(),
        channel: v.optional(v.id(Channel.TABLE_NAME)),
        vision: v.optional(v.id(Visions.TABLE_NAME))
    });
}
