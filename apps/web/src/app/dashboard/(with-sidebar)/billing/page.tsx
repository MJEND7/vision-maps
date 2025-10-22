"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { OwnerType, useSubscription } from "@/hooks/users/useSubscription";
import { BillingTab as SharedBillingTab } from "@/components/billing/BillingTab";

export default function WorkspaceBillingPage() {
    const { workspace, isAdmin } = useWorkspace();
    const { plan: workspacePlan, planType, isOnTrial, status, isActive } = useSubscription(
        workspace?._id || "",
        OwnerType.Workspace
    );

    if (!workspace) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Please select a workspace</p>
            </div>
        );
    }

    const getPlanBadgeColor = () => {
        if (isOnTrial)
            return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
        if (planType === "team")
            return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
        if (planType === "pro")
            return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    };

    const getPlanDisplayName = () => {
        if (planType === "team") return "Team";
        if (planType === "pro") return "Pro";
        return "Free";
    };

    return (
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
            {/* Header */}
            <div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Billing</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your workspace plan and billing
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <SharedBillingTab
                    ownerId={workspace._id}
                    ownerType="workspace"
                    plan={workspacePlan}
                    planType={planType}
                    isOnTrial={isOnTrial}
                    status={status}
                    isActive={isActive}
                    organizationMembersCount={workspace.membersCount}
                    getPlanBadgeColor={getPlanBadgeColor}
                    getPlanDisplayName={getPlanDisplayName}
                    canManageBilling={isAdmin}
                />
            </div>
        </div>
    );
}
