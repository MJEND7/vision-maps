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
}

export class Nodes {
    static TABLE_NAME = "nodes"
    static Table = defineTable({
        title: v.string(),
        variant: v.string(),
        value: v.string(),
        threads: v.array(v.id(Nodes.TABLE_NAME)), // Connected nodes
        y: v.number(),
        x: v.number(),
        updatedAt: v.string(),
        createdAt: v.string(),
        frame: v.optional(v.id(Frame.TABLE_NAME)),
        channel: v.optional(v.id(Channel.TABLE_NAME)),
        vision: v.optional(v.id(Visions.TABLE_NAME))
    });
}
