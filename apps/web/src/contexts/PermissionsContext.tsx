"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
    Plan,
    Permission,
    hasPermission,
    canCreateVision,
    canInviteToVision,
    getPlanPermissions,
    VISION_LIMITS,
    COLLABORATION_LIMITS,
} from "@/lib/permissions";
import { OwnerType, useSubscription } from "@/hooks/users/useSubscription";

interface PermissionsContextType {
    plan: Plan;
    trialDaysLeft: number | null;
    hasPermission: (permission: Permission) => boolean;
    canCreateVision: (currentVisionCount: number) => boolean;
    canInviteToVision: (currentMemberCount: number) => boolean;
    getAllPermissions: () => Permission[];
    visionLimit: number;
    collaborationLimit: number;
    isLoading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(
    undefined
);

interface PermissionsProviderProps {
    children: ReactNode;
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
    const { userId } = useAuth();
    const { workspace } = useWorkspace();
    const { plan: planData } = useSubscription(workspace?._id || userId || undefined, workspace ? OwnerType.Workspace : OwnerType.User);


    // Determine plan type from database
    const plan = useMemo(() => {
        if (!planData) return Plan.FREE;

        // Map database planType to Plan enum
        if (planData.planType === "pro") return Plan.PRO;
        if (planData.planType === "team") return Plan.TEAMS;
        return Plan.FREE;
    }, [planData]);

    // Calculate trial days left
    const trialDaysLeft = useMemo(() => {
        if (!planData?.isOnTrial || !planData?.trialEndsAt) return null;
        const daysLeft = Math.ceil((planData.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000));
        return daysLeft > 0 ? daysLeft : null;
    }, [planData]);

    const contextValue: PermissionsContextType = useMemo(
        () => ({
            plan,
            trialDaysLeft,
            hasPermission: (permission: Permission) => hasPermission(plan, permission),
            canCreateVision: (currentVisionCount: number) =>
                canCreateVision(plan, currentVisionCount),
            canInviteToVision: (currentMemberCount: number) =>
                canInviteToVision(plan, currentMemberCount),
            getAllPermissions: () => getPlanPermissions(plan),
            visionLimit: VISION_LIMITS[plan],
            collaborationLimit: COLLABORATION_LIMITS[plan],
            isLoading: planData === undefined,
        }),
        [plan, trialDaysLeft, planData]
    );

    return (
        <PermissionsContext.Provider value={contextValue}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error(
            "usePermissions must be used within a PermissionsProvider"
        );
    }
    return context;
}
