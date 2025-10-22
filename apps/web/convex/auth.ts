import { Plan } from "./permissions";
import { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Get user's plan from auth context
 * If workspaceId is provided, gets the plan for that specific workspace
 * If workspaceId is not provided, checks all workspace plans (TEAMS only for non-default workspaces), org plans (legacy), and user plans
 * Default workspaces only support FREE (1 vision) or PRO (everything), not TEAMS
 * Plan hierarchy: Workspace TEAMS > Workspace PRO > User PRO > User FREE
 */
export async function getUserPlan(ctx: QueryCtx | MutationCtx, workspaceId?: string): Promise<Plan> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return Plan.FREE;
  }

  const userId = identity.userId;

  if (!userId) {
      throw new Error("Failed to get user")
  }

  // If a specific workspace is provided, check that workspace's plan
  if (workspaceId) {
    const workspace = await ctx.db.get(workspaceId as any);

    if (!workspace) {
      return Plan.FREE;
    }

    // Check if user is a member of this workspace
    const membership = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", workspaceId as any).eq("userId", userId.toString())
      )
      .first();

    if (!membership) {
      return Plan.FREE;
    }

    const workspacePlan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerType", "workspace").eq("ownerId", workspaceId))
      .first();

    if (workspacePlan && (workspacePlan.status === "active" || workspacePlan.status === "trialing")) {
      if (workspacePlan.planType === "team") {
        return Plan.TEAMS;
      } else if (workspacePlan.planType === "pro") {
        return Plan.PRO;
      }
    }

    return Plan.FREE;
  }

  // Check workspace memberships for TEAMS plan (skip for default workspaces)
  const workspaceMemberships = await ctx.db
    .query("workspace_members")
    .withIndex("by_user", (q) => q.eq("userId", userId.toString()))
    .collect();

  for (const membership of workspaceMemberships) {
    const workspace = await ctx.db.get(membership.workspaceId);

    // Skip TEAMS plan check for default workspaces (they only support FREE or PRO)
    if (!workspace?.isDefault) {
      continue;
    }

    const workspacePlan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerType", "workspace").eq("ownerId", membership.workspaceId))
      .first();

    if (workspacePlan && (workspacePlan.status === "active" || workspacePlan.status === "trialing")) {
      if (workspacePlan.planType === "team") {
        return Plan.TEAMS;
      } else if (workspacePlan.planType === "pro") {
        return Plan.PRO;
      }
    }
  }

  return Plan.FREE;
}
