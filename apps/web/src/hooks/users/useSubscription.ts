"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

export enum OwnerType {
    User = "user",
    Org = "org",
    Workspace = "workspace"
}

export function useSubscription(ownerId: string | undefined, ownerType: OwnerType) {
    const plan = useQuery(
        api.plans.getPlanByOwner,
        ownerId ? { ownerType: (ownerType as OwnerType.User | OwnerType.Org | OwnerType.Workspace), ownerId } : "skip"
    );

    const planType = plan?.planType || "free";
    const isOnTrial = (plan?.trialEndsAt || 0) > Date.now();
    const status = plan?.status || "none";

    const hasPlan = (planName: string) => {
        return planType === planName;
    };

    const hasFreePlan = () => planType === "free";
    const hasProPlan = () => planType === "pro";
    const hasTeamPlan = () => planType === "team";

    const isActive = status === "active" || status === "trialing";

    const hasUnlimitedMaps = () => isActive && (hasProPlan() || hasTeamPlan());
    const hasAIAssistant = () => isActive && (hasProPlan() || hasTeamPlan());
    const hasTeamCollaboration = () => isActive && hasTeamPlan();
    const hasAdvancedExports = () => isActive && (hasProPlan() || hasTeamPlan());
    const hasPrioritySupport = () => isActive && (hasProPlan() || hasTeamPlan());

    return {
        plan,
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
