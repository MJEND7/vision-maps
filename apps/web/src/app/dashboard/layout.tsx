import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { parsePlan } from '@/lib/permissions';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import DashboardLayoutClient from './layout-client';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { userId, sessionClaims, orgId } = await auth();

    if (!userId || !sessionClaims) {
        redirect(ROUTES.SIGNIN);
    }

    // Parse plan from session claims
    const rawPlan = (sessionClaims.pla as string) || "free";
    const plan = parsePlan(rawPlan);

    // Get trial information from Convex
    let trialDaysLeft = null;
    try {
        const trialInfo = await convex.query(api.userTrials.getTrialInfo, {
            clerkUserId: userId,
            organizationId: orgId || undefined,
        });

        if (trialInfo) {
            trialDaysLeft = trialInfo.daysLeft;
        }
    } catch (error) {
        console.error("Error fetching trial info:", error);
    }

    return (
        <DashboardLayoutClient plan={plan} trialDaysLeft={trialDaysLeft}>
            {children}
        </DashboardLayoutClient>
    );
}
