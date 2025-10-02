import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export enum OrgMemberRole {
    Admin = "admin",
    Member = "member"
}

export interface OrganizationMember {
    _id: Id<"organization_members">;
    _creationTime: number;
    organizationId: Id<"organizations">;
    userId: string; // user external ID
    role: OrgMemberRole;
    createdAt: number;
    updatedAt: number;
}

export class OrganizationMembers {
    static TABLE_NAME = "organization_members" as "organization_members";
    static Table = defineTable({
        organizationId: v.id("organizations"),
        userId: v.string(), // user external ID
        role: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_and_user", ["organizationId", "userId"]);
}
