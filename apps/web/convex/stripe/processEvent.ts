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

    return "pro"; // Default to pro for unknown price IDs
}

/**
 * Helper: Get subscription data from Stripe subscription object
 */
function extractSubscriptionData(subscription: Stripe.Subscription) {
    const seats = subscription.items.data[0]?.quantity ?? 1;
    const priceId = subscription.items.data[0]?.price.id;

    // Determine the correct period end date based on subscription status
    let currentPeriodEnd: number;

    if (subscription.status === "trialing" && subscription.trial_end) {
        // If on trial, use trial end date
        currentPeriodEnd = subscription.trial_end;
    } else {
        // Fallback: calculate from start date and interval
        const interval = subscription.items.data[0]?.price.recurring?.interval;
        const intervalCount = subscription.items.data[0]?.price.recurring?.interval_count ?? 1;
        const startDate = subscription.start_date;

        // Calculate end date based on interval
        const startMs = startDate * 1000;
        let endMs: number;

        switch (interval) {
            case "month":
                endMs = new Date(startMs).setMonth(new Date(startMs).getMonth() + intervalCount);
                break;
            case "year":
                endMs = new Date(startMs).setFullYear(new Date(startMs).getFullYear() + intervalCount);
                break;
            case "week":
                endMs = startMs + (intervalCount * 7 * 24 * 60 * 60 * 1000);
                break;
            case "day":
                endMs = startMs + (intervalCount * 24 * 60 * 60 * 1000);
                break;
            default:
                // Default to 1 month if interval is unknown
                endMs = new Date(startMs).setMonth(new Date(startMs).getMonth() + 1);
        }

        currentPeriodEnd = Math.floor(endMs / 1000);
    }

    const result = {
        subscriptionId: subscription.id,
        status: subscription.status,
        priceId,
        currentPeriodStart: subscription.start_date,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        seats,
        trialEnd: subscription.trial_end ?? null, // Add trial_end explicitly
    };

    console.log(`[STRIPE DEBUG] extractSubscriptionData - status: ${subscription.status}, trial_end: ${subscription.trial_end}, returning trialEnd: ${result.trialEnd}`);

    return result;
}

/**
 * Action: Process Stripe webhook events with event-specific logic
 */
export const processStripeEvent = internalAction({
    args: {
        event: v.string(), // JSON stringified Stripe event
    },
    handler: async (ctx, args) => {
        const event = JSON.parse(args.event) as Stripe.Event;

        console.log(`[STRIPE WEBHOOK] Processing event ${event.type}`);

        // Route to specific handler based on event type
        switch (event.type) {
            // ============================================
            // CHECKOUT EVENTS
            // ============================================
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                // Check payment status
                if (session.payment_status !== "paid") {
                    console.warn(`[STRIPE WEBHOOK] Checkout session payment not successful: ${session.payment_status}`);

                    // Send error notification to user if we have userId
                    const metadata = session.metadata || {};
                    if (metadata.userId) {
                        await ctx.runMutation(internal.stripe.processEvent.handleCheckoutFailed, {
                            userId: metadata.userId,
                            organizationId: metadata.organizationId ?? null,
                            paymentStatus: session.payment_status ?? "unknown",
                            sessionId: session.id,
                        });
                    }
                    return;
                }

                if (!session.subscription || typeof session.customer !== "string") {
                    console.warn("[STRIPE WEBHOOK] Checkout session missing subscription or customer");
                    return;
                }

                // Fetch the full subscription details
                const subscription = await stripe.subscriptions.retrieve(
                    session.subscription as string,
                    { expand: ["default_payment_method"] }
                );

                const customerId = session.customer;
                const subData = extractSubscriptionData(subscription);

                // Get payment method from subscription
                const paymentMethod =
                    subscription.default_payment_method &&
                    typeof subscription.default_payment_method !== "string"
                        ? {
                            brand: subscription.default_payment_method.card?.brand ?? null,
                            last4: subscription.default_payment_method.card?.last4 ?? null,
                        }
                        : null;

                // Get metadata from session
                const metadata = session.metadata || {};

                await ctx.runMutation(internal.stripe.processEvent.handleCheckoutCompleted, {
                    customerId,
                    subscriptionId: subData.subscriptionId,
                    status: subData.status,
                    priceId: subData.priceId ?? null,
                    currentPeriodStart: subData.currentPeriodStart,
                    currentPeriodEnd: subData.currentPeriodEnd,
                    cancelAtPeriodEnd: subData.cancelAtPeriodEnd,
                    seats: subData.seats,
                    paymentMethod,
                    trialEnd: subData.trialEnd,
                    userId: metadata.userId ?? null,
                    organizationId: metadata.organizationId ?? null,
                    ownerId: metadata.ownerId ?? null,
                });
                break;
            }

            // ============================================
            // SUBSCRIPTION LIFECYCLE EVENTS
            // ============================================
            case "customer.subscription.created": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                // Validate the plan that was created by checkout.session.completed
                await ctx.runMutation(internal.stripe.processEvent.handleSubscriptionCreatedValidation, {
                    customerId,
                    subscriptionId: subscription.id,
                });
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const subData = extractSubscriptionData(subscription);

                // Get payment method if it changed
                const fullSub = await stripe.subscriptions.retrieve(subscription.id, {
                    expand: ["default_payment_method"],
                });

                const paymentMethod =
                    fullSub.default_payment_method &&
                    typeof fullSub.default_payment_method !== "string"
                        ? {
                            brand: fullSub.default_payment_method.card?.brand ?? null,
                            last4: fullSub.default_payment_method.card?.last4 ?? null,
                        }
                        : null;

                await ctx.runMutation(internal.stripe.processEvent.handleSubscriptionUpdated, {
                    customerId,
                    subscriptionId: subData.subscriptionId,
                    status: subData.status,
                    priceId: subData.priceId ?? null,
                    currentPeriodStart: subData.currentPeriodStart,
                    currentPeriodEnd: subData.currentPeriodEnd,
                    cancelAtPeriodEnd: subData.cancelAtPeriodEnd,
                    seats: subData.seats,
                    paymentMethod,
                });
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                await ctx.runMutation(internal.stripe.processEvent.handleSubscriptionDeleted, {
                    customerId,
                    subscriptionId: subscription.id,
                });
                break;
            }

            case "customer.subscription.paused": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                await ctx.runMutation(internal.stripe.processEvent.handleSubscriptionPaused, {
                    customerId,
                    subscriptionId: subscription.id,
                    status: subscription.status,
                });
                break;
            }

            case "customer.subscription.resumed": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const subData = extractSubscriptionData(subscription);

                await ctx.runMutation(internal.stripe.processEvent.handleSubscriptionResumed, {
                    customerId,
                    subscriptionId: subData.subscriptionId,
                    status: subData.status,
                    currentPeriodStart: subData.currentPeriodStart,
                    currentPeriodEnd: subData.currentPeriodEnd,
                });
                break;
            }

            case "customer.subscription.pending_update_applied": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const subData = extractSubscriptionData(subscription);

                await ctx.runMutation(internal.stripe.processEvent.handleSubscriptionPendingUpdateApplied, {
                    customerId,
                    subscriptionId: subData.subscriptionId,
                    priceId: subData.priceId ?? null,
                    seats: subData.seats,
                });
                break;
            }

            case "customer.subscription.pending_update_expired": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                await ctx.runMutation(internal.stripe.processEvent.handleSubscriptionPendingUpdateExpired, {
                    customerId,
                    subscriptionId: subscription.id,
                });
                break;
            }

            case "customer.subscription.trial_will_end": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                await ctx.runMutation(internal.stripe.processEvent.handleSubscriptionTrialWillEnd, {
                    customerId,
                    subscriptionId: subscription.id,
                    trialEnd: subscription.trial_end ?? null,
                });
                break;
            }

            // ============================================
            // INVOICE EVENTS
            // ============================================
            case "invoice.paid": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;
                const subscription = (invoice as any).subscription;
                const subscriptionId = typeof subscription === "string"
                    ? subscription
                    : subscription?.id ?? null;

                await ctx.runMutation(internal.stripe.processEvent.handleInvoicePaid, {
                    customerId,
                    invoiceId: invoice.id,
                    subscriptionId,
                    amountPaid: invoice.amount_paid,
                    periodStart: invoice.period_start,
                    periodEnd: invoice.period_end,
                    invoiceUrl: invoice.hosted_invoice_url ?? invoice.invoice_pdf ?? null,
                    invoiceNumber: invoice.number ?? null,
                });
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                await ctx.runMutation(internal.stripe.processEvent.handleInvoicePaymentFailed, {
                    customerId,
                    invoiceId: invoice.id,
                    attemptCount: invoice.attempt_count,
                });
                break;
            }

            case "invoice.payment_action_required": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                await ctx.runMutation(internal.stripe.processEvent.handleInvoicePaymentActionRequired, {
                    customerId,
                    invoiceId: invoice.id,
                    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
                });
                break;
            }

            case "invoice.upcoming": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                await ctx.runMutation(internal.stripe.processEvent.handleInvoiceUpcoming, {
                    customerId,
                    amountDue: invoice.amount_due,
                    periodStart: invoice.period_start,
                    periodEnd: invoice.period_end,
                });
                break;
            }

            case "invoice.marked_uncollectible": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                await ctx.runMutation(internal.stripe.processEvent.handleInvoiceMarkedUncollectible, {
                    customerId,
                    invoiceId: invoice.id,
                });
                break;
            }

            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                await ctx.runMutation(internal.stripe.processEvent.handleInvoicePaymentSucceeded, {
                    customerId,
                    invoiceId: invoice.id,
                    amountPaid: invoice.amount_paid,
                });
                break;
            }

            // ============================================
            // PAYMENT INTENT EVENTS
            // ============================================
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const customerId = paymentIntent.customer as string | null;

                if (customerId) {
                    await ctx.runMutation(internal.stripe.processEvent.handlePaymentIntentSucceeded, {
                        customerId,
                        paymentIntentId: paymentIntent.id,
                        amount: paymentIntent.amount,
                    });
                }
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const customerId = paymentIntent.customer as string | null;

                if (customerId) {
                    await ctx.runMutation(internal.stripe.processEvent.handlePaymentIntentFailed, {
                        customerId,
                        paymentIntentId: paymentIntent.id,
                        amount: paymentIntent.amount,
                        lastPaymentError: paymentIntent.last_payment_error?.message ?? null,
                    });
                }
                break;
            }

            case "payment_intent.canceled": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const customerId = paymentIntent.customer as string | null;

                if (customerId) {
                    await ctx.runMutation(internal.stripe.processEvent.handlePaymentIntentCanceled, {
                        customerId,
                        paymentIntentId: paymentIntent.id,
                    });
                }
                break;
            }

            default:
                console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
        }
    },
});

// ============================================
// HELPER FUNCTIONS FOR MUTATIONS
// ============================================

/**
 * Helper: Find plan by customer ID
 */
async function findPlanByCustomerId(ctx: any, customerId: string) {
    const userPlan = await ctx.db
        .query("user_plans")
        .withIndex("by_stripe_customer_id", (q: any) =>
            q.eq("stripeCustomerId", customerId)
        )
        .first();

    const orgPlan = await ctx.db
        .query("org_plans")
        .withIndex("by_stripe_customer_id", (q: any) =>
            q.eq("stripeCustomerId", customerId)
        )
        .first();

    return { userPlan, orgPlan };
}

/**
 * Helper: Create a system notification for billing issues
 */
async function createBillingNotification(
    ctx: any,
    recipientId: string,
    type: string,
    title: string,
    message: string
) {
    await ctx.db.insert("notifications", {
        recipientId,
        senderId: "system", // System-generated notification
        type,
        title,
        message,
        isRead: false,
        createdAt: new Date().toISOString(),
    });
}

// ============================================
// CHECKOUT MUTATIONS
// ============================================

export const handleCheckoutFailed = internalMutation({
    args: {
        userId: v.string(),
        organizationId: v.union(v.string(), v.null()),
        paymentStatus: v.string(),
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const recipientId = args.organizationId
            ? (await ctx.db
                .query("org_plans")
                .withIndex("by_organization_id", (q: any) => q.eq("organizationId", args.organizationId))
                .first())?.ownerId ?? args.userId
            : args.userId;

        let message: string;
        switch (args.paymentStatus) {
            case "unpaid":
                message = "Your payment failed. Please update your payment method and try again.";
                break;
            case "no_payment_required":
                message = "No payment was required but the subscription setup failed. Please contact support.";
                break;
            default:
                message = `Your checkout was not completed (status: ${args.paymentStatus}). Please try again or contact support.`;
        }

        await createBillingNotification(
            ctx,
            recipientId,
            "checkout_failed",
            "Checkout Failed",
            message
        );

        console.log(`[STRIPE] Checkout failed for user ${args.userId}, payment status: ${args.paymentStatus}`);
    },
});

export const handleCheckoutCompleted = internalMutation({
    args: {
        customerId: v.string(),
        subscriptionId: v.string(),
        status: v.string(),
        priceId: v.union(v.string(), v.null()),
        currentPeriodStart: v.number(),
        currentPeriodEnd: v.number(),
        cancelAtPeriodEnd: v.boolean(),
        seats: v.number(),
        paymentMethod: v.union(
            v.object({
                brand: v.union(v.string(), v.null()),
                last4: v.union(v.string(), v.null()),
            }),
            v.null()
        ),
        trialEnd: v.union(v.number(), v.null()),
        userId: v.union(v.string(), v.null()),
        organizationId: v.union(v.string(), v.null()),
        ownerId: v.union(v.string(), v.null()),
    },
    handler: async (ctx, args) => {
        if (!args.priceId) {
            console.warn(`[STRIPE] Checkout completed but no priceId found`);
            return;
        }

        const planType = getPlanTypeFromPriceId(args.priceId);
        const isOnTrial = args.status === "trialing";
        const trialEndsAt = args.trialEnd ? args.trialEnd * 1000 : undefined;

        console.log(`[STRIPE DEBUG] Checkout completed - status: ${args.status}, trialEnd: ${args.trialEnd}, trialEndsAt: ${trialEndsAt}, isOnTrial: ${isOnTrial}`);

        // Determine if this is a team plan based on priceId
        const isTeamPlan = args.priceId === process.env.STRIPE_TEAM_PRICE_ID;

        const now = Date.now();

        if (isTeamPlan) {
            // CREATE organization plan
            if (!args.organizationId || !args.ownerId) {
                console.error(`[STRIPE] Team checkout completed but missing organizationId or ownerId in metadata`);
                return;
            }

            // Check for existing plan (including soft-deleted)
            const existingPlan = await ctx.db
                .query("org_plans")
                .withIndex("by_organization_id", (q: any) => q.eq("organizationId", args.organizationId))
                .first();

            if (existingPlan) {
                // Update existing plan instead of creating duplicate
                await ctx.db.patch(existingPlan._id, {
                    stripeCustomerId: args.customerId,
                    subscriptionId: args.subscriptionId,
                    status: args.status,
                    priceId: args.priceId,
                    planType: "team",
                    seats: args.seats,
                    currentPeriodStart: args.currentPeriodStart * 1000,
                    currentPeriodEnd: args.currentPeriodEnd * 1000,
                    cancelAtPeriodEnd: args.cancelAtPeriodEnd,
                    paymentMethod: args.paymentMethod ?? undefined,
                    isOnTrial,
                    trialEndsAt,
                    isValidated: false, // Will be validated by subscription.created
                    isDeleted: false, // Reactivate if was soft-deleted
                    updatedAt: now,
                });
                console.log(`[STRIPE] Updated existing org plan ${existingPlan._id} for organization ${args.organizationId}`);
            } else {
                const planId = await ctx.db.insert("org_plans", {
                    organizationId: args.organizationId,
                    stripeCustomerId: args.customerId,
                    subscriptionId: args.subscriptionId,
                    status: args.status,
                    priceId: args.priceId,
                    planType: "team",
                    seats: args.seats,
                    currentPeriodStart: args.currentPeriodStart * 1000,
                    currentPeriodEnd: args.currentPeriodEnd * 1000,
                    cancelAtPeriodEnd: args.cancelAtPeriodEnd,
                    paymentMethod: args.paymentMethod ?? undefined,
                    isOnTrial,
                    trialEndsAt,
                    isValidated: false, // Will be validated by subscription.created
                    ownerId: args.ownerId,
                    createdAt: now,
                    updatedAt: now,
                });
                console.log(`[STRIPE] Created org plan ${planId} for organization ${args.organizationId}`);
            }
        } else {
            // CREATE user plan
            if (!args.userId) {
                console.error(`[STRIPE] Pro checkout completed but missing userId in metadata`);
                return;
            }

            // Check for existing plan (including soft-deleted)
            const existingPlan = await ctx.db
                .query("user_plans")
                .withIndex("by_external_id", (q: any) => q.eq("externalId", args.userId))
                .first();

            if (existingPlan) {
                // Update existing plan instead of creating duplicate
                await ctx.db.patch(existingPlan._id, {
                    stripeCustomerId: args.customerId,
                    subscriptionId: args.subscriptionId,
                    status: args.status,
                    priceId: args.priceId,
                    planType,
                    currentPeriodStart: args.currentPeriodStart * 1000,
                    currentPeriodEnd: args.currentPeriodEnd * 1000,
                    cancelAtPeriodEnd: args.cancelAtPeriodEnd,
                    paymentMethod: args.paymentMethod ?? undefined,
                    isOnTrial,
                    trialEndsAt,
                    isValidated: false, // Will be validated by subscription.created
                    isDeleted: false, // Reactivate if was soft-deleted
                    updatedAt: now,
                });
                console.log(`[STRIPE] Updated existing user plan ${existingPlan._id} for user ${args.userId}`);
            } else {
                const planId = await ctx.db.insert("user_plans", {
                    externalId: args.userId,
                    stripeCustomerId: args.customerId,
                    subscriptionId: args.subscriptionId,
                    status: args.status,
                    priceId: args.priceId,
                    planType,
                    currentPeriodStart: args.currentPeriodStart * 1000,
                    currentPeriodEnd: args.currentPeriodEnd * 1000,
                    cancelAtPeriodEnd: args.cancelAtPeriodEnd,
                    paymentMethod: args.paymentMethod ?? undefined,
                    isOnTrial,
                    trialEndsAt,
                    isValidated: false, // Will be validated by subscription.created
                    createdAt: now,
                    updatedAt: now,
                });
                console.log(`[STRIPE] Created user plan ${planId} for user ${args.userId}`);
            }
        }
    },
});

// ============================================
// SUBSCRIPTION LIFECYCLE MUTATIONS
// ============================================

export const handleSubscriptionCreatedValidation = internalMutation({
    args: {
        customerId: v.string(),
        subscriptionId: v.string(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (userPlan) {
            // Validate that the subscription ID matches
            if (userPlan.subscriptionId === args.subscriptionId) {
                await ctx.db.patch(userPlan._id, {
                    isValidated: true,
                    updatedAt: Date.now(),
                });
                console.log(`[STRIPE] Validated user plan ${userPlan._id} for user ${userPlan.externalId}`);
            } else {
                console.warn(`[STRIPE] Subscription ID mismatch for user plan. Expected: ${userPlan.subscriptionId}, Got: ${args.subscriptionId}`);
            }
        } else if (orgPlan) {
            // Validate that the subscription ID matches
            if (orgPlan.subscriptionId === args.subscriptionId) {
                await ctx.db.patch(orgPlan._id, {
                    isValidated: true,
                    updatedAt: Date.now(),
                });
                console.log(`[STRIPE] Validated org plan ${orgPlan._id} for organization ${orgPlan.organizationId}`);
            } else {
                console.warn(`[STRIPE] Subscription ID mismatch for org plan. Expected: ${orgPlan.subscriptionId}, Got: ${args.subscriptionId}`);
            }
        } else {
            console.warn(`[STRIPE] Subscription created but no plan found for customer ${args.customerId}. This might be a direct subscription creation.`);
        }
    },
});

export const handleSubscriptionUpdated = internalMutation({
    args: {
        customerId: v.string(),
        subscriptionId: v.string(),
        status: v.string(),
        priceId: v.union(v.string(), v.null()),
        currentPeriodStart: v.number(),
        currentPeriodEnd: v.number(),
        cancelAtPeriodEnd: v.boolean(),
        seats: v.number(),
        paymentMethod: v.union(
            v.object({
                brand: v.union(v.string(), v.null()),
                last4: v.union(v.string(), v.null()),
            }),
            v.null()
        ),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (!userPlan && !orgPlan) {
            console.warn(`[STRIPE] Subscription updated but no plan found for customer ${args.customerId}`);
            return;
        }

        const planType = args.priceId ? getPlanTypeFromPriceId(args.priceId) : "free";
        const isOnTrial = args.status === "trialing";
        const trialEndsAt = isOnTrial ? args.currentPeriodEnd * 1000 : undefined;

        const updateData = {
            subscriptionId: args.subscriptionId,
            status: args.status,
            priceId: args.priceId ?? undefined,
            currentPeriodStart: args.currentPeriodStart * 1000,
            currentPeriodEnd: args.currentPeriodEnd * 1000,
            cancelAtPeriodEnd: args.cancelAtPeriodEnd,
            paymentMethod: args.paymentMethod ?? undefined,
            isOnTrial,
            trialEndsAt,
            updatedAt: Date.now(),
        };

        // Determine if this is a team plan based on priceId
        const isTeamPlan = args.priceId === process.env.STRIPE_TEAM_PRICE_ID;

        if (isTeamPlan && orgPlan) {
            // Update organization plan
            await ctx.db.patch(orgPlan._id, {
                ...updateData,
                planType: "team",
                seats: args.seats,
            });
            console.log(`[STRIPE] Subscription updated for org plan ${orgPlan.organizationId}`);
        } else if (!isTeamPlan && userPlan) {
            // Update user plan
            await ctx.db.patch(userPlan._id, {
                ...updateData,
                planType,
            });
            console.log(`[STRIPE] Subscription updated for user plan ${userPlan.externalId}`);
        } else {
            // Fallback: update whatever plan exists (for backwards compatibility)
            if (userPlan) {
                await ctx.db.patch(userPlan._id, {
                    ...updateData,
                    planType,
                });
                console.log(`[STRIPE] Subscription updated for user plan ${userPlan.externalId} (fallback)`);
            } else if (orgPlan) {
                await ctx.db.patch(orgPlan._id, {
                    ...updateData,
                    planType: "team",
                    seats: args.seats,
                });
                console.log(`[STRIPE] Subscription updated for org plan ${orgPlan.organizationId} (fallback)`);
            }
        }
    },
});

export const handleSubscriptionDeleted = internalMutation({
    args: {
        customerId: v.string(),
        subscriptionId: v.string(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (!userPlan && !orgPlan) {
            console.warn(`[STRIPE] Subscription deleted but no plan found for customer ${args.customerId}`);
            return;
        }

        if (userPlan) {
            // Soft delete - move to free plan but keep the record
            await ctx.db.patch(userPlan._id, {
                subscriptionId: undefined,
                status: "none",
                priceId: undefined,
                planType: "free",
                cancelAtPeriodEnd: false,
                isOnTrial: false,
                trialEndsAt: undefined,
                isDeleted: false, // Keep as active, just downgraded to free
                updatedAt: Date.now(),
            });
            console.log(`[STRIPE] Subscription deleted - moved user plan to free ${userPlan.externalId}`);
        } else if (orgPlan) {
            // Soft delete - disable the org plan but keep the record
            await ctx.db.patch(orgPlan._id, {
                subscriptionId: undefined,
                status: "none",
                priceId: undefined,
                cancelAtPeriodEnd: false,
                isOnTrial: false,
                trialEndsAt: undefined,
                isDeleted: true, // Disable org plans when subscription deleted
                updatedAt: Date.now(),
            });
            console.log(`[STRIPE] Subscription deleted - disabled org plan ${orgPlan.organizationId}`);
        }
    },
});

export const handleSubscriptionPaused = internalMutation({
    args: {
        customerId: v.string(),
        subscriptionId: v.string(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (userPlan) {
            await ctx.db.patch(userPlan._id, {
                status: args.status,
                updatedAt: Date.now(),
            });
            console.log(`[STRIPE] Subscription paused for user plan ${userPlan.externalId}`);
        } else if (orgPlan) {
            await ctx.db.patch(orgPlan._id, {
                status: args.status,
                updatedAt: Date.now(),
            });
            console.log(`[STRIPE] Subscription paused for org plan ${orgPlan.organizationId}`);
        }
    },
});

export const handleSubscriptionResumed = internalMutation({
    args: {
        customerId: v.string(),
        subscriptionId: v.string(),
        status: v.string(),
        currentPeriodStart: v.number(),
        currentPeriodEnd: v.number(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (userPlan) {
            await ctx.db.patch(userPlan._id, {
                status: args.status,
                currentPeriodStart: args.currentPeriodStart * 1000,
                currentPeriodEnd: args.currentPeriodEnd * 1000,
                updatedAt: Date.now(),
            });
            console.log(`[STRIPE] Subscription resumed for user plan ${userPlan.externalId}`);
        } else if (orgPlan) {
            await ctx.db.patch(orgPlan._id, {
                status: args.status,
                currentPeriodStart: args.currentPeriodStart * 1000,
                currentPeriodEnd: args.currentPeriodEnd * 1000,
                updatedAt: Date.now(),
            });
            console.log(`[STRIPE] Subscription resumed for org plan ${orgPlan.organizationId}`);
        }
    },
});

export const handleSubscriptionPendingUpdateApplied = internalMutation({
    args: {
        customerId: v.string(),
        subscriptionId: v.string(),
        priceId: v.union(v.string(), v.null()),
        seats: v.number(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        const planType = args.priceId ? getPlanTypeFromPriceId(args.priceId) : "free";

        if (userPlan) {
            await ctx.db.patch(userPlan._id, {
                priceId: args.priceId ?? undefined,
                planType,
                updatedAt: Date.now(),
            });
            console.log(`[STRIPE] Pending update applied for user plan ${userPlan.externalId}`);
        } else if (orgPlan) {
            await ctx.db.patch(orgPlan._id, {
                priceId: args.priceId ?? undefined,
                planType: "team",
                seats: args.seats,
                updatedAt: Date.now(),
            });
            console.log(`[STRIPE] Pending update applied for org plan ${orgPlan.organizationId}`);
        }
    },
});

export const handleSubscriptionPendingUpdateExpired = internalMutation({
    args: {
        customerId: v.string(),
        subscriptionId: v.string(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (userPlan) {
            console.log(`[STRIPE] Pending update expired for user plan ${userPlan.externalId}`);
        } else if (orgPlan) {
            console.log(`[STRIPE] Pending update expired for org plan ${orgPlan.organizationId}`);
        }
        // No database changes needed - just log it
    },
});

export const handleSubscriptionTrialWillEnd = internalMutation({
    args: {
        customerId: v.string(),
        subscriptionId: v.string(),
        trialEnd: v.union(v.number(), v.null()),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (userPlan) {
            console.log(`[STRIPE] Trial ending soon for user plan ${userPlan.externalId}`);
        } else if (orgPlan) {
            console.log(`[STRIPE] Trial ending soon for org plan ${orgPlan.organizationId}`);
        }
        // Can be used to send notification emails
    },
});

// ============================================
// INVOICE MUTATIONS
// ============================================

export const handleInvoicePaid = internalMutation({
    args: {
        customerId: v.string(),
        invoiceId: v.string(),
        subscriptionId: v.union(v.string(), v.null()),
        amountPaid: v.number(),
        periodStart: v.number(),
        periodEnd: v.number(),
        invoiceUrl: v.union(v.string(), v.null()),
        invoiceNumber: v.union(v.string(), v.null()),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        const amountInDollars = (args.amountPaid / 100).toFixed(2);
        const invoiceText = args.invoiceNumber ? `Invoice #${args.invoiceNumber}` : "Your invoice";

        let message = `Payment of $${amountInDollars} received. Thank you for your subscription!`;
        if (args.invoiceUrl) {
            message += ` View your invoice: ${args.invoiceUrl}`;
        }

        if (userPlan) {
            await ctx.db.patch(userPlan._id, {
                currentPeriodStart: args.periodStart * 1000,
                currentPeriodEnd: args.periodEnd * 1000,
                status: "active", // Invoice paid means subscription is active
                error: undefined, // Clear any previous errors
                updatedAt: Date.now(),
            });

            await createBillingNotification(
                ctx,
                userPlan.externalId,
                "invoice_paid",
                `${invoiceText} Paid`,
                message
            );

            console.log(`[STRIPE] Invoice paid for user plan ${userPlan.externalId}`);
        } else if (orgPlan) {
            await ctx.db.patch(orgPlan._id, {
                currentPeriodStart: args.periodStart * 1000,
                currentPeriodEnd: args.periodEnd * 1000,
                status: "active",
                error: undefined, // Clear any previous errors
                updatedAt: Date.now(),
            });

            await createBillingNotification(
                ctx,
                orgPlan.ownerId,
                "invoice_paid",
                `Organization ${invoiceText} Paid`,
                message
            );

            console.log(`[STRIPE] Invoice paid for org plan ${orgPlan.organizationId}`);
        }
    },
});

export const handleInvoicePaymentFailed = internalMutation({
    args: {
        customerId: v.string(),
        invoiceId: v.string(),
        attemptCount: v.number(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        const errorData = {
            type: "payment_failed",
            message: `Payment failed (attempt ${args.attemptCount}). Please update your payment method.`,
            timestamp: Date.now(),
            invoiceId: args.invoiceId,
        };

        if (userPlan) {
            await ctx.db.patch(userPlan._id, {
                status: "past_due",
                error: errorData,
                updatedAt: Date.now(),
            });

            await createBillingNotification(
                ctx,
                userPlan.externalId,
                "billing_error",
                "Payment Failed",
                `Your payment failed (attempt ${args.attemptCount}). Please update your payment method to avoid service interruption.`
            );

            console.log(`[STRIPE] Invoice payment failed for user plan ${userPlan.externalId} (attempt ${args.attemptCount})`);
        } else if (orgPlan) {
            await ctx.db.patch(orgPlan._id, {
                status: "past_due",
                error: errorData,
                updatedAt: Date.now(),
            });

            await createBillingNotification(
                ctx,
                orgPlan.ownerId,
                "billing_error",
                "Organization Payment Failed",
                `Payment failed for your organization (attempt ${args.attemptCount}). Please update your payment method to avoid service interruption.`
            );

            console.log(`[STRIPE] Invoice payment failed for org plan ${orgPlan.organizationId} (attempt ${args.attemptCount})`);
        }
    },
});

export const handleInvoicePaymentActionRequired = internalMutation({
    args: {
        customerId: v.string(),
        invoiceId: v.string(),
        hostedInvoiceUrl: v.union(v.string(), v.null()),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        const errorData = {
            type: "payment_action_required",
            message: "Payment requires additional authentication. Please complete the payment process.",
            timestamp: Date.now(),
            invoiceId: args.invoiceId,
            invoiceUrl: args.hostedInvoiceUrl ?? undefined,
        };

        if (userPlan) {
            await ctx.db.patch(userPlan._id, {
                error: errorData,
                updatedAt: Date.now(),
            });

            const message = args.hostedInvoiceUrl
                ? `Payment requires additional authentication. Please complete the payment: ${args.hostedInvoiceUrl}`
                : "Payment requires additional authentication. Please check your payment method.";

            await createBillingNotification(
                ctx,
                userPlan.externalId,
                "billing_action_required",
                "Payment Action Required",
                message
            );

            console.log(`[STRIPE] Payment action required for user plan ${userPlan.externalId}`);
        } else if (orgPlan) {
            await ctx.db.patch(orgPlan._id, {
                error: errorData,
                updatedAt: Date.now(),
            });

            const message = args.hostedInvoiceUrl
                ? `Payment for your organization requires additional authentication. Please complete the payment: ${args.hostedInvoiceUrl}`
                : "Payment for your organization requires additional authentication. Please check your payment method.";

            await createBillingNotification(
                ctx,
                orgPlan.ownerId,
                "billing_action_required",
                "Organization Payment Action Required",
                message
            );

            console.log(`[STRIPE] Payment action required for org plan ${orgPlan.organizationId}`);
        }
    },
});

export const handleInvoiceUpcoming = internalMutation({
    args: {
        customerId: v.string(),
        amountDue: v.number(),
        periodStart: v.number(),
        periodEnd: v.number(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (userPlan) {
            console.log(`[STRIPE] Upcoming invoice for user plan ${userPlan.externalId}: $${args.amountDue / 100}`);
        } else if (orgPlan) {
            console.log(`[STRIPE] Upcoming invoice for org plan ${orgPlan.organizationId}: $${args.amountDue / 100}`);
        }
        // Can be used to send notification emails
    },
});

export const handleInvoiceMarkedUncollectible = internalMutation({
    args: {
        customerId: v.string(),
        invoiceId: v.string(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        const errorData = {
            type: "uncollectible",
            message: "Invoice marked as uncollectible. Your subscription may be canceled.",
            timestamp: Date.now(),
            invoiceId: args.invoiceId,
        };

        if (userPlan) {
            await ctx.db.patch(userPlan._id, {
                status: "unpaid",
                error: errorData,
                updatedAt: Date.now(),
            });

            await createBillingNotification(
                ctx,
                userPlan.externalId,
                "billing_error",
                "Invoice Uncollectible",
                "Your invoice has been marked as uncollectible. Please contact support or update your payment method immediately to avoid service cancellation."
            );

            console.log(`[STRIPE] Invoice marked uncollectible for user plan ${userPlan.externalId}`);
        } else if (orgPlan) {
            await ctx.db.patch(orgPlan._id, {
                status: "unpaid",
                error: errorData,
                updatedAt: Date.now(),
            });

            await createBillingNotification(
                ctx,
                orgPlan.ownerId,
                "billing_error",
                "Organization Invoice Uncollectible",
                "Your organization's invoice has been marked as uncollectible. Please contact support or update your payment method immediately to avoid service cancellation."
            );

            console.log(`[STRIPE] Invoice marked uncollectible for org plan ${orgPlan.organizationId}`);
        }
    },
});

export const handleInvoicePaymentSucceeded = internalMutation({
    args: {
        customerId: v.string(),
        invoiceId: v.string(),
        amountPaid: v.number(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (userPlan) {
            await ctx.db.patch(userPlan._id, {
                status: "active",
                error: undefined, // Clear any previous errors
                updatedAt: Date.now(),
            });
            console.log(`[STRIPE] Invoice payment succeeded for user plan ${userPlan.externalId}`);
        } else if (orgPlan) {
            await ctx.db.patch(orgPlan._id, {
                status: "active",
                error: undefined, // Clear any previous errors
                updatedAt: Date.now(),
            });
            console.log(`[STRIPE] Invoice payment succeeded for org plan ${orgPlan.organizationId}`);
        }
    },
});

// ============================================
// PAYMENT INTENT MUTATIONS
// ============================================

export const handlePaymentIntentSucceeded = internalMutation({
    args: {
        customerId: v.string(),
        paymentIntentId: v.string(),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (userPlan) {
            console.log(`[STRIPE] Payment intent succeeded for user plan ${userPlan.externalId}: $${args.amount / 100}`);
        } else if (orgPlan) {
            console.log(`[STRIPE] Payment intent succeeded for org plan ${orgPlan.organizationId}: $${args.amount / 100}`);
        }
        // Usually handled by invoice.paid, this is for additional tracking
    },
});

export const handlePaymentIntentFailed = internalMutation({
    args: {
        customerId: v.string(),
        paymentIntentId: v.string(),
        amount: v.number(),
        lastPaymentError: v.union(v.string(), v.null()),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (userPlan) {
            console.log(`[STRIPE] Payment intent failed for user plan ${userPlan.externalId}: ${args.lastPaymentError ?? "Unknown error"}`);
        } else if (orgPlan) {
            console.log(`[STRIPE] Payment intent failed for org plan ${orgPlan.organizationId}: ${args.lastPaymentError ?? "Unknown error"}`);
        }
        // Can be used to send notification emails
    },
});

export const handlePaymentIntentCanceled = internalMutation({
    args: {
        customerId: v.string(),
        paymentIntentId: v.string(),
    },
    handler: async (ctx, args) => {
        const { userPlan, orgPlan } = await findPlanByCustomerId(ctx, args.customerId);

        if (userPlan) {
            console.log(`[STRIPE] Payment intent canceled for user plan ${userPlan.externalId}`);
        } else if (orgPlan) {
            console.log(`[STRIPE] Payment intent canceled for org plan ${orgPlan.organizationId}`);
        }
    },
});
