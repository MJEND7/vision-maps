"use client";

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ROUTES } from '@/lib/constants';
import { ProfileUserProvider } from '@/contexts/ProfileUserContext';
import { OrgSwitchProvider } from '@/contexts/OrgSwitchContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { Plan } from '@/lib/permissions';

interface DashboardLayoutClientProps {
    children: React.ReactNode;
    plan: Plan;
    trialDaysLeft: number | null;
}

export default function DashboardLayoutClient({
    children,
    plan,
    trialDaysLeft,
}: DashboardLayoutClientProps) {
    const { isLoaded, isSignedIn, user } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push(ROUTES.SIGNIN);
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || !isSignedIn) return null;

    return (
        <PermissionsProvider plan={plan} trialDaysLeft={trialDaysLeft}>
            <ProfileUserProvider user={user}>
                <OrgSwitchProvider>
                    <div className="h-full min-h-screen">
                        {children}
                    </div>
                </OrgSwitchProvider>
            </ProfileUserProvider>
        </PermissionsProvider>
    );
}