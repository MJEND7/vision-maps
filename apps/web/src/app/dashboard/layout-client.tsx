"use client";

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ROUTES } from '@/lib/constants';
import { ProfileUserProvider } from '@/contexts/ProfileUserContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';

interface DashboardLayoutClientProps {
    children: React.ReactNode;
}

export default function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
    const { isLoaded, isSignedIn, user } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push(ROUTES.SIGNIN);
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || !isSignedIn) return null;

    return (
        <PermissionsProvider>
            <ProfileUserProvider user={user}>
                <div className="h-full min-h-screen">
                    {children}
                </div>
            </ProfileUserProvider>
        </PermissionsProvider>
    );
}
