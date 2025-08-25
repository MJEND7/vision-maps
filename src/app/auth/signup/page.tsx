"use client";

import AuthComponent from '@/components/auth/AuthComponent'
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

export default function SignUpPage() {
    const router = useRouter();

    return (
        <AuthComponent
            variant={"signup"}
            onSwitchVariant={() => router.push(ROUTES.SIGNIN)}
        />
    )
}
