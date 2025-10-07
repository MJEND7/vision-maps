import { defineTable } from "convex/server";
import { v } from "convex/values";

export const UserPlans = {
  Table: defineTable({
    // Link to user via Clerk's externalId
    externalId: v.string(),

    // Stripe customer ID
    stripeCustomerId: v.string(),

    // Subscription details
    subscriptionId: v.optional(v.string()),
    status: v.string(), // "none", "active", "canceled", "past_due", "trialing", etc.
    priceId: v.optional(v.string()),

    // Plan type (free, pro, team)
    planType: v.string(), // "free" | "pro" | "team"

    // Period information
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),

    // Payment method info (for display purposes)
    paymentMethod: v.optional(
      v.object({
        brand: v.union(v.string(), v.null()),
        last4: v.union(v.string(), v.null()),
      })
    ),

    // Trial information (replacing userTrials table)
    isOnTrial: v.boolean(),
    trialEndsAt: v.optional(v.number()),

    // Error tracking for billing issues
    error: v.optional(
      v.object({
        type: v.string(), // "payment_failed", "payment_action_required", "uncollectible"
        message: v.string(),
        timestamp: v.number(),
        invoiceId: v.optional(v.string()),
        invoiceUrl: v.optional(v.string()),
      })
    ),

    // Validation tracking
    isValidated: v.boolean(), // Whether subscription has been confirmed by Stripe

    // Soft delete - never actually delete plans
    isDeleted: v.optional(v.boolean()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_status", ["status"])
    .index("by_plan_type", ["planType"]),
};
