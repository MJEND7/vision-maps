import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get org plan by organization ID
 */
export const getOrgPlanByOrganizationId = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("org_plans")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    return plan;
  },
});

/**
 * Get org plan by Stripe customer ID
 */
export const getOrgPlanByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("org_plans")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    return plan;
  },
});

/**
 * Get org plan by owner ID (only owners can manage billing)
 */
export const getOrgPlanByOwnerId = query({
  args: {
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("org_plans")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.ownerId))
      .first();

    return plan;
  },
});

/**
 * Create or update org plan (called from Stripe webhooks and checkout success)
 */
export const upsertOrgPlan = internalMutation({
  args: {
    organizationId: v.string(),
    stripeCustomerId: v.string(),
    ownerId: v.string(),
    subscriptionId: v.optional(v.string()),
    status: v.string(),
    priceId: v.optional(v.string()),
    planType: v.string(), // Should always be "team"
    seats: v.number(),
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
  },
  handler: async (ctx, args) => {
    const existingPlan = await ctx.db
      .query("org_plans")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const now = Date.now();

    if (existingPlan) {
      // Update existing plan
      await ctx.db.patch(existingPlan._id, {
        stripeCustomerId: args.stripeCustomerId,
        ownerId: args.ownerId,
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
        updatedAt: now,
      });

      return existingPlan._id;
    } else {
      // Create new plan
      const planId = await ctx.db.insert("org_plans", {
        organizationId: args.organizationId,
        stripeCustomerId: args.stripeCustomerId,
        ownerId: args.ownerId,
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
        isValidated: true, // Validated through updatePlanFromStripeData
        createdAt: now,
        updatedAt: now,
      });

      return planId;
    }
  },
});

/**
 * Create initial org plan mapping (Stripe customer to organizationId)
 */
export const createOrgPlanMapping = mutation({
  args: {
    organizationId: v.string(),
    stripeCustomerId: v.string(),
    ownerId: v.string(),
    seats: v.number(),
  },
  handler: async (ctx, args) => {
    const existingPlan = await ctx.db
      .query("org_plans")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (existingPlan) {
      // Just update the Stripe customer ID if needed
      if (existingPlan.stripeCustomerId !== args.stripeCustomerId) {
        await ctx.db.patch(existingPlan._id, {
          stripeCustomerId: args.stripeCustomerId,
          ownerId: args.ownerId,
          seats: args.seats,
          updatedAt: Date.now(),
        });
      }
      return existingPlan._id;
    }

    // Create a new org plan with no subscription
    const now = Date.now();
    const planId = await ctx.db.insert("org_plans", {
      organizationId: args.organizationId,
      stripeCustomerId: args.stripeCustomerId,
      ownerId: args.ownerId,
      status: "none",
      planType: "team",
      seats: args.seats,
      isOnTrial: false,
      isValidated: true, // Free/mapping-only plans are always valid
      createdAt: now,
      updatedAt: now,
    });

    return planId;
  },
});

/**
 * Update seat count for an organization (called when members are added/removed)
 */
export const updateOrgSeats = internalMutation({
  args: {
    organizationId: v.string(),
    seats: v.number(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("org_plans")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
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
 * Get organizationId from Stripe customer ID
 */
export const getOrganizationIdByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("org_plans")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    return plan?.organizationId ?? null;
  },
});
