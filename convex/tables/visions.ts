import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export enum VisionAccessRole {
    Owner = "owner", // Delete access
    Editor = "editor"// Everything else rn
}

export interface Vision {
    _id: Id<"visions">
    _creationTime: number,
    title: string,
    banner?: string,
    description?: string,
    organization?: string,
    updatedAt?: number,
}

// Group of channels that build a vision
export class Visions {
    static TABLE_NAME = "visions" as "visions"
    static TABLE_CONNECTED_USERS_NAME = "vision_users"
    static Table = defineTable({
        title: v.string(),
        banner: v.string(),
        description: v.optional(v.string()),
        updatedAt: v.number(),
        organization: v.optional(v.string())
    });
    static TableConnectedUsers = defineTable({
        userId: v.string(),
        role: v.string(), // owner or editor
        visionId: v.id(Visions.TABLE_NAME)
    }).index("by_visionId", ["visionId"])
        .index("by_userId", ["userId"]);
}
