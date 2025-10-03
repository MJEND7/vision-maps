/**
 * Authentication and authorization helpers for Convex
 */

import { Auth } from "convex/server";
import { parsePlan, Plan } from "./permissions";
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
  const orgId = (identity as any).org_id as string | undefined;

  // First check for org plan if user is in an organization
  if (orgId) {
    const orgPlan = await db
      .query("org_plans")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .first();

    if (orgPlan && (orgPlan.status === "active" || orgPlan.status === "trialing")) {
      return orgPlan.planType === "team" ? Plan.TEAMS : Plan.FREE;
    }
  }

  // Check for user plan
  const userPlan = await db
    .query("user_plans")
    .withIndex("by_external_id", (q) => q.eq("externalId", userId))
    .first();

  if (userPlan && (userPlan.status === "active" || userPlan.status === "trialing")) {
    return userPlan.planType === "pro" ? Plan.PRO : Plan.FREE;
  }

  return Plan.FREE;
}

/**
 * Get organization ID from auth context
 */
export async function getOrganizationId(auth: Auth): Promise<string | undefined> {
  const identity = await auth.getUserIdentity();
  if (!identity) {
    return undefined;
  }

  return (identity as any).org_id as string | undefined;
}

/**
 * Get user info from auth context
 */
export async function getUserInfo(auth: Auth, db: QueryCtx["db"]): Promise<{
  userId: string;
  plan: Plan;
  organizationId: string | undefined;
} | null> {
  const identity = await auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return {
    userId: identity.subject,
    plan: await getUserPlan(auth, db),
    organizationId: await getOrganizationId(auth),
  };
}
