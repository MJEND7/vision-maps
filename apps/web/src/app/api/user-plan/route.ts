import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
    try {
        const { userId, orgId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get user plan from Convex
        const userPlan = await convex.query(api.userPlans.getUserPlanByExternalId, {
            externalId: userId,
        });

        // Get org plan from Convex if in an organization
        let orgPlan = null;
        if (orgId) {
            orgPlan = await convex.query(api.orgPlans.getOrgPlanByOrganizationId, {
                organizationId: orgId,
            });
        }

        // Determine the active plan (org plan takes precedence)
        const activePlan = orgPlan || userPlan;
        const planType = activePlan?.planType || "free";
        const status = activePlan?.status || "none";
        const isOnTrial = activePlan?.isOnTrial || false;

        // Calculate trial days left if on trial
        let trialDaysLeft = null;
        if (isOnTrial && activePlan?.trialEndsAt) {
            const now = Date.now();
            trialDaysLeft = Math.ceil((activePlan.trialEndsAt - now) / (24 * 60 * 60 * 1000));
            if (trialDaysLeft < 0) trialDaysLeft = 0;
        }

        return NextResponse.json({
            plan: planType,
            userId,
            orgId: orgId || null,
            status,
            isOnTrial,
            trialDaysLeft,
            activePlan,
            userPlan,
            orgPlan,
        });
    } catch (error) {
        console.error("Error fetching user plan:", error);
        return NextResponse.json(
            { error: "Failed to fetch user plan" },
            { status: 500 }
        );
    }
}
