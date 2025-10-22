"use client";

/**
 * DEPRECATED: This context is now a wrapper around WorkspaceContext for backward compatibility.
 * New code should use WorkspaceContext instead.
 *
 * This will be removed after all components are migrated to use workspaces.
 */

import React, { createContext, useContext, ReactNode } from "react";
import { useWorkspace, useWorkspaceList } from "./WorkspaceContext";
import { Id } from "@/../convex/_generated/dataModel";

interface Organization {
    _id: Id<"organizations">;
    _creationTime: number;
    name: string;
    slug: string;
    imageUrl?: string;
    hasImage: boolean;
    membersCount: number;
    maxAllowedMemberships: number;
    adminDeleteEnabled: boolean;
    publicMetadata: Record<string, any>;
    privateMetadata: Record<string, any>;
    createdBy: string;
    isDefault?: boolean;
    createdAt: number;
    updatedAt: number;
    role?: string;
    membershipId?: Id<"organization_members">;
}

interface OrganizationContextType {
    // Current selected organization (now workspace)
    organization: Organization | null;

    // All user's organizations (now workspaces)
    userOrganizations: Organization[] | undefined;

    // Loading state
    isLoaded: boolean;

    // Switch organization (now workspace)
    setActiveOrganization: (orgId: Id<"organizations"> | null) => void;

    // Helper to check if user is admin of current org (now workspace)
    isAdmin: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
    // Use workspace context internally
    const { workspace, isLoaded, isAdmin } = useWorkspace();
    const { setActive } = useWorkspaceList();

    const setActiveOrganization = (orgId: Id<"organizations"> | null) => {
        if (setActive) {
            setActive({ workspace: orgId as Id<"workspaces"> | null });
        }
    };

    // Convert workspace to organization shape for backward compatibility
    const organization = workspace ? {
        ...(workspace as any),
    } : null;

    return (
        <OrganizationContext.Provider
            value={{
                organization,
                userOrganizations: undefined,
                isLoaded,
                setActiveOrganization,
                isAdmin,
            }}
        >
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error("useOrganization must be used within OrganizationProvider");
    }
    return {
        organization: context.organization,
        isLoaded: context.isLoaded,
        isAdmin: context.isAdmin,
    };
}

export function useOrganizationList() {
    const { userMemberships, setActive, isLoaded } = useWorkspaceList();

    return {
        userMemberships: {
            data: userMemberships.data?.map(ws => ({
                id: ws.id,
                organization: {
                    id: ws.workspace.id,
                    name: ws.workspace.name,
                    slug: ws.workspace.slug,
                    imageUrl: ws.workspace.imageUrl,
                    hasImage: ws.workspace.hasImage,
                    membersCount: ws.workspace.membersCount,
                },
                role: ws.role,
            })),
            isLoaded: userMemberships.isLoaded,
            revalidate: () => {
                // Convex handles reactivity automatically
            },
        },
        userInvitations: {
            data: [],
            revalidate: () => {},
        },
        isLoaded,
        setActive: async ({ organization }: { organization: Id<"organizations"> | null }) => {
            return setActive({ workspace: organization as Id<"workspaces"> | null });
        },
    };
}
