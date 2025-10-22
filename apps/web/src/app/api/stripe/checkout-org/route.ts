import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { TRIAL_PERIOD_DAYS } from "@/lib/stripe/constants";
import { redis } from "@/lib/redis";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get("org_id");

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

        // Check if user is an admin member of the workspace
        const members = await convex.query(api.workspaces.getMembers, {
            workspaceId: orgId as unknown as Id<"workspaces">,
        });

        const userMembership = members.find((m) => m.userId === userId);

        if (!userMembership || userMembership.role !== "admin") {
            return NextResponse.json(
                { error: "Only workspace admins can manage billing" },
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

            const email = user?.emailAddresses[0]?.emailAddress;

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

            await convex.mutation(api.plans.createPlanMapping, {
                ownerType: "org",
                ownerId: orgId, // This is the organizationId
                stripeCustomerId: newCustomer.id,
                seats,
                billingOwnerId: userId, // This is the user who manages billing
            });
        }

        // ALWAYS create a checkout with a stripeCustomerId
        let checkout;
        try {
            checkout = await stripe.checkout.sessions.create({
                customer: stripeCustomerId,
                success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
                line_items: [
                    {
                        price: priceId,
                        quantity: seats, // Seat-based billing
                    },
                ],
                subscription_data: {
                    trial_period_days: TRIAL_PERIOD_DAYS,
                },
                mode: "subscription",
                allow_promotion_codes: true,
                billing_address_collection: "auto",
                metadata: {
                    organizationId: orgId,
                    ownerId: userId,
                    planType: "team",
                },
            });
        } catch (error: any) {
            // If customer doesn't exist in Stripe, create a new one
            if (error?.code === 'resource_missing' || error?.message?.includes('No such customer')) {
                console.log(`[STRIPE CHECKOUT ORG] Customer ${stripeCustomerId} not found in Stripe, creating new customer`);

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

                // Update Redis with new customer ID
                await redis.set(`stripe:org:${orgId}`, newCustomer.id);
                stripeCustomerId = newCustomer.id;

                // Update/create mapping in Convex
                await convex.mutation(api.plans.createPlanMapping, {
                    ownerType: "org",
                    ownerId: orgId, // This is the organizationId
                    stripeCustomerId: newCustomer.id,
                    seats,
                    billingOwnerId: userId, // This is the user who manages billing
                });

                // Retry checkout creation with new customer
                checkout = await stripe.checkout.sessions.create({
                    customer: stripeCustomerId,
                    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
                    line_items: [
                        {
                            price: priceId,
                            quantity: seats,
                        },
                    ],
                    subscription_data: {
                        trial_period_days: TRIAL_PERIOD_DAYS,
                    },
                    mode: "subscription",
                    allow_promotion_codes: true,
                    billing_address_collection: "auto",
                    metadata: {
                        organizationId: orgId,
                        ownerId: userId,
                        planType: "team",
                    },
                });
            } else {
                throw error;
            }
        }

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
