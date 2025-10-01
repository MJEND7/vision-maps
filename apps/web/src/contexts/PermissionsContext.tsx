"use client";

import { createContext, useContext, ReactNode } from "react";
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

interface PermissionsContextType {
  plan: Plan;
  trialDaysLeft: number | null;
  hasPermission: (permission: Permission) => boolean;
  canCreateVision: (currentVisionCount: number) => boolean;
  canInviteToVision: (currentMemberCount: number) => boolean;
  getAllPermissions: () => Permission[];
  visionLimit: number;
  collaborationLimit: number;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined
);

interface PermissionsProviderProps {
  children: ReactNode;
  plan: Plan;
  trialDaysLeft: number | null;
}

export function PermissionsProvider({
  children,
  plan,
  trialDaysLeft,
}: PermissionsProviderProps) {
  const contextValue: PermissionsContextType = {
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
  };

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