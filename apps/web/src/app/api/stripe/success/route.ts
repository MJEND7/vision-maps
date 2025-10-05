import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { redis } from "@/lib/redis";
import {
  syncUserStripeDataToKV,
  syncOrgStripeDataToKV,
} from "@/lib/stripe/sync";

export async function GET() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  try {
    // Determine if this is a user or org checkout
    if (orgId) {
      // Org checkout
      const stripeCustomerId = await redis.get<string>(`stripe:org:${orgId}`);
      if (stripeCustomerId) {
        // Sync the org subscription data from Stripe to Redis
        await syncOrgStripeDataToKV(stripeCustomerId);
      }
    } else {
      // User checkout
      const stripeCustomerId = await redis.get<string>(`stripe:user:${userId}`);
      if (stripeCustomerId) {
        // Sync the user subscription data from Stripe to Redis
        await syncUserStripeDataToKV(stripeCustomerId);
      }
    }
  } catch (error) {
    console.error("[STRIPE SUCCESS] Error syncing subscription data:", error);
    // Continue to redirect even if sync fails
  }

  // Redirect to the main page or dashboard
  return redirect("/");
}
