"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
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
    createdAt: number;
    updatedAt: number;
    role?: string;
    membershipId?: Id<"organization_members">;
}

interface OrganizationContextType {
    // Current selected organization
    organization: Organization | null;

    // All user's organizations
    userOrganizations: Organization[] | undefined;

    // Loading state
    isLoaded: boolean;

    // Switch organization
    setActiveOrganization: (orgId: Id<"organizations"> | null) => void;

    // Helper to check if user is admin of current org
    isAdmin: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "selectedOrganizationId";

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const [selectedOrgId, setSelectedOrgId] = useState<Id<"organizations"> | null>(null);
    const [hasHydrated, setHasHydrated] = useState(false);

    // Fetch all user's organizations
    const userOrganizations = useQuery(api.orgs.getUserOrganizations, {});

    // Load selected org from localStorage on mount
    useEffect(() => {
        const savedOrgId = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedOrgId && savedOrgId !== "null") {
            setSelectedOrgId(savedOrgId as Id<"organizations">);
        }
        setHasHydrated(true);
    }, []);

    // Auto-select first org if none selected and orgs are available
    useEffect(() => {
        if (hasHydrated && !selectedOrgId && userOrganizations && userOrganizations.length > 0) {
            // Don't auto-select, let user choose or stay on personal
        }
    }, [hasHydrated, selectedOrgId, userOrganizations]);

    const setActiveOrganization = (orgId: Id<"organizations"> | null) => {
        setSelectedOrgId(orgId);
        if (orgId) {
            localStorage.setItem(LOCAL_STORAGE_KEY, orgId);
        } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    };

    const currentOrg = userOrganizations?.find(org => org._id === selectedOrgId);
    const isAdmin = currentOrg?.role === "admin";

    return (
        <OrganizationContext.Provider
            value={{
                organization: currentOrg || null,
                userOrganizations,
                isLoaded: userOrganizations !== undefined && hasHydrated,
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
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error("useOrganizationList must be used within OrganizationProvider");
    }
    return {
        userMemberships: {
            data: context.userOrganizations?.map(org => ({
                id: org.membershipId,
                organization: {
                    id: org._id,
                    name: org.name,
                    slug: org.slug,
                    imageUrl: org.imageUrl,
                    hasImage: org.hasImage,
                    membersCount: org.membersCount,
                },
                role: org.role,
            })),
            isLoaded: context.isLoaded,
            revalidate: () => {
                // Convex handles reactivity automatically
            },
        },
        userInvitations: {
            data: [], // No invitations system yet
            revalidate: () => {},
        },
        isLoaded: context.isLoaded,
        setActive: async ({ organization }: { organization: Id<"organizations"> | null }) => {
            context.setActiveOrganization(organization);
        },
    };
}
