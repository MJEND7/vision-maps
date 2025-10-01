"use client";

import { useUser, useOrganization } from "@clerk/nextjs";
import { useState, useEffect } from "react";

/**
 * Hook that provides stable authentication state, preventing race conditions
 * during organization switching or authentication state changes.
 */
export function useStableAuth() {
    const { user, isLoaded: userLoaded, isSignedIn } = useUser();
    const { organization, isLoaded: orgLoaded } = useOrganization();
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
        // 1. Both user and org states are loaded
        // 2. User is signed in with a valid user object
        // 3. Small delay to prevent race conditions
        if (userLoaded && orgLoaded && isSignedIn && user) {
            const timer = setTimeout(() => {
                setIsStable(true);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            // If auth becomes invalid and user was previously authenticated,
            // this suggests an org switch or similar transition
            if (wasAuthenticated && !isSignedIn) {
                setIsStable(false);
            }
        }
    }, [userLoaded, orgLoaded, isSignedIn, user, wasAuthenticated]);

    // Reset stability when organization changes
    useEffect(() => {
        if (isStable) {
            setIsStable(false);
            const timer = setTimeout(() => {
                if (userLoaded && orgLoaded && isSignedIn && user) {
                    setIsStable(true);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [organization?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        user,
        organization,
        isLoaded: userLoaded && orgLoaded,
        isSignedIn,
        isStable,
        isAuthenticated: isSignedIn && !!user && isStable,
    };
}