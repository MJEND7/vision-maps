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
      // Return null for expired data (cleanup will be handled by mutation)
      return null;
    }
    
    return metadata;
  },
});

export const store = mutation({
  args: {
    url: v.string(),
    metadata: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
      favicon: v.optional(v.string()),
      ogType: v.optional(v.string()),
      author: v.optional(v.string()),
      publishedTime: v.optional(v.string()),
      modifiedTime: v.optional(v.string()),
      jsonLD: v.optional(v.array(v.any())),
      type: v.optional(v.string()),
      url: v.optional(v.string()),
      // Platform-specific fields
      stars: v.optional(v.number()),
      forks: v.optional(v.number()),
      language: v.optional(v.string()),
      topics: v.optional(v.array(v.string())),
      team: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
      channelName: v.optional(v.string()),
      duration: v.optional(v.string()),
      views: v.optional(v.number()),
      likes: v.optional(v.number()),
      publishedAt: v.optional(v.string()),
      videoUrl: v.optional(v.string()),
      videoDuration: v.optional(v.string()),
      videoWidth: v.optional(v.string()),
      videoHeight: v.optional(v.string()),
      twitterCreator: v.optional(v.string()),
      twitterSite: v.optional(v.string()),
      username: v.optional(v.string()),
      avatar: v.optional(v.string()),
      retweets: v.optional(v.number()),
      replies: v.optional(v.number()),
      twitterType: v.optional(v.string()),
      tweetId: v.optional(v.string()),
      workspace: v.optional(v.string()),
      icon: v.optional(v.string()),
      lastEdited: v.optional(v.string()),
      pageType: v.optional(v.string()),
      artist: v.optional(v.string()),
      album: v.optional(v.string()),
      spotifyType: v.optional(v.string()),
      appleMusicType: v.optional(v.string()),
      createdAt: v.optional(v.string()),
      creator: v.optional(v.string()),
      figmaFileType: v.optional(v.string()),
    }),
    platformType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    // Check if URL already exists and update it
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