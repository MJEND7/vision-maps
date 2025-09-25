import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createTrial = internalMutation({
  args: {
    clerkUserId: v.string(),
    organizationId: v.optional(v.string()),
    plan: v.string(), // "pro" or "teams"
    trialDays: v.optional(v.number()), // defaults to 3
  },
  handler: async (ctx, args) => {
    const trialDays = args.trialDays || 3;
    const now = Date.now();
    const trialEndDate = now + (trialDays * 24 * 60 * 60 * 1000); // trialDays from now

    // Check if user already has an active trial for this plan/org combo
    const existingTrial = args.organizationId 
      ? await ctx.db
          .query("userTrials")
          .withIndex("by_clerk_user_and_org", (q) => 
            q.eq("clerkUserId", args.clerkUserId)
             .eq("organizationId", args.organizationId)
          )
          .filter((q) => 
            q.and(
              q.eq(q.field("plan"), args.plan),
              q.eq(q.field("status"), "active")
            )
          )
          .first()
      : await ctx.db
          .query("userTrials")
          .withIndex("by_clerk_user_id", (q) => 
            q.eq("clerkUserId", args.clerkUserId)
          )
          .filter((q) => 
            q.and(
              q.eq(q.field("organizationId"), undefined),
              q.eq(q.field("plan"), args.plan),
              q.eq(q.field("status"), "active")
            )
          )
          .first();

    if (existingTrial) {
      console.log('Returning existing trial ID:', existingTrial._id);
      return existingTrial._id;
    }

    const newTrialData = {
      clerkUserId: args.clerkUserId,
      organizationId: args.organizationId,
      plan: args.plan,
      trialStartDate: now,
      trialEndDate,
      trialDays,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    const trialId = await ctx.db.insert("userTrials", newTrialData);
    
    return trialId;
  },
});

// Get active trial for user
export const getActiveTrial = query({
  args: {
    clerkUserId: v.string(),
    organizationId: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("userTrials")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .filter((q) => q.eq(q.field("status"), "active"));

    if (args.organizationId !== undefined) {
      query = query.filter((q) => q.eq(q.field("organizationId"), args.organizationId));
    }

    if (args.plan) {
      query = query.filter((q) => q.eq(q.field("plan"), args.plan));
    }

    return await query.first();
  },
});

// Get trial info with days remaining
export const getTrialInfo = query({
  args: {
    clerkUserId: v.string(),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trial = args.organizationId
      ? await ctx.db
          .query("userTrials")
          .withIndex("by_clerk_user_and_org", (q) => 
            q.eq("clerkUserId", args.clerkUserId)
             .eq("organizationId", args.organizationId)
          )
          .filter((q) => q.eq(q.field("status"), "active"))
          .first()
      : await ctx.db
          .query("userTrials")
          .withIndex("by_clerk_user_id", (q) => 
            q.eq("clerkUserId", args.clerkUserId)
          )
          .filter((q) => 
            q.and(
              q.eq(q.field("status"), "active")
            )
          )
          .first();

    if (!trial) {
      console.log('No active trial found');
      return null;
    }

    const now = Date.now();
    const daysLeft = Math.ceil((trial.trialEndDate - now) / (24 * 60 * 60 * 1000));

    // If trial is over, return null (expiration will be handled by a separate mutation)
    if (daysLeft <= 0) {
      console.log('Trial expired, returning null');
      return null;
    }

    const result = {
      ...trial,
      daysLeft,
    };

    return result;
  },
});

// Separate mutation to expire a specific trial
export const expireTrial = mutation({
  args: {
    trialId: v.id("userTrials"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trialId, {
      status: "expired",
      updatedAt: Date.now(),
    });
  },
});

// Mark trial as converted (when user upgrades)
export const convertTrial = mutation({
  args: {
    clerkUserId: v.string(),
    organizationId: v.optional(v.string()),
    plan: v.string(),
  },
  handler: async (ctx, args) => {
    const trial = args.organizationId
      ? await ctx.db
          .query("userTrials")
          .withIndex("by_clerk_user_and_org", (q) => 
            q.eq("clerkUserId", args.clerkUserId)
             .eq("organizationId", args.organizationId)
          )
          .filter((q) => 
            q.and(
              q.eq(q.field("plan"), args.plan),
              q.eq(q.field("status"), "active")
            )
          )
          .first()
      : await ctx.db
          .query("userTrials")
          .withIndex("by_clerk_user_id", (q) => 
            q.eq("clerkUserId", args.clerkUserId)
          )
          .filter((q) => 
            q.and(
              q.eq(q.field("organizationId"), undefined),
              q.eq(q.field("plan"), args.plan),
              q.eq(q.field("status"), "active")
            )
          )
          .first();

    if (trial) {
      await ctx.db.patch(trial._id, {
        status: "converted",
        updatedAt: Date.now(),
      });
    }

    return trial?._id;
  },
});

// Expire old trials (cleanup function)
export const expireOldTrials = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const activeTrials = await ctx.db
      .query("userTrials")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const expiredTrials = activeTrials.filter(trial => trial.trialEndDate <= now);

    for (const trial of expiredTrials) {
      await ctx.db.patch(trial._id, {
        status: "expired",
        updatedAt: now,
      });
    }

    return expiredTrials.length;
  },
});
