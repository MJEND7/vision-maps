import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


export async function GET() {
    try {
        const { userId, sessionClaims } = await auth();

        if (!userId || !sessionClaims) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const rawPlan = (sessionClaims.pla as string)

        const plan = rawPlan.replace("u:", "").replace("o:", "")
        
        return NextResponse.json({
            plan,
            userId
        });
    } catch (error) {
        console.error("Error fetching user plan:", error);
        return NextResponse.json(
            { error: "Failed to fetch user plan" },
            { status: 500 }
        );
    }
}
