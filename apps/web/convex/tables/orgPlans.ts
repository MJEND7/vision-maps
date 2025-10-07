import { defineTable } from "convex/server";
import { v } from "convex/values";

export const OrgPlans = {
  Table: defineTable({
    // Link to organization
    organizationId: v.string(),

    // Stripe customer ID for the organization
    stripeCustomerId: v.string(),

    // Subscription details
    subscriptionId: v.optional(v.string()),
    status: v.string(), // "none", "active", "canceled", "past_due", "trialing", etc.
    priceId: v.optional(v.string()),

    // Plan type (should always be "team" for organizations)
    planType: v.string(), // "team"

    // Seat-based billing
    seats: v.number(), // Number of seats (members) in the organization
    maxSeats: v.optional(v.number()), // Optional max seats limit

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

    // Trial information
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

    // Soft delete - never actually delete plans, just disable
    isDeleted: v.optional(v.boolean()),

    // Owner of the organization (only they can manage billing)
    ownerId: v.string(), // Clerk externalId of the owner

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_status", ["status"])
    .index("by_owner_id", ["ownerId"]),
};
