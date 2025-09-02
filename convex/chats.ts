import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./utils/auth";

export const createChat = mutation({
    args: {
        title: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id")
        }

        const id = await ctx.db.insert("chats", {
            title: args.title,
            userId: identity.userId?.toString(),
        });

        return id;
    },
});

export const listUserChats = query({
    args: {},
    handler: async (ctx) => {
        const identity = await requireAuth(ctx);
        const userId = identity?.userId

        if (!userId) {
            throw new Error("Failed to get the user Id")
        }

        return await ctx.db
            .query("chats")
            .withIndex("by_userId", (q) => q.eq("userId", userId.toString()))
            .collect();
    },
});

export const getChat = query({
    args: {
        chatId: v.id("chats")
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.chatId);
    },
});

