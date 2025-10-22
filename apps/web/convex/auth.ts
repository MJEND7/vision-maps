import { Auth } from "convex/server";
import { Plan } from "./permissions";
import { QueryCtx } from "./_generated/server";

/**
 * Get user's plan from auth context
 * Checks workspace plans (TEAMS only for non-default workspaces), org plans (legacy), and user plans
 * Default workspaces only support FREE (1 vision) or PRO (everything), not TEAMS
 * Plan hierarchy: Workspace TEAMS > Org TEAMS > User PRO > User FREE
 */
export async function getUserPlan(auth: Auth, db: QueryCtx["db"]): Promise<Plan> {
  const identity = await auth.getUserIdentity();
  if (!identity) {
    return Plan.FREE;
  }

  const userId = identity.subject;

  // Check workspace memberships for TEAMS plan (skip for default workspaces)
  const workspaceMemberships = await db
    .query("workspace_members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const membership of workspaceMemberships) {
    const workspace = await db.get(membership.workspaceId);

    // Skip TEAMS plan check for default workspaces (they only support FREE or PRO)
    if (workspace?.isDefault) {
      continue;
    }

    const workspacePlan = await db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerType", "workspace").eq("ownerId", membership.workspaceId))
      .first();

    if (workspacePlan && (workspacePlan.status === "active" || workspacePlan.status === "trialing")) {
      if (workspacePlan.planType === "team") {
        return Plan.TEAMS;
      } else {
        return Plan.PRO;
      }
    }
  }

  return Plan.FREE;
}
