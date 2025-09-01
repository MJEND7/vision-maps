import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Visions } from "./visions";
import { Channel } from "./channel";
import { Frame } from "./frame";

export enum NodeVariants {
    Image = "Image",
    Video = "Video",
    Link = "Link",
    Audio = "Audio",
    Text = "Text",
    YouTube = "YouTube",
    Spotify = "Spotify",
    Notion = "Notion",
    Figma = "Figma",
    GitHub = "GitHub",
    AI = "AI", // For the AI class value will be the datapoint storing the model used
}

export class Nodes {
    static TABLE_NAME = "nodes"
    static Table = defineTable({
        title: v.string(),
        variant: v.string(),
        value: v.string(),
        userId: v.id("users"),
        threads: v.array(v.id(Nodes.TABLE_NAME)), // Connected nodes
        thought: v.optional(v.string()),
        y: v.number(),
        x: v.number(),
        height: v.number(), // PX's
        width: v.number(), // PX's
        weight: v.number(), // Way of allowing the user to ORDER there importance
        updatedAt: v.string(),
        createdAt: v.string(),
        frame: v.optional(v.id(Frame.TABLE_NAME)),
        channel: v.id(Channel.TABLE_NAME),
        vision: v.id(Visions.TABLE_NAME)
    }).index("by_userId", ["userId"]).index("by_frame", ["frame"])
        .index("by_channel", ["channel"])
        .index("by_vision", ["vision"]);
}
