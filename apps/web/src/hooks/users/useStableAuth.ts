"use client";

import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useState, useEffect } from "react";

/**
 * Hook that provides stable authentication state, preventing race conditions
 * during workspace switching or authentication state changes.
 */
export function useStableAuth() {
    const { user, isLoaded: userLoaded, isSignedIn } = useUser();
    const { workspace, isLoaded: workspaceLoaded } = useWorkspace();
    const [isStable, setIsStable] = useState(false);
    const [wasAuthenticated, setWasAuthenticated] = useState(false);

    useEffect(() => {
        // Track if user was previously authenticated
        if (isSignedIn && user) {
            setWasAuthenticated(true);
        } else if (!isSignedIn) {
            setWasAuthenticated(false);
        }

        // Consider auth stable when:
        // 1. Both user and workspace states are loaded
        // 2. User is signed in with a valid user object
        // 3. Small delay to prevent race conditions
        if (userLoaded && workspaceLoaded && isSignedIn && user) {
            const timer = setTimeout(() => {
                setIsStable(true);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            // If auth becomes invalid and user was previously authenticated,
            // this suggests a workspace switch or similar transition
            if (wasAuthenticated && !isSignedIn) {
                setIsStable(false);
            }
        }
    }, [userLoaded, workspaceLoaded, isSignedIn, user, wasAuthenticated]);

    // Reset stability when workspace changes
    useEffect(() => {
        if (isStable) {
            setIsStable(false);
            const timer = setTimeout(() => {
                if (userLoaded && workspaceLoaded && isSignedIn && user) {
                    setIsStable(true);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [workspace?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        user,
        workspace,
        isLoaded: userLoaded && workspaceLoaded,
        isSignedIn,
        isStable,
        isAuthenticated: isSignedIn && !!user && isStable,
    };
}