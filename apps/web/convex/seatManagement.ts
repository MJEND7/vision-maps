import { internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Increment seat count when a new member is added to an organization
 */
export const incrementOrgSeats = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    // Get the organization's plan
    const org = await ctx.db.get(organizationId);
    if (!org) {
      console.error("[SEAT MANAGEMENT] Organization not found:", organizationId);
      return;
    }

    // Get the plan for this organization
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", "org").eq("ownerId", organizationId)
      )
      .first();

    if (!plan) {
      console.log("[SEAT MANAGEMENT] No plan found for organization:", organizationId);
      return;
    }

    // Only increment seats for team plans
    if (plan.planType !== "team") {
      console.log("[SEAT MANAGEMENT] Plan is not a team plan, skipping seat increment");
      return;
    }

    const newSeats = (plan.seats || 1) + 1;
    console.log(`[SEAT MANAGEMENT] Incrementing seats from ${plan.seats} to ${newSeats} for org ${organizationId}`);

    // Update the plan with new seat count
    await ctx.db.patch(plan._id, {
      seats: newSeats,
      updatedAt: Date.now(),
    });

    // Update Stripe subscription if there's an active subscription
    if (plan.subscriptionId && plan.status === "active") {
      await ctx.scheduler.runAfter(0, internal.seatManagement.updateStripeSeats, {
        subscriptionId: plan.subscriptionId,
        seats: newSeats,
      });
    }

    return newSeats;
  },
});

/**
 * Decrement seat count when a member is removed from an organization
 * Handles 24-hour grace period logic
 */
export const decrementOrgSeats = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    memberAddedAt: v.number(), // When the member was added
  },
  handler: async (ctx, { organizationId, memberAddedAt }) => {
    // Get the organization's plan
    const org = await ctx.db.get(organizationId);
    if (!org) {
      console.error("[SEAT MANAGEMENT] Organization not found:", organizationId);
      return;
    }

    // Get the plan for this organization
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", "org").eq("ownerId", organizationId)
      )
      .first();

    if (!plan) {
      console.log("[SEAT MANAGEMENT] No plan found for organization:", organizationId);
      return;
    }

    // Only decrement seats for team plans
    if (plan.planType !== "team") {
      console.log("[SEAT MANAGEMENT] Plan is not a team plan, skipping seat decrement");
      return;
    }

    const now = Date.now();
    const memberDuration = now - memberAddedAt;
    const withinGracePeriod = memberDuration < GRACE_PERIOD_MS;

    console.log(`[SEAT MANAGEMENT] Member was added ${Math.floor(memberDuration / 1000 / 60 / 60)} hours ago. Within grace period: ${withinGracePeriod}`);

    // If within 24 hour grace period, immediately decrement and update Stripe
    if (withinGracePeriod) {
      const newSeats = Math.max(1, (plan.seats || 1) - 1);
      console.log(`[SEAT MANAGEMENT] Within grace period - Decrementing seats from ${plan.seats} to ${newSeats} for org ${organizationId}`);

      await ctx.db.patch(plan._id, {
        seats: newSeats,
        updatedAt: Date.now(),
      });

      // Update Stripe subscription immediately
      if (plan.subscriptionId && plan.status === "active") {
        await ctx.scheduler.runAfter(0, internal.seatManagement.updateStripeSeats, {
          subscriptionId: plan.subscriptionId,
          seats: newSeats,
        });
      }

      return { decremented: true, immediate: true, newSeats };
    } else {
      // Outside grace period - seat will count towards this month's bill
      // Schedule seat removal for next billing period
      console.log(`[SEAT MANAGEMENT] Outside grace period - Seat will be removed at next billing period`);

      // We don't decrement now, let the billing cycle handle it
      // When the next billing period starts, the actual member count will be used
      return { decremented: false, immediate: false, message: "Seat will be removed next billing period" };
    }
  },
});

/**
 * Update Stripe subscription seats count - uses internal action
 */
export const updateStripeSeats = internalMutation({
  args: {
    subscriptionId: v.string(),
    seats: v.number(),
  },
  handler: async (ctx, { subscriptionId, seats }) => {
    console.log(`[SEAT MANAGEMENT] Scheduling Stripe update for subscription ${subscriptionId} to ${seats} seats`);

    // Queue an action to update Stripe (actions can use external APIs like Stripe SDK)
    await ctx.scheduler.runAfter(0, internal.seatManagement.updateStripeSeatsAction, {
      subscriptionId,
      seats,
    });
  },
});

/**
 * Action to update Stripe subscription seats using Stripe SDK
 */
export const updateStripeSeatsAction = internalAction({
  args: {
    subscriptionId: v.string(),
    seats: v.number(),
  },
  handler: async (ctx, { subscriptionId, seats }) => {
    console.log(`[SEAT MANAGEMENT] Updating Stripe subscription ${subscriptionId} to ${seats} seats`);

    try {
      // Import Stripe SDK (this works in actions, not mutations)
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-09-30.clover",
      });

      // Get the subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      // Find the subscription item (should be the first one for team plans)
      const subscriptionItem = subscription.items.data[0];

      if (!subscriptionItem) {
        throw new Error("No subscription items found");
      }

      // Update the subscription item quantity (seats)
      await stripe.subscriptionItems.update(subscriptionItem.id, {
        quantity: seats,
        proration_behavior: "create_prorations", // Prorate the charge
      });

      console.log(`[SEAT MANAGEMENT] Successfully updated Stripe subscription ${subscriptionId} to ${seats} seats`);

      return {
        success: true,
        subscriptionId,
        seats,
      };
    } catch (error: any) {
      console.error("[SEAT MANAGEMENT] Error updating Stripe subscription:", error);
      throw new Error(`Failed to update Stripe subscription: ${error.message}`);
    }
  },
});

/**
 * Sync actual member count with billed seats at billing period
 * Called by Stripe webhook at the start of each billing period
 */
export const syncSeatsAtBillingPeriod = internalMutation({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, { subscriptionId }) => {
    const plan = await ctx.db
      .query("plans")
      .filter((q) => q.eq(q.field("subscriptionId"), subscriptionId))
      .first();

    if (!plan || plan.ownerType !== "org") {
      return;
    }

    // Get actual member count
    const members = await ctx.db
      .query("organization_members")
      .withIndex("by_organization", (q) => q.eq("organizationId", plan.ownerId as any))
      .collect();

    const actualMemberCount = members.length;
    const currentSeats = plan.seats || 1;

    console.log(`[SEAT MANAGEMENT] Syncing seats at billing period. Current: ${currentSeats}, Actual members: ${actualMemberCount}`);

    if (actualMemberCount !== currentSeats) {
      await ctx.db.patch(plan._id, {
        seats: actualMemberCount,
        updatedAt: Date.now(),
      });

      return { synced: true, oldSeats: currentSeats, newSeats: actualMemberCount };
    }

    return { synced: false, seats: currentSeats };
  },
});

/**
 * Get current seat count for an organization
 */
export const getOrgSeatCount = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", "org").eq("ownerId", organizationId)
      )
      .first();

    if (!plan) {
      return null;
    }

    const members = await ctx.db
      .query("organization_members")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    return {
      billedSeats: plan.seats || 1,
      actualMembers: members.length,
      planType: plan.planType,
      subscriptionId: plan.subscriptionId,
    };
  },
});
