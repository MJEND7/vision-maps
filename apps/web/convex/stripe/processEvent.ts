import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-09-30.clover",
});


/**
 * Determine plan type from Stripe price ID
 */
function getPlanTypeFromPriceId(priceId: string): "free" | "pro" | "team" {
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
    const teamPriceId = process.env.STRIPE_TEAM_PRICE_ID;

    if (priceId === proPriceId) return "pro";
    if (priceId === teamPriceId) return "team";

    // Default to pro for any active subscription without a matching price ID
    // You may want to adjust this logic based on your needs
    return "pro";
}

/**
 * Fetch subscription data from Stripe and return formatted data
 */
async function fetchSubscriptionData(customerId: string): Promise<{
    status: Stripe.Subscription.Status | "none";
    subscriptionId: string | undefined;
    priceId: string | undefined;
    currentPeriodStart: number | undefined;
    currentPeriodEnd: number | undefined;
    cancelAtPeriodEnd: boolean | undefined;
    paymentMethod: { brand: string | null; last4: string | null } | undefined;
    seats: number;
}> {
    const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
        status: "all",
        expand: ["data.default_payment_method"],
    });

    if (subscriptions.data.length === 0) {
        return {
            status: "none" as const,
            subscriptionId: undefined,
            priceId: undefined,
            currentPeriodStart: undefined,
            currentPeriodEnd: undefined,
            cancelAtPeriodEnd: undefined,
            paymentMethod: undefined,
            seats: 1,
        };
    }

    const subscription = subscriptions.data[0];
    const seats = subscription.items.data[0]?.quantity ?? 1;

    return {
        status: subscription.status,
        subscriptionId: subscription.id,
        priceId: subscription.items.data[0]?.price.id ?? undefined,
        currentPeriodStart: subscription.start_date,
        currentPeriodEnd: subscription.ended_at ?? undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        paymentMethod:
            subscription.default_payment_method &&
                typeof subscription.default_payment_method !== "string"
                ? {
                    brand: subscription.default_payment_method.card?.brand ?? null,
                    last4: subscription.default_payment_method.card?.last4 ?? null,
                }
                : undefined,
        seats,
    };
}

/**
 * Action: Process Stripe webhook events (fetches from Stripe API)
 * This is called from the HTTP handler
 */
export const processStripeEvent = internalAction({
    args: {
        event: v.string(), // JSON stringified Stripe event
    },
    handler: async (ctx, args) => {
        const event = JSON.parse(args.event) as Stripe.Event;

        // All the events we track have a customerId
        const { customer: customerId } = event?.data?.object as {
            customer: string;
        };

        if (typeof customerId !== "string") {
            throw new Error(
                `[STRIPE WEBHOOK CONVEX] Customer ID isn't string.\nEvent type: ${event.type}`
            );
        }

        console.log(
            `[STRIPE WEBHOOK CONVEX] Processing event ${event.type} for customer ${customerId}`
        );

        // Fetch latest subscription data from Stripe (must be in action)
        const subData = await fetchSubscriptionData(customerId);

        // Call mutation to update database
        await ctx.runMutation(internal.stripe.processEvent.updatePlanFromStripeData, {
            customerId,
            subData: {
                status: subData.status,
                subscriptionId: subData.subscriptionId ?? null,
                priceId: subData.priceId ?? null,
                currentPeriodStart: subData.currentPeriodStart ?? null,
                currentPeriodEnd: subData.currentPeriodEnd ?? null,
                cancelAtPeriodEnd: subData.cancelAtPeriodEnd ?? null,
                paymentMethod: subData.paymentMethod ?? null,
                seats: subData.seats,
            },
        });
    },
});

/**
 * Mutation: Update plan in database based on fetched Stripe data
 * This is called from the action above
 */
export const updatePlanFromStripeData = internalMutation({
    args: {
        customerId: v.string(),
        subData: v.object({
            status: v.string(),
            subscriptionId: v.union(v.string(), v.null()),
            priceId: v.union(v.string(), v.null()),
            currentPeriodStart: v.union(v.number(), v.null()),
            currentPeriodEnd: v.union(v.number(), v.null()),
            cancelAtPeriodEnd: v.union(v.boolean(), v.null()),
            paymentMethod: v.union(
                v.object({
                    brand: v.union(v.string(), v.null()),
                    last4: v.union(v.string(), v.null()),
                }),
                v.null()
            ),
            seats: v.number(),
        }),
    },
    handler: async (ctx, args) => {
        const { customerId, subData } = args;

        // Check if this customer belongs to a user or org
        const userPlan = await ctx.db
            .query("user_plans")
            .withIndex("by_stripe_customer_id", (q) =>
                q.eq("stripeCustomerId", customerId)
            )
            .first();

        const orgPlan = await ctx.db
            .query("org_plans")
            .withIndex("by_stripe_customer_id", (q) =>
                q.eq("stripeCustomerId", customerId)
            )
            .first();

        if (userPlan) {
            // Update user plan
            const planType =
                subData.priceId && subData.status !== "none"
                    ? getPlanTypeFromPriceId(subData.priceId)
                    : "free";

            const isOnTrial = subData.status === "trialing";
            const trialEndsAt =
                isOnTrial && subData.currentPeriodEnd
                    ? subData.currentPeriodEnd * 1000 // Convert to milliseconds
                    : undefined;

            await ctx.db.patch(userPlan._id, {
                subscriptionId: subData.subscriptionId ?? undefined,
                status: subData.status,
                priceId: subData.priceId ?? undefined,
                planType,
                currentPeriodStart: subData.currentPeriodStart
                    ? subData.currentPeriodStart * 1000
                    : undefined,
                currentPeriodEnd: subData.currentPeriodEnd
                    ? subData.currentPeriodEnd * 1000
                    : undefined,
                cancelAtPeriodEnd: subData.cancelAtPeriodEnd ?? undefined,
                paymentMethod: subData.paymentMethod ?? undefined,
                isOnTrial,
                trialEndsAt,
                updatedAt: Date.now(),
            });

            console.log(
                `[STRIPE WEBHOOK CONVEX] Updated user plan for ${userPlan.externalId}`
            );
        } else if (orgPlan) {
            // Update org plan
            const isOnTrial = subData.status === "trialing";
            const trialEndsAt =
                isOnTrial && subData.currentPeriodEnd
                    ? subData.currentPeriodEnd * 1000
                    : undefined;

            await ctx.db.patch(orgPlan._id, {
                subscriptionId: subData.subscriptionId ?? undefined,
                status: subData.status,
                priceId: subData.priceId ?? undefined,
                planType: "team", // Org plans are always team
                seats: subData.seats,
                currentPeriodStart: subData.currentPeriodStart
                    ? subData.currentPeriodStart * 1000
                    : undefined,
                currentPeriodEnd: subData.currentPeriodEnd
                    ? subData.currentPeriodEnd * 1000
                    : undefined,
                cancelAtPeriodEnd: subData.cancelAtPeriodEnd ?? undefined,
                paymentMethod: subData.paymentMethod ?? undefined,
                isOnTrial,
                trialEndsAt,
                updatedAt: Date.now(),
            });

            console.log(
                `[STRIPE WEBHOOK CONVEX] Updated org plan for ${orgPlan.organizationId}`
            );
        } else {
            console.warn(
                `[STRIPE WEBHOOK CONVEX] Customer ${customerId} not found in user_plans or org_plans`
            );
        }
    },
});
