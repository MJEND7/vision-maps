import { defineTable } from "convex/server";
import { v } from "convex/values";

export class OGMetadata {
    static TABLE_NAME = "og_metadata" as const;
    
    static Table = defineTable({
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
        platformType: v.string(), // 'github', 'youtube', 'twitter', etc.
        createdAt: v.string(),
        expiresAt: v.string(), // For 30-day expiration
    })
    .index("by_url", ["url"])
    .index("by_expires", ["expiresAt"]);
}