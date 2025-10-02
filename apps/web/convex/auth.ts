/**
 * Authentication and authorization helpers for Convex
 */

import { Auth } from "convex/server";
import { parsePlan, Plan } from "./permissions";

/**
 * Get user's plan from auth context
 */
export async function getUserPlan(auth: Auth): Promise<Plan> {
  const identity = await auth.getUserIdentity();
  if (!identity) {
    return Plan.FREE;
  }

  // Get plan from Clerk session claims
  const rawPlan = (identity as any).pla as string | undefined;
  return parsePlan(rawPlan);
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
export async function getUserInfo(auth: Auth): Promise<{
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
    plan: await getUserPlan(auth),
    organizationId: await getOrganizationId(auth),
  };
}
