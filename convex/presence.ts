import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { Presence } from "@convex-dev/presence";
import { requireAuth } from "./utils/auth";
import { ActiveUsers } from "./tables/user";

export const presence = new Presence(components.presence);

export const heartbeat = mutation({
    args: { roomId: v.string(), userId: v.string(), sessionId: v.string(), interval: v.number() },
    handler: async (ctx, { roomId, userId, sessionId, interval }) => {
        const identity = await requireAuth(ctx);
        if (identity.userId !== userId) {
            throw new Error("User ID mismatch");
        }
        return await presence.heartbeat(ctx, roomId, userId, sessionId, interval);
    },
});

export const listRoom = query({
    args: { roomToken: v.string() },
    handler: async (ctx, { roomToken }) => {
        const identity = await requireAuth(ctx);
        const presenceList = (await presence.listRoom(ctx, roomToken)).filter((u) => u.userId != identity.userId);

        const enrichedPresence = await Promise.all(
            presenceList.map(async (user) => {
                const userRecord = await ctx.db
                    .query("users")
                    .withIndex("byExternalId", (q) => q.eq("externalId", user.userId))
                    .unique();

                if (userRecord) {
                    return {
                        ...user,
                        name: userRecord.name || "Unknown User",
                        image: userRecord.picture || null,
                        email: userRecord.email || null
                    };
                }

                return {
                    ...user,
                    name: "Unknown User",
                    image: null,
                    email: null
                };
            })
        );

        return enrichedPresence as ActiveUsers;
    },
});

export const list = query({
    args: { roomToken: v.string() },
    handler: async (ctx, { roomToken }) => {
        await requireAuth(ctx);
        const presenceList = await presence.list(ctx, roomToken);

        const enrichedPresence = await Promise.all(
            presenceList.map(async (user) => {
                const userRecord = await ctx.db
                    .query("users")
                    .withIndex("byExternalId", (q) => q.eq("externalId", user.userId))
                    .unique();

                if (userRecord) {
                    return {
                        ...user,
                        name: userRecord.name || "Unknown User",
                        image: userRecord.picture || null,
                        email: userRecord.email || null
                    };
                }

                return {
                    ...user,
                    name: "Unknown User",
                    image: null,
                    email: null
                };
            })
        );

        return enrichedPresence as ActiveUsers; 
    },
});

export const disconnect = mutation({
    args: { sessionToken: v.string() },
    handler: async (ctx, { sessionToken }) => {
        // Can't check auth here because it's called over http from sendBeacon.
        return await presence.disconnect(ctx, sessionToken);
    },
});

