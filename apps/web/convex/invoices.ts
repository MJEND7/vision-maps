import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./utils/auth";

/**
 * Get invoices for an organization
 */
export const getOrgInvoices = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", "org").eq("ownerId", args.organizationId)
      )
      .order("desc")
      .take(args.limit || 10);

    return invoices;
  },
});

/**
 * Get invoices for a user
 */
export const getUserInvoices = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", "user").eq("ownerId", args.userId)
      )
      .order("desc")
      .take(args.limit || 10);

    return invoices;
  },
});
