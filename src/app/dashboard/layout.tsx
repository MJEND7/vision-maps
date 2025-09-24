"use client";

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ROUTES } from '@/lib/constants';
import { ProfileUserProvider } from '@/contexts/ProfileUserContext';
import { OrgSwitchProvider } from '@/contexts/OrgSwitchContext';

export default function ProfileLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { isLoaded, isSignedIn, user } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push(ROUTES.SIGNIN);
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || !isSignedIn) return null;

    return (
        <ProfileUserProvider user={user}>
            <OrgSwitchProvider>
                <div className="h-full min-h-screen">
                    {children}
                </div>
            </OrgSwitchProvider>
        </ProfileUserProvider>
    );
}
