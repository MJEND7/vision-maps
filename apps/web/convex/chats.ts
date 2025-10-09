import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireAuth, getUserByIdenityId } from "./utils/auth";
import { paginationOptsValidator } from "convex/server";
import { getUserPlan } from "./auth";
import { requirePermission, Permission } from "./permissions";

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

const listVisionChatsPaginatedArgs = v.object({
    visionId: v.id("visions"),
    paginationOpts: paginationOptsValidator
});

const updateChatTitleArgs = v.object({
    chatId: v.id("chats"),
    title: v.string(),
});

const updateChatNodeIdArgs = v.object({
    chatId: v.id("chats"),
    nodeId: v.id("nodes"),
});

const createChatWithNodeArgs = v.object({
    title: v.string(),
    visionId: v.id("visions"),
    channelId: v.optional(v.id("channels")), // Optional - will use first channel if not provided
    frameId: v.optional(v.id("frames")), // Optional - if provided, node will be added to frame
    position: v.optional(v.object({
        x: v.number(),
        y: v.number(),
    })), // Optional - position in frame, only used if frameId is provided
});


export const createChat = mutation({
    args: createChatArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id")
        }

        const plan = await getUserPlan(ctx.auth, ctx.db);
        requirePermission(plan, Permission.AI_NODES);

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

        const query = ctx.db
            .query("chats")
            .withIndex("by_userId", (q) => q.eq("userId", userId.toString()));

        let chats = await query.collect();

        if (args.visionId) {
            chats = chats.filter(chat => chat.visionId === args.visionId);
        }

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

        const chats = await ctx.db
            .query("chats")
            .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
            .filter((q) => q.eq(q.field("userId"), userId.toString()))
            .collect();

        const enrichedChats = await Promise.all(
            chats.map(async (chat) => {
                let channelInfo = null;
                let nodeInfo = null;

                if (chat.channelId) {
                    const channel = await ctx.db.get(chat.channelId);
                    if (channel) {
                        channelInfo = {
                            _id: channel._id,
                            title: channel.title
                        };
                    }
                }

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

        return await ctx.db
            .query("chats")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .filter((q) => q.eq(q.field("userId"), userId.toString()))
            .filter((q) => q.neq(q.field("isCommentChat"), true))
            .collect();
    },
});

export const listVisionChatsPaginated = query({
    args: listVisionChatsPaginatedArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        const userId = identity?.userId;

        if (!userId) {
            throw new Error("Failed to get the user Id");
        }

        const result = await ctx.db
            .query("chats")
            .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
            .filter((q) => q.eq(q.field("userId"), userId.toString()))
            .filter((q) => q.neq(q.field("isCommentChat"), true))
            .order("desc")
            .paginate(args.paginationOpts);

        const enrichedChats = await Promise.all(
            result.page.map(async (chat) => {
                let channelInfo = null;
                let nodeInfo = null;

                if (chat.channelId) {
                    const channel = await ctx.db.get(chat.channelId);
                    if (channel) {
                        channelInfo = {
                            _id: channel._id,
                            title: channel.title
                        };
                    }
                }

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

                const latestMessage = await ctx.db
                    .query("messages")
                    .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
                    .order("desc")
                    .first();

                return {
                    ...chat,
                    channel: channelInfo,
                    node: nodeInfo,
                    lastMessage: latestMessage?.content || null,
                    lastMessageAt: latestMessage?._creationTime || chat._creationTime,
                };
            })
        );

        return {
            ...result,
            page: enrichedChats,
        };
    },
});

export const createChatWithNode = mutation({
    args: createChatWithNodeArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id");
        }

        const plan = await getUserPlan(ctx.auth, ctx.db);
        requirePermission(plan, Permission.AI_NODES);

        const userId = (await getUserByIdenityId(ctx, identity.userId as string))?._id;

        if (!userId) {
            throw new Error("Failed to get userId from identity");
        }

        let channelId = args.channelId;
        if (!channelId) {
            const firstChannel = await ctx.db
                .query("channels")
                .withIndex("by_vision", (q) => q.eq("vision", args.visionId))
                .order("asc")
                .first();
            
            if (!firstChannel) {
                throw new Error("No channels found in this vision");
            }
            channelId = firstChannel._id;
        }

        const channel = await ctx.db.get(channelId);
        if (!channel) {
            throw new Error("Channel not found");
        }

        const chatId = await ctx.db.insert("chats", {
            title: args.title,
            userId: identity.userId?.toString(),
            visionId: args.visionId,
            channelId: channelId,
        });

        const now = new Date().toISOString();
        const nodeId = await ctx.db.insert("nodes", {
            title: args.title,
            variant: "AI",
            value: chatId, 
            thought: "AI-powered conversation node",
            channel: channelId,
            vision: args.visionId,
            userId,
            updatedAt: now,
        });

        await ctx.db.patch(chatId, {
            nodeId: nodeId
        });

        if (args.frameId && args.position) {
            const reactFlowNode = {
                id: crypto.randomUUID(),
                position: args.position,
                type: "AI",
                data: nodeId,
            };

            await ctx.db.insert("framed_node", {
                frameId: args.frameId,
                node: reactFlowNode,
            });

            await ctx.db.insert("frame_positions", {
                frameId: args.frameId,
                nodeId: nodeId,
                batch: [reactFlowNode],
                batchTimestamp: Date.now(),
            });

            await ctx.db.patch(nodeId, {
                frame: args.frameId,
            });
        }

        return { 
            chatId, 
            nodeId,
            success: true 
        };
    },
});

export const updateChatTitle = mutation({
    args: updateChatTitleArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id");
        }

        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }

        if (chat.userId !== identity.userId.toString()) {
            throw new Error("Unauthorized: You can only update your own chats");
        }

        await ctx.db.patch(args.chatId, {
            title: args.title.trim(),
        });

        if (chat.nodeId) {
            const node = await ctx.db.get(chat.nodeId);
            if (node) {
                await ctx.db.patch(chat.nodeId, {
                    title: args.title.trim(),
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        return { success: true };
    },
});

export const updateChatNodeId = mutation({
    args: updateChatNodeIdArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id");
        }

        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }

        if (chat.userId !== identity.userId.toString()) {
            throw new Error("Unauthorized: You can only update your own chats");
        }

        await ctx.db.patch(args.chatId, {
            nodeId: args.nodeId,
        });

        return { success: true };
    },
});

export const deleteChat = mutation({
    args: deleteChatArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id")
        }

        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }

        if (chat.userId !== identity.userId.toString()) {
            throw new Error("Unauthorized: You can only delete your own chats");
        }

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
            .collect();
            
        await Promise.all(messages.map((message) => ctx.db.delete(message._id)));

        if (chat.nodeId) {
            const node = await ctx.db.get(chat.nodeId);
            if (node) {
                const framedNodes = await ctx.db
                    .query("framed_node")
                    .filter((q) => q.eq(q.field("node.data"), chat.nodeId))
                    .collect();
                
                await Promise.all(framedNodes.map((fn) => ctx.db.delete(fn._id)));

                const framePositions = await ctx.db
                    .query("frame_positions")
                    .withIndex("by_node_frame", (q) => q.eq("nodeId", chat.nodeId!))
                    .collect();
                
                await Promise.all(framePositions.map((fp) => ctx.db.delete(fp._id)));

                await ctx.db.delete(chat.nodeId);
            }
        }

        await ctx.db.delete(args.chatId);
        
        return { success: true };
    },
});

export type CreateChatArgs = Infer<typeof createChatArgs>;
export type CreateChatWithNodeArgs = Infer<typeof createChatWithNodeArgs>;
export type ListUserChatsArgs = Infer<typeof listUserChatsArgs>;
export type GetChatArgs = Infer<typeof getChatArgs>;
export type DeleteChatArgs = Infer<typeof deleteChatArgs>;
export type ListVisionChatsPaginatedArgs = Infer<typeof listVisionChatsPaginatedArgs>;
export type UpdateChatTitleArgs = Infer<typeof updateChatTitleArgs>;
export type UpdateChatNodeIdArgs = Infer<typeof updateChatNodeIdArgs>;

