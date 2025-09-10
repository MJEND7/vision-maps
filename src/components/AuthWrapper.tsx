"use client";

import { useUser, useOrganization } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthWrapperProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
    const { isLoaded: userLoaded, isSignedIn, user } = useUser();
    const { isLoaded: orgLoaded } = useOrganization();

    // Show loading state while auth is initializing
    if (!userLoaded || !orgLoaded || !isSignedIn || !user) {
        return fallback || (
            <div className="flex h-screen bg-background">
                <div className="w-64 h-full bg-card border-r border-border p-4">
                    <Skeleton className="h-12 w-full mb-4" />
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full" />
                        ))}
                    </div>
                </div>
                <main className="flex-1 p-8">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-4 w-96 mb-8" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-48 w-full" />
                        ))}
                    </div>
                </main>
            </div>
        );
    }


    return <>{children}</>;
}
