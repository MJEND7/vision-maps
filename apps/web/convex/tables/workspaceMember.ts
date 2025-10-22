import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export enum WorkspaceMemberRole {
    Admin = "admin",
    Member = "member"
}

export interface WorkspaceMember {
    _id: Id<"workspace_members">;
    _creationTime: number;
    workspaceId: Id<"workspaces">;
    userId: string; // user external ID
    role: WorkspaceMemberRole;
    createdAt: number;
    updatedAt: number;
}

export class WorkspaceMembers {
    static TABLE_NAME = "workspace_members" as "workspace_members";
    static Table = defineTable({
        workspaceId: v.id("workspaces"),
        userId: v.string(), // user external ID
        role: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]);
}
