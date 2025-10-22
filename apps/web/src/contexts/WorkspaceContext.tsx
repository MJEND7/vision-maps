"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";

interface Workspace {
    _id: Id<"workspaces">;
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
    isDefault: boolean;
    createdAt: number;
    updatedAt: number;
    role?: string;
    membershipId?: Id<"workspace_members">;
}

interface WorkspaceContextType {
    // Current selected workspace
    workspace: Workspace | null;

    // All user's workspaces
    userWorkspaces: Workspace[] | undefined;

    // User's default workspace
    defaultWorkspace: Workspace | null;

    // Loading state
    isLoaded: boolean;

    // Switch workspace
    setActiveWorkspace: (workspaceId: Id<"workspaces"> | null) => void;

    // Helper to check if user is admin of current workspace
    isAdmin: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "selectedWorkspaceId";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<Id<"workspaces"> | null>(null);
    const [hasHydrated, setHasHydrated] = useState(false);

    // Fetch all user's workspaces
    const userWorkspaces = useQuery(api.workspaces.getUserWorkspaces, {});

    // Fetch user's default workspace
    const defaultWorkspace = useQuery(api.workspaces.getDefaultWorkspaceForUser, {});

    // Load selected workspace from localStorage on mount
    useEffect(() => {
        const savedWorkspaceId = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedWorkspaceId && savedWorkspaceId !== "null") {
            setSelectedWorkspaceId(savedWorkspaceId as Id<"workspaces">);
        }
        setHasHydrated(true);
    }, []);

    // Auto-select default workspace if none selected and workspaces are available
    useEffect(() => {
        if (hasHydrated && !selectedWorkspaceId && defaultWorkspace) {
            setSelectedWorkspaceId(defaultWorkspace._id);
            localStorage.setItem(LOCAL_STORAGE_KEY, defaultWorkspace._id);
        }
    }, [hasHydrated, selectedWorkspaceId, defaultWorkspace]);

    const setActiveWorkspace = (workspaceId: Id<"workspaces"> | null) => {
        setSelectedWorkspaceId(workspaceId);
        if (workspaceId) {
            localStorage.setItem(LOCAL_STORAGE_KEY, workspaceId);
        } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    };

    const currentWorkspace = userWorkspaces?.find(ws => ws._id === selectedWorkspaceId);
    const isAdmin = currentWorkspace?.role === "admin";

    return (
        <WorkspaceContext.Provider
            value={{
                workspace: currentWorkspace || null,
                userWorkspaces,
                defaultWorkspace: defaultWorkspace || null,
                isLoaded: userWorkspaces !== undefined && hasHydrated,
                setActiveWorkspace,
                isAdmin,
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error("useWorkspace must be used within WorkspaceProvider");
    }
    return {
        workspace: context.workspace,
        defaultWorkspace: context.defaultWorkspace,
        isLoaded: context.isLoaded,
        isAdmin: context.isAdmin,
    };
}

export function useWorkspaceList() {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error("useWorkspaceList must be used within WorkspaceProvider");
    }
    return {
        userMemberships: {
            data: context.userWorkspaces?.map(ws => ({
                id: ws.membershipId,
                workspace: {
                    id: ws._id,
                    name: ws.name,
                    slug: ws.slug,
                    imageUrl: ws.imageUrl,
                    hasImage: ws.hasImage,
                    membersCount: ws.membersCount,
                    isDefault: ws.isDefault,
                },
                role: ws.role,
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
        setActive: async ({ workspace }: { workspace: Id<"workspaces"> | null }) => {
            context.setActiveWorkspace(workspace);
        },
    };
}
