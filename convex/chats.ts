import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireAuth } from "./utils/auth";

// Args schemas
const createChatArgs = v.object({
    title: v.string(),
});

const listUserChatsArgs = v.object({});

const getChatArgs = v.object({
    chatId: v.id("chats"),
});

const deleteChatArgs = v.object({
    chatId: v.id("chats"),
});

export const createChat = mutation({
    args: createChatArgs,
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
    args: listUserChatsArgs,
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
    args: getChatArgs,
    handler: async (ctx, args) => {
        return await ctx.db.get(args.chatId);
    },
});

export const deleteChat = mutation({
    args: deleteChatArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id")
        }

        // Get the chat to verify ownership
        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }

        if (chat.userId !== identity.userId.toString()) {
            throw new Error("Unauthorized: You can only delete your own chats");
        }

        // Delete all messages first
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
            .collect();
            
        await Promise.all(messages.map((message) => ctx.db.delete(message._id)));

        // Then delete the chat
        await ctx.db.delete(args.chatId);
        
        return { success: true };
    },
});

// Type exports
export type CreateChatArgs = Infer<typeof createChatArgs>;
export type ListUserChatsArgs = Infer<typeof listUserChatsArgs>;
export type GetChatArgs = Infer<typeof getChatArgs>;
export type DeleteChatArgs = Infer<typeof deleteChatArgs>;

