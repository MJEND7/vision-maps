import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireAuth } from "./utils/auth";

// Args schemas
const createChatArgs = v.object({
    title: v.string(),
    visionId: v.id("visions"),
    channelId: v.optional(v.id("channels")),
    nodeId: v.optional(v.id("nodes"))
});

const listUserChatsArgs = v.object({
    visionId: v.optional(v.id("visions")),
    channelId: v.optional(v.id("channels"))
});

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
            visionId: args.visionId,
            channelId: args.channelId,
            nodeId: args.nodeId
        });

        return id;
    },
});

export const listUserChats = query({
    args: listUserChatsArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const userId = identity?.userId

        if (!userId) {
            throw new Error("Failed to get the user Id")
        }

        let query = ctx.db
            .query("chats")
            .withIndex("by_userId", (q) => q.eq("userId", userId.toString()));

        let chats = await query.collect();

        // Filter by vision if provided
        if (args.visionId) {
            chats = chats.filter(chat => chat.visionId === args.visionId);
        }

        // Filter by channel if provided
        if (args.channelId) {
            chats = chats.filter(chat => chat.channelId === args.channelId);
        }

        return chats;
    },
});

export const getChat = query({
    args: getChatArgs,
    handler: async (ctx, args) => {
        return await ctx.db.get(args.chatId);
    },
});

export const listVisionChats = query({
    args: v.object({
        visionId: v.id("visions")
    }),
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const userId = identity?.userId;

        if (!userId) {
            throw new Error("Failed to get the user Id");
        }

        // Get chats for the specific vision
        const chats = await ctx.db
            .query("chats")
            .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
            .filter((q) => q.eq(q.field("userId"), userId.toString()))
            .collect();

        // Enrich chats with channel and node information
        const enrichedChats = await Promise.all(
            chats.map(async (chat) => {
                let channelInfo = null;
                let nodeInfo = null;

                // Get channel information if channelId exists
                if (chat.channelId) {
                    const channel = await ctx.db.get(chat.channelId);
                    if (channel) {
                        channelInfo = {
                            _id: channel._id,
                            title: channel.title
                        };
                    }
                }

                // Get node information if nodeId exists
                if (chat.nodeId) {
                    const node = await ctx.db.get(chat.nodeId);
                    if (node) {
                        nodeInfo = {
                            _id: node._id,
                            title: node.title,
                            channelId: node.channel
                        };
                    }
                }

                return {
                    ...chat,
                    channel: channelInfo,
                    node: nodeInfo
                };
            })
        );

        return enrichedChats;
    },
});

export const listChannelChats = query({
    args: v.object({
        channelId: v.id("channels")
    }),
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const userId = identity?.userId;

        if (!userId) {
            throw new Error("Failed to get the user Id");
        }

        // Get chats for the specific channel
        return await ctx.db
            .query("chats")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .filter((q) => q.eq(q.field("userId"), userId.toString()))
            .collect();
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

