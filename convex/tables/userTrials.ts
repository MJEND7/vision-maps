import { defineTable } from "convex/server";
import { v } from "convex/values";

export const UserTrials = {
  Table: defineTable({
    clerkUserId: v.string(),
    organizationId: v.optional(v.string()), // null for personal trials
    plan: v.string(), // "pro" or "teams"
    trialStartDate: v.number(), // timestamp
    trialEndDate: v.number(), // timestamp
    trialDays: v.number(), // number of trial days (default 3)
    status: v.string(), // "active", "expired", "converted"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_organization_id", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_clerk_user_and_org", ["clerkUserId", "organizationId"]),
};