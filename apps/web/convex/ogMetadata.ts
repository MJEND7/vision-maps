import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByUrl = query({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query("og_metadata")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();
    
    if (!metadata) return null;
    
    // Check if expired (30 days)
    const now = new Date();
    const expiresAt = new Date(metadata.expiresAt);
    
    if (now > expiresAt) {
      return null;
    }
    
    return metadata;
  },
});

export const store = mutation({
  args: {
    url: v.string(),
    metadata: v.any(), 
    platformType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const existing = await ctx.db
      .query("og_metadata")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        metadata: args.metadata,
        platformType: args.platformType,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("og_metadata", {
        url: args.url,
        metadata: args.metadata,
        platformType: args.platformType,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
    }
  },
});

export const cleanExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const expired = await ctx.db
      .query("og_metadata")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();
    
    for (const item of expired) {
      await ctx.db.delete(item._id);
    }
    
    return expired.length;
  },
});
