import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get user plan by externalId (Clerk user ID)
 */
export const getUserPlanByExternalId = query({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("user_plans")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();

    return plan;
  },
});

/**
 * Get user plan by Stripe customer ID
 */
export const getUserPlanByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("user_plans")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    return plan;
  },
});

/**
 * Create or update user plan (called from Stripe webhooks and checkout success)
 */
export const upsertUserPlan = internalMutation({
  args: {
    externalId: v.string(),
    stripeCustomerId: v.string(),
    subscriptionId: v.optional(v.string()),
    status: v.string(),
    priceId: v.optional(v.string()),
    planType: v.string(),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    paymentMethod: v.optional(
      v.object({
        brand: v.union(v.string(), v.null()),
        last4: v.union(v.string(), v.null()),
      })
    ),
    isOnTrial: v.boolean(),
    trialEndsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existingPlan = await ctx.db
      .query("user_plans")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();

    const now = Date.now();

    if (existingPlan) {
      // Update existing plan
      await ctx.db.patch(existingPlan._id, {
        stripeCustomerId: args.stripeCustomerId,
        subscriptionId: args.subscriptionId,
        status: args.status,
        priceId: args.priceId,
        planType: args.planType,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        paymentMethod: args.paymentMethod,
        isOnTrial: args.isOnTrial,
        trialEndsAt: args.trialEndsAt,
        updatedAt: now,
      });

      return existingPlan._id;
    } else {
      // Create new plan
      const planId = await ctx.db.insert("user_plans", {
        externalId: args.externalId,
        stripeCustomerId: args.stripeCustomerId,
        subscriptionId: args.subscriptionId,
        status: args.status,
        priceId: args.priceId,
        planType: args.planType,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        paymentMethod: args.paymentMethod,
        isOnTrial: args.isOnTrial,
        trialEndsAt: args.trialEndsAt,
        createdAt: now,
        updatedAt: now,
      });

      return planId;
    }
  },
});

/**
 * Create initial user plan mapping (Stripe customer to externalId)
 */
export const createUserPlanMapping = mutation({
  args: {
    externalId: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify that the authenticated user matches the externalId
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: User must be authenticated");
    }

    // Extract userId from identity (Clerk format)
    const authenticatedUserId = identity.subject;

    if (authenticatedUserId !== args.externalId) {
      throw new Error("Unauthorized: Cannot create plan mapping for another user");
    }

    const existingPlan = await ctx.db
      .query("user_plans")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();

    if (existingPlan) {
      // Just update the Stripe customer ID if needed
      if (existingPlan.stripeCustomerId !== args.stripeCustomerId) {
        await ctx.db.patch(existingPlan._id, {
          stripeCustomerId: args.stripeCustomerId,
          updatedAt: Date.now(),
        });
      }
      return existingPlan._id;
    }

    // Create a new free plan
    const now = Date.now();
    const planId = await ctx.db.insert("user_plans", {
      externalId: args.externalId,
      stripeCustomerId: args.stripeCustomerId,
      status: "none",
      planType: "free",
      isOnTrial: false,
      createdAt: now,
      updatedAt: now,
    });

    return planId;
  },
});

/**
 * Get externalId from Stripe customer ID
 */
export const getExternalIdByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("user_plans")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    return plan?.externalId ?? null;
  },
});
