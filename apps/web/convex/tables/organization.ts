import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export interface Organization {
    _id: Id<"organizations">;
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
    createdAt: number;
    updatedAt: number;
}

export class Organizations {
    static TABLE_NAME = "organizations" as "organizations";
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
        createdAt: v.number(),
        updatedAt: v.number(),
    })
    .index("by_slug", ["slug"])
    .index("by_createdBy", ["createdBy"])
    .searchIndex("search_name", {
        searchField: "name",
    });
}
