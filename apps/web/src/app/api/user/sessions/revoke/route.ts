import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get the user from Clerk
    const user = await clerkClient().users.getUser(userId);

    // Get all user sessions
    const sessions = await user.getSessions();

    // Find the session to revoke
    const sessionToRevoke = sessions.find(s => s.id === sessionId);

    if (!sessionToRevoke) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Revoke the session
    await sessionToRevoke.revoke();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[USER SESSIONS REVOKE] Error revoking session:", error);
    return NextResponse.json(
      { error: "Failed to revoke session" },
      { status: 500 }
    );
  }
}
