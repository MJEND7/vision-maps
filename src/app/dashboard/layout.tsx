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

    const newVision = async () => {
        const id = "";

        //Create vision in convex

        router.push(`${ROUTES.PROFILE.VISIONS}/${id}`)
    }


    // Show loading spinner while checking auth status
    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Don't render profile pages if user is not signed in
    if (!isSignedIn) {
        return null;
    }

    return (
        <ProfileUserProvider user={user}>
            <div className="min-h-screen bg-background">
                <div className="py-[36px]">
                    <ProfileNav onNew={newVision} />
                </div>

                {children}
            </div>
        </ProfileUserProvider>
    );
}
