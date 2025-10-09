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

        // Check org plan first if user is in an organization, otherwise check user plan
        const plan = orgId
            ? await convex.query(api.plans.getPlanByOwner, {
                ownerType: "org",
                ownerId: orgId,
            })
            : await convex.query(api.plans.getPlanByOwner, {
                ownerType: "user",
                ownerId: userId,
            });

        const planType = plan?.planType || "free";
        const status = plan?.status || "none";
        const isOnTrial = plan?.isOnTrial || false;

        // Calculate trial days left if on trial
        let trialDaysLeft = null;
        if (isOnTrial && plan?.trialEndsAt) {
            const now = Date.now();
            trialDaysLeft = Math.ceil((plan.trialEndsAt - now) / (24 * 60 * 60 * 1000));
            if (trialDaysLeft < 0) trialDaysLeft = 0;
        }

        return NextResponse.json({
            plan: planType,
            userId,
            orgId: orgId || null,
            status,
            isOnTrial,
            trialDaysLeft,
            activePlan: plan,
        });
    } catch (error) {
        console.error("Error fetching user plan:", error);
        return NextResponse.json(
            { error: "Failed to fetch user plan" },
            { status: 500 }
        );
    }
}
