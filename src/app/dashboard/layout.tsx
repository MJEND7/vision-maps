"use client";

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ROUTES } from '@/lib/constants';
import { ProfileUserProvider } from '@/contexts/ProfileUserContext';
import ProfileNav from '@/components/profile/ProfileNav';

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

    return (
        <ProfileUserProvider user={user}>
            <div className="h-full min-h-screen bg-background">
                <div className="py-[36px]">
                    <ProfileNav/>
                </div>

                {children}
            </div>
        </ProfileUserProvider>
    );
}
