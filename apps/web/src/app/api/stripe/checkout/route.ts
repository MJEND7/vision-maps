import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { redis } from "@/lib/redis";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { priceId, planType } = await req.json();

        if (!priceId || !planType) {
            return NextResponse.json(
                { error: "Missing priceId or planType" },
                { status: 400 }
            );
        }

        // Get the stripeCustomerId from Redis
        let stripeCustomerId = await redis.get<string>(`stripe:user:${userId}`);

        // Create a new Stripe customer if this user doesn't have one
        if (!stripeCustomerId) {
            const user = await currentUser();
            const newCustomer = await stripe.customers.create({
                email: user?.emailAddresses[0]?.emailAddress,
                metadata: {
                    userId: userId, // DO NOT FORGET THIS
                },
            });

            // Store the relation between userId and stripeCustomerId in Redis
            await redis.set(`stripe:user:${userId}`, newCustomer.id);
            stripeCustomerId = newCustomer.id;

            // Also create the mapping in Convex
            await convex.mutation(api.userPlans.createUserPlanMapping, {
                externalId: userId,
                stripeCustomerId: newCustomer.id,
            });
        }

        // ALWAYS create a checkout with a stripeCustomerId
        const checkout = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            allow_promotion_codes: true,
            billing_address_collection: "auto",
            metadata: {
                userId,
                planType,
            },
        });

        return NextResponse.json({ url: checkout.url });
    } catch (error) {
        console.error("[STRIPE CHECKOUT] Error creating checkout session:", error);
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
