import { Auth } from "convex/server";
import { Plan } from "./permissions";
import { QueryCtx } from "./_generated/server";

/**
 * Get user's plan from auth context
 * Checks both org plan and user plan (org plan takes precedence)
 */
export async function getUserPlan(auth: Auth, db: QueryCtx["db"]): Promise<Plan> {
  const identity = await auth.getUserIdentity();
  if (!identity) {
    return Plan.FREE;
  }

  const userId = identity.subject;

  const memberships = await db
    .query("organization_members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const membership of memberships) {
    const orgPlan = await db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerType", "org").eq("ownerId", membership.organizationId))
      .first();

    if (orgPlan && (orgPlan.status === "active" || orgPlan.status === "trialing")) {
      if (orgPlan.planType === "team") {
        return Plan.TEAMS;
      }
    }
  }

  const userPlan = await db
    .query("plans")
    .withIndex("by_owner", (q) => q.eq("ownerType", "user").eq("ownerId", userId))
    .first();

  if (userPlan && (userPlan.status === "active" || userPlan.status === "trialing")) {
    return userPlan.planType === "pro" ? Plan.PRO : Plan.FREE;
  }

  return Plan.FREE;
}
