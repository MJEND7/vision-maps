import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * DEBUG QUERY: Inspect user's plan setup
 * Use this to understand why a user's plan is not being detected
 */
export const inspectUserPlans = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const debugInfo = {
      userId,
      workspaceTeamsPlans: [] as any[],
      orgTeamsPlans: [] as any[],
      userPlans: [] as any[],
      workspaceMemberships: [] as any[],
      organizationMemberships: [] as any[],
    };

    // Get workspace memberships
    const workspaceMemberships = await ctx.db
      .query("workspace_members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    debugInfo.workspaceMemberships = workspaceMemberships.map(m => ({
      _id: m._id,
      workspaceId: m.workspaceId,
      role: m.role,
    }));

    // Get workspace TEAMS plans
    for (const membership of workspaceMemberships) {
      const workspace = await ctx.db.get(membership.workspaceId);
      const plan = await ctx.db
        .query("plans")
        .withIndex("by_owner", (q) => q.eq("ownerType", "workspace").eq("ownerId", membership.workspaceId))
        .first();

      if (plan) {
        debugInfo.workspaceTeamsPlans.push({
          workspaceId: membership.workspaceId,
          workspaceName: workspace?.name,
          isDefault: workspace?.isDefault,
          plan: {
            _id: plan._id,
            planType: plan.planType,
            status: plan.status,
            ownerType: plan.ownerType,
            ownerId: plan.ownerId,
          },
        });
      }
    }

    // Get organization memberships
    const orgMemberships = await ctx.db
      .query("organization_members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    debugInfo.organizationMemberships = orgMemberships.map(m => ({
      _id: m._id,
      organizationId: m.organizationId,
      role: m.role,
    }));

    // Get organization TEAMS plans
    for (const membership of orgMemberships) {
      const org = await ctx.db.get(membership.organizationId);
      const plan = await ctx.db
        .query("plans")
        .withIndex("by_owner", (q) => q.eq("ownerType", "org").eq("ownerId", membership.organizationId))
        .first();

      if (plan) {
        debugInfo.orgTeamsPlans.push({
          organizationId: membership.organizationId,
          organizationName: org?.name,
          plan: {
            _id: plan._id,
            planType: plan.planType,
            status: plan.status,
            ownerType: plan.ownerType,
            ownerId: plan.ownerId,
          },
        });
      }
    }

    // Get user plan
    const userPlan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerType", "user").eq("ownerId", userId))
      .first();

    if (userPlan) {
      debugInfo.userPlans.push({
        _id: userPlan._id,
        planType: userPlan.planType,
        status: userPlan.status,
        ownerType: userPlan.ownerType,
        ownerId: userPlan.ownerId,
      });
    }

    return debugInfo;
  },
});
