"use client";

import AuthComponent from '@/components/auth/AuthComponent'
import { useRouter } from 'next/navigation';
import LandingNav from '@/components/landing/LandingNav';

export default function SignUpPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            {/* Header */}
            <LandingNav />

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center sm:p-4">
                <AuthComponent
                    variant={"signup"}
                    onSwitchVariant={() => router.push("/signin")}
                />
            </div>
        </div>
    )
}
