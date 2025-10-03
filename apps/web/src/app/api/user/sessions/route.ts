import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the user from Clerk
        const user = (await (await clerkClient()).users.getUser(userId));

        // Get all sessions with activity details
        const sessions = await user.getSessions();

        return NextResponse.json({
            sessions,
            total: sessions.length,
        });
    } catch (error) {
        console.error("[USER SESSIONS] Error fetching sessions:", error);
        return NextResponse.json(
            { error: "Failed to fetch sessions" },
            { status: 500 }
        );
    }
}
