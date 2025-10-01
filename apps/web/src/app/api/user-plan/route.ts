import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";


const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
    try {
        const { userId, sessionClaims, orgId } = await auth();

        if (!userId || !sessionClaims) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const rawPlan = (sessionClaims.pla as string);
        const plan = rawPlan.replace("u:", "").replace("o:", "");

        // Get trial information from Convex
        let trialDaysLeft = null;
        try {
            console.log(userId);
            const trialInfo = await convex.query(api.userTrials.getTrialInfo, {
                clerkUserId: userId,
                organizationId: orgId || undefined,
            });

            if (trialInfo) {
                trialDaysLeft = trialInfo.daysLeft;
            }
        } catch (convexError) {
            console.error("Error fetching trial info:", convexError);
            // Don't fail the whole request if trial info fails
        }

        return NextResponse.json({
            plan,
            userId,
            trialDaysLeft,
        });
    } catch (error) {
        console.error("Error fetching user plan:", error);
        return NextResponse.json(
            { error: "Failed to fetch user plan" },
            { status: 500 }
        );
    }
}
