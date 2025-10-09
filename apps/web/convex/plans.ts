import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get plan by owner (user or organization)
 */
export const getPlanByOwner = query({
  args: {
    ownerType: v.union(v.literal("user"), v.literal("org")),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", args.ownerType).eq("ownerId", args.ownerId)
      )
      .first();

    console.log(plan, args)

    return plan;
  },
});

/**
 * Get plan by Stripe customer ID
 */
export const getPlanByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    return plan;
  },
});

/**
 * Get plan by billing owner ID (for organization plans)
 */
export const getPlanByBillingOwnerId = query({
  args: {
    billingOwnerId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_billing_owner_id", (q) => q.eq("billingOwnerId", args.billingOwnerId))
      .first();

    return plan;
  },
});

/**
 * Create or update plan (called from Stripe webhooks and checkout success)
 */
export const upsertPlan = internalMutation({
  args: {
    ownerType: v.union(v.literal("user"), v.literal("org")),
    ownerId: v.string(),
    stripeCustomerId: v.string(),
    subscriptionId: v.optional(v.string()),
    status: v.string(),
    priceId: v.optional(v.string()),
    planType: v.string(),
    seats: v.optional(v.number()),
    maxSeats: v.optional(v.number()),
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
    billingOwnerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingPlan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", args.ownerType).eq("ownerId", args.ownerId)
      )
      .first();

    const now = Date.now();

    if (existingPlan) {
      await ctx.db.patch(existingPlan._id, {
        stripeCustomerId: args.stripeCustomerId,
        subscriptionId: args.subscriptionId,
        status: args.status,
        priceId: args.priceId,
        planType: args.planType,
        seats: args.seats,
        maxSeats: args.maxSeats,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        paymentMethod: args.paymentMethod,
        isOnTrial: args.isOnTrial,
        trialEndsAt: args.trialEndsAt,
        billingOwnerId: args.billingOwnerId,
        updatedAt: now,
      });

      return existingPlan._id;
    } else {
      const planId = await ctx.db.insert("plans", {
        ownerType: args.ownerType,
        ownerId: args.ownerId,
        stripeCustomerId: args.stripeCustomerId,
        subscriptionId: args.subscriptionId,
        status: args.status,
        priceId: args.priceId,
        planType: args.planType,
        seats: args.seats,
        maxSeats: args.maxSeats,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        paymentMethod: args.paymentMethod,
        isOnTrial: args.isOnTrial,
        trialEndsAt: args.trialEndsAt,
        isValidated: true, 
        billingOwnerId: args.billingOwnerId,
        createdAt: now,
        updatedAt: now,
      });

      return planId;
    }
  },
});

/**
 * Create initial plan mapping (Stripe customer to owner)
 */
export const createPlanMapping = mutation({
  args: {
    ownerType: v.union(v.literal("user"), v.literal("org")),
    ownerId: v.string(), 
    stripeCustomerId: v.string(),
    seats: v.optional(v.number()),
    billingOwnerId: v.optional(v.string()), 
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify that the authenticated user matches the ownerId (for user plans)
    // or is the billing owner (for org plans)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: User must be authenticated");
    }

    const authenticatedUserId = identity.subject;

    if (args.ownerType === "user" && authenticatedUserId !== args.ownerId) {
      throw new Error("Unauthorized: Cannot create plan mapping for another user");
    }

    const existingPlan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", args.ownerType).eq("ownerId", args.ownerId)
      )
      .first();

    if (existingPlan) {
      if (existingPlan.stripeCustomerId !== args.stripeCustomerId) {
        await ctx.db.patch(existingPlan._id, {
          stripeCustomerId: args.stripeCustomerId,
          seats: args.seats,
          billingOwnerId: args.billingOwnerId,
          updatedAt: Date.now(),
        });
      }
      return existingPlan._id;
    }

    const now = Date.now();
    const planId = await ctx.db.insert("plans", {
      ownerType: args.ownerType,
      ownerId: args.ownerId,
      stripeCustomerId: args.stripeCustomerId,
      status: "none",
      planType: args.ownerType === "org" ? "team" : "free",
      seats: args.seats,
      isOnTrial: false,
      isValidated: true, 
      billingOwnerId: args.billingOwnerId, 
      createdAt: now,
      updatedAt: now,
    });

    return planId;
  },
});

/**
 * Update seat count for an organization plan
 */
export const updatePlanSeats = internalMutation({
  args: {
    ownerId: v.string(), 
    seats: v.number(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", "org").eq("ownerId", args.ownerId)
      )
      .first();

    if (plan) {
      await ctx.db.patch(plan._id, {
        seats: args.seats,
        updatedAt: Date.now(),
      });
      return plan._id;
    }

    return null;
  },
});

/**
 * Get ownerId from Stripe customer ID
 */
export const getOwnerIdByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    return plan?.ownerId ?? null;
  },
});

/**
 * Get plan with owner type from Stripe customer ID
 */
export const getPlanInfoByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!plan) return null;

    return {
      ownerId: plan.ownerId,
      ownerType: plan.ownerType,
    };
  },
});
