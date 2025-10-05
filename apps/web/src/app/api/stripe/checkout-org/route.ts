import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { redis } from "@/lib/redis";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json(
                { error: "Unauthorized or no organization" },
                { status: 401 }
            );
        }

        const { priceId, seats } = await req.json();

        if (!priceId || !seats) {
            return NextResponse.json(
                { error: "Missing priceId or seats" },
                { status: 400 }
            );
        }

        // SECURITY: Verify user is an admin of the organization before proceeding
        const org = await convex.query(api.orgs.getById, {
            organizationId: orgId as any,
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 }
            );
        }

        // Check if user is an admin member of the organization
        const members = await convex.query(api.orgs.getMembers, {
            organizationId: orgId as any,
        });

        const userMembership = members.find((m) => m.userId === userId);

        if (!userMembership || userMembership.role !== "admin") {
            return NextResponse.json(
                { error: "Only organization admins can manage billing" },
                { status: 403 }
            );
        }

        // Get the stripeCustomerId from Redis for this org
        let stripeCustomerId = await redis.get<string>(`stripe:org:${orgId}`);

        // Create a new Stripe customer if this org doesn't have one
        if (!stripeCustomerId) {
            const user = await currentUser();

            if (!user) {
                throw new Error("No user found")
            }

            const email = user?.primaryEmailAddress;

            if (!email) {
                throw new Error("Failed to get user email")
            }

            const newCustomer = await stripe.customers.create({
                email: email.toString(),
                name: org.name,
                metadata: {
                    organizationId: orgId,
                    ownerId: userId,
                },
            });

            await redis.set(`stripe:org:${orgId}`, newCustomer.id);
            stripeCustomerId = newCustomer.id;

            await convex.mutation(api.orgPlans.createOrgPlanMapping, {
                organizationId: orgId,
                stripeCustomerId: newCustomer.id,
                ownerId: userId,
                seats,
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
                    quantity: seats, // Seat-based billing
                },
            ],
            mode: "subscription",
            allow_promotion_codes: true,
            billing_address_collection: "auto",
            metadata: {
                organizationId: orgId,
                ownerId: userId,
                planType: "team",
            },
        });

        return NextResponse.json({ url: checkout.url });
    } catch (error) {
        console.error(
            "[STRIPE CHECKOUT ORG] Error creating checkout session:",
            error
        );
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
