import { defineTable } from "convex/server";
import { v } from "convex/values";

export class OGMetadata {
    static TABLE_NAME = "og_metadata" as const;
    
    static Table = defineTable({
        url: v.string(),
        metadata: v.any(), // Use v.any() to allow flexible metadata structure
        platformType: v.string(), // 'github', 'youtube', 'twitter', etc.
        createdAt: v.string(),
        expiresAt: v.string(), // For 30-day expiration
    })
    .index("by_url", ["url"])
    .index("by_expires", ["expiresAt"]);
}