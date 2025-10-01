import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { UserPasteBin } from "./tables/userPasteBin";

// Get the paste bin for a user in a specific vision
export const get = query({
    args: {
        visionId: v.id("visions"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_external_id", (q) =>
                q.eq("externalId", identity.subject)
            )
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        const pasteBin = await ctx.db
            .query(UserPasteBin.TABLE_NAME)
            .withIndex("by_user_vision", (q) =>
                q.eq("userId", user._id).eq("visionId", args.visionId)
            )
            .first();

        return pasteBin;
    },
});

// Update or create paste bin state
export const upsert = mutation({
    args: {
        visionId: v.id("visions"),
        mode: v.string(),
        type: v.optional(v.string()),
        value: v.optional(v.string()),
        valueArray: v.optional(v.array(v.object({
            text: v.string(),
            timestamp: v.number(),
        }))),
        textContent: v.optional(v.string()),
        chatId: v.optional(v.id("chats")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_external_id", (q) =>
                q.eq("externalId", identity.subject)
            )
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        const { visionId, ...updateData } = args;

        // Check if paste bin already exists
        const existing = await ctx.db
            .query(UserPasteBin.TABLE_NAME)
            .withIndex("by_user_vision", (q) =>
                q.eq("userId", user._id).eq("visionId", visionId)
            )
            .first();

        const now = Date.now();

        if (existing) {
            // Update existing paste bin
            await ctx.db.patch(existing._id, {
                ...updateData,
                updatedAt: now,
            });
            return existing._id;
        } else {
            // Create new paste bin
            const pasteBinId = await ctx.db.insert(UserPasteBin.TABLE_NAME, {
                userId: user._id,
                visionId,
                ...updateData,
                createdAt: now,
                updatedAt: now,
            });
            return pasteBinId;
        }
    },
});

// Clear paste bin for a vision
export const clear = mutation({
    args: {
        visionId: v.id("visions"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_external_id", (q) =>
                q.eq("externalId", identity.subject)
            )
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        const pasteBin = await ctx.db
            .query(UserPasteBin.TABLE_NAME)
            .withIndex("by_user_vision", (q) =>
                q.eq("userId", user._id).eq("visionId", args.visionId)
            )
            .first();

        if (pasteBin) {
            await ctx.db.delete(pasteBin._id);
        }
    },
});

// Update just the transcription array (for real-time transcription updates)
export const updateTranscriptArray = mutation({
    args: {
        visionId: v.id("visions"),
        valueArray: v.array(v.object({
            text: v.string(),
            timestamp: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_external_id", (q) =>
                q.eq("externalId", identity.subject)
            )
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        const { visionId, valueArray } = args;

        // Check if paste bin already exists
        const existing = await ctx.db
            .query(UserPasteBin.TABLE_NAME)
            .withIndex("by_user_vision", (q) =>
                q.eq("userId", user._id).eq("visionId", visionId)
            )
            .first();

        const now = Date.now();

        if (existing) {
            // Update existing paste bin
            await ctx.db.patch(existing._id, {
                valueArray,
                mode: "transcription",
                type: "Transcription",
                updatedAt: now,
            });
            return existing._id;
        } else {
            // Create new paste bin with transcription
            const pasteBinId = await ctx.db.insert(UserPasteBin.TABLE_NAME, {
                userId: user._id,
                visionId,
                mode: "transcription",
                type: "Transcription",
                valueArray,
                createdAt: now,
                updatedAt: now,
            });
            return pasteBinId;
        }
    },
});