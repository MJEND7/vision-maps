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
    Instagram = "Instagram",
    TikTok = "TicTok",
    AI = "AI",
    Loom = "Loom",
    Excalidraw = "Excalidraw",
    Transcription = "Transcription",
}

export class Nodes {
    static TABLE_NAME = "nodes" as const;

    static columns = v.object({
        title: v.string(),
        variant: v.string(),
        value: v.string(),
        userId: v.id("users"),
        thought: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
        frame: v.optional(v.id(Frame.TABLE_NAME)),
        channel: v.id(Channel.TABLE_NAME),
        vision: v.id(Visions.TABLE_NAME),
        audioUrl: v.optional(v.string()), // URL to the recorded audio file
    })

    static Table = defineTable(this.columns)
        .index("by_userId", ["userId"])
        .index("by_frame", ["frame"])
        .index("by_channel", ["channel"])
        .index("by_vision", ["vision"])
        .searchIndex("search_thought", {
            searchField: "thought",
            filterFields: ["channel", "variant", "userId", "vision"],
        });
}
