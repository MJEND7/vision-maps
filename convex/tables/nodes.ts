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
    AppleMusic = "AppleMusic",
    Notion = "Notion",
    Figma = "Figma",
    GitHub = "GitHub",
    Twitter = "Twitter",
    AI = "AI",
    Loom = "Loom",
    Excalidraw = "Excalidraw",
}

export class Nodes {
    static TABLE_NAME = "nodes" as "nodes"
    static Table = defineTable({
        title: v.string(),
        variant: v.string(),
        value: v.string(),
        userId: v.id("users"),
        threads: v.array(v.id(Nodes.TABLE_NAME)), // Connected nodes
        thought: v.optional(v.string()),
        y: v.optional(v.number()),
        x: v.optional(v.number()),
        height: v.optional(v.number()), // PX's
        width: v.optional(v.number()), // PX's
        weight: v.optional(v.number()), // Way of allowing the user to ORDER there importance
        updatedAt: v.optional(v.string()),
        frame: v.optional(v.id(Frame.TABLE_NAME)),
        channel: v.id(Channel.TABLE_NAME),
        vision: v.id(Visions.TABLE_NAME)
    }).index("by_userId", ["userId"]).index("by_frame", ["frame"])
        .index("by_channel", ["channel"])
        .index("by_vision", ["vision"]);
}
