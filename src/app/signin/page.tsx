"use client";

import AuthComponent from '@/components/auth/AuthComponent'
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            {/* Main Content */}
            <div className="flex-1 flex sm:items-center justify-center sm:p-4">
                <AuthComponent
                    variant={"signin"}
                    onSwitchVariant={() => router.push("/signup")}
                />
            </div>
        </div>
    )
}
