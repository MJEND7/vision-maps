import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { Plan } from '@/lib/permissions';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import DashboardLayoutClient from './layout-client';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { userId, orgId } = await auth();

    if (!userId) {
        redirect(ROUTES.SIGNIN);
    }

    // Determine plan and trial status from Stripe subscription data
    let plan: Plan = Plan.FREE;
    let trialDaysLeft: number | null = null;

    try {
        if (orgId) {
            // Check org plan first if user is in an org context
            const orgPlan = await convex.query(api.orgPlans.getOrgPlanByOrganizationId, {
                organizationId: orgId,
            });

            if (orgPlan && orgPlan.status === "active") {
                plan = Plan.TEAMS;

                // Calculate trial days if on trial
                if (orgPlan.isOnTrial && orgPlan.trialEndsAt) {
                    const daysLeft = Math.ceil((orgPlan.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24));
                    trialDaysLeft = daysLeft > 0 ? daysLeft : null;
                }
            }
        }

        // If no active org plan, check user plan
        if (plan === Plan.FREE) {
            const userPlan = await convex.query(api.userPlans.getUserPlanByExternalId, {
                externalId: userId,
            });

            if (userPlan) {
                if (userPlan.status === "active" || userPlan.status === "trialing") {
                    // Map planType from database to Plan enum
                    if (userPlan.planType === "pro") {
                        plan = Plan.PRO;
                    } else if (userPlan.planType === "team") {
                        plan = Plan.TEAMS;
                    }

                    // Calculate trial days if on trial
                    if (userPlan.isOnTrial && userPlan.trialEndsAt) {
                        const daysLeft = Math.ceil((userPlan.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24));
                        trialDaysLeft = daysLeft > 0 ? daysLeft : null;
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error fetching subscription plan info:", error);
        // Default to free plan on error
    }

    return (
        <DashboardLayoutClient plan={plan} trialDaysLeft={trialDaysLeft}>
            {children}
        </DashboardLayoutClient>
    );
}
