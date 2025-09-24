"use client";

import AuthComponent from '@/components/auth/AuthComponent'
import { useRouter, useSearchParams } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

export default function SignUpPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleSwitchVariant = () => {
        const returnUrl = searchParams.get('returnUrl');
        const plan = searchParams.get('plan');
        const period = searchParams.get('period');
        
        let signinUrl = ROUTES.SIGNIN;
        if (returnUrl || plan || period) {
            const params = new URLSearchParams();
            if (returnUrl) params.set('returnUrl', returnUrl);
            if (plan) params.set('plan', plan);
            if (period) params.set('period', period);
            signinUrl += `?${params.toString()}`;
        }
        
        router.push(signinUrl);
    };

    return (
        <AuthComponent
            variant={"signup"}
            onSwitchVariant={handleSwitchVariant}
        />
    )
}
