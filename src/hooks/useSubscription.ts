"use client";

import { useAuth } from "@clerk/nextjs";

export function useSubscription() {
    const { has } = useAuth();

    // Check if user has specific plan access
    const hasPlan = (planName: string) => {
        return has?.({ plan: planName }) || false;
    };

    // Check if user has specific feature access
    const hasFeature = (featureName: string) => {
        return has?.({ feature: featureName }) || false;
    };

    // Helper functions for common plan checks
    const hasFreePlan = () => hasPlan('free');
    const hasProPlan = () => hasPlan('pro');
    const hasTeamPlan = () => hasPlan('team');

    // Helper functions for common feature checks
    const hasUnlimitedMaps = () => hasFeature('unlimited_maps') || hasProPlan() || hasTeamPlan();
    const hasAIAssistant = () => hasFeature('ai_assistant') || hasProPlan() || hasTeamPlan();
    const hasTeamCollaboration = () => hasFeature('team_collaboration') || hasTeamPlan();
    const hasAdvancedExports = () => hasFeature('advanced_exports') || hasProPlan() || hasTeamPlan();
    const hasPrioritySupport = () => hasFeature('priority_support') || hasProPlan() || hasTeamPlan();

    return {
        hasPlan,
        hasFeature,
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