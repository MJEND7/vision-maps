import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export interface Workspace {
    _id: Id<"workspaces">;
    _creationTime: number;
    name: string;
    slug: string;
    imageUrl?: string;
    hasImage: boolean;
    membersCount: number;
    maxAllowedMemberships: number;
    adminDeleteEnabled: boolean;
    publicMetadata: Record<string, any>;
    privateMetadata: Record<string, any>;
    createdBy: string; // user external ID
    isDefault: boolean; // True if this is the default workspace for a user
    createdAt: number;
    updatedAt: number;
}

export class Workspaces {
    static TABLE_NAME = "workspaces" as "workspaces";
    static Table = defineTable({
        name: v.string(),
        slug: v.string(),
        imageUrl: v.optional(v.string()),
        hasImage: v.boolean(),
        membersCount: v.number(),
        maxAllowedMemberships: v.number(),
        adminDeleteEnabled: v.boolean(),
        publicMetadata: v.any(),
        privateMetadata: v.any(),
        createdBy: v.string(), // user external ID
        isDefault: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
    .index("by_slug", ["slug"])
    .index("by_createdBy", ["createdBy"])
    .index("by_isDefault", ["createdBy", "isDefault"])
    .searchIndex("search_name", {
        searchField: "name",
    });
}
