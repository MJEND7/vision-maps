"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";

export function useSubscription() {
    const { userId, orgId } = useAuth();

    // Fetch user plan from Convex
    const userPlan = useQuery(
        api.userPlans.getUserPlanByExternalId,
        userId ? { externalId: userId } : "skip"
    );

    // Fetch org plan from Convex if in an organization
    const orgPlan = useQuery(
        api.orgPlans.getOrgPlanByOrganizationId,
        orgId ? { organizationId: orgId } : "skip"
    );

    // Determine the active plan (org plan takes precedence)
    const activePlan = orgPlan || userPlan;
    const planType = activePlan?.planType || "free";
    const isOnTrial = activePlan?.isOnTrial || false;
    const status = activePlan?.status || "none";

    // Check if user has specific plan access
    const hasPlan = (planName: string) => {
        return planType === planName;
    };

    // Helper functions for common plan checks
    const hasFreePlan = () => planType === "free";
    const hasProPlan = () => planType === "pro";
    const hasTeamPlan = () => planType === "team";

    // Check if subscription is active (including trialing)
    const isActive = status === "active" || status === "trialing";

    // Helper functions for common feature checks
    const hasUnlimitedMaps = () => isActive && (hasProPlan() || hasTeamPlan());
    const hasAIAssistant = () => isActive && (hasProPlan() || hasTeamPlan());
    const hasTeamCollaboration = () => isActive && hasTeamPlan();
    const hasAdvancedExports = () => isActive && (hasProPlan() || hasTeamPlan());
    const hasPrioritySupport = () => isActive && (hasProPlan() || hasTeamPlan());

    return {
        userPlan,
        orgPlan,
        activePlan,
        planType,
        isOnTrial,
        status,
        isActive,
        hasPlan,
        hasFreePlan,
        hasProPlan,
        hasTeamPlan,
        hasUnlimitedMaps,
        hasAIAssistant,
        hasTeamCollaboration,
        hasAdvancedExports,
        hasPrioritySupport,
    };
}