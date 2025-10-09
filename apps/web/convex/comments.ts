import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireAuth, requireVisionAccess } from "./utils/auth";
import { getUserPlan } from "./auth";
import { requirePermission, Permission } from "./permissions";

const createCommentArgs = v.object({
    content: v.string(),
    nodeId: v.id("nodes"),
    visionId: v.id("visions"),
    parentCommentId: v.optional(v.id("comments")),
    mentions: v.optional(v.array(v.string()))
});

const updateCommentArgs = v.object({
    commentId: v.id("comments"),
    content: v.string()
});

const deleteCommentArgs = v.object({
    commentId: v.id("comments")
});

const getNodeCommentsArgs = v.object({
    nodeId: v.id("nodes"),
    visionId: v.id("visions")
});

const getCommentChatArgs = v.object({
    commentId: v.id("comments")
});

const createCommentChatArgs = v.object({
    nodeId: v.id("nodes"),
    visionId: v.id("visions"),
    initialComment: v.string(),
    title: v.optional(v.string())
});

const getNodeCommentChatsArgs = v.object({
    nodeId: v.id("nodes"),
    visionId: v.id("visions")
});

const getInactiveCommentChatsArgs = v.object({
    nodeId: v.id("nodes"),
    visionId: v.id("visions")
});

const getAllInactiveCommentChatsArgs = v.object({
    visionId: v.id("visions")
});

const closeCommentChatArgs = v.object({
    chatId: v.id("chats")
});

export const createComment = mutation({
    args: createCommentArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id");
        }

        const plan = await getUserPlan(ctx.auth, ctx.db);
        requirePermission(plan, Permission.COMMENTING);

        await requireVisionAccess(ctx, args.visionId);

        const node = await ctx.db.get(args.nodeId);
        if (!node) {
            throw new Error("Node not found");
        }

        const now = new Date().toISOString();
        
        const commentId = await ctx.db.insert("comments", {
            content: args.content,
            authorId: identity.userId.toString(),
            nodeId: args.nodeId,
            visionId: args.visionId,
            channelId: node.channel,
            parentCommentId: args.parentCommentId,
            mentions: args.mentions || [],
            createdAt: now,
            updatedAt: now,
            isDeleted: false
        });

        if (args.mentions && args.mentions.length > 0) {
            const commentAuthor = await ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("externalId"), identity.userId!.toString()))
                .first();

            const mentionNotifications = args.mentions.map(async (mentionedUserId) => {
                if (mentionedUserId === identity.userId!.toString()) return;

                return ctx.db.insert("notifications", {
                    recipientId: mentionedUserId,
                    senderId: identity.userId!.toString(),
                    type: "comment_mention",
                    title: "You were mentioned in a comment",
                    message: `${commentAuthor?.name || 'Someone'} mentioned you in a comment on "${node.title}"`,
                    visionId: args.visionId,
                    commentId: commentId,
                    isRead: false,
                    createdAt: now
                });
            });

            await Promise.all(mentionNotifications);
        }

        return commentId;
    }
});

export const updateComment = mutation({
    args: updateCommentArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        
        if (!identity?.userId) {
            throw new Error("Failed to get the user Id");
        }

        const comment = await ctx.db.get(args.commentId);
        if (!comment) {
            throw new Error("Comment not found");
        }

        if (comment.authorId !== identity.userId.toString()) {
            throw new Error("You can only edit your own comments");
        }

        await ctx.db.patch(args.commentId, {
            content: args.content,
            updatedAt: new Date().toISOString()
        });

        return args.commentId;
    }
});

export const deleteComment = mutation({
    args: deleteCommentArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);
        
        if (!identity?.userId) {
            throw new Error("Failed to get the user Id");
        }

        const comment = await ctx.db.get(args.commentId);
        if (!comment) {
            throw new Error("Comment not found");
        }

        if (comment.authorId !== identity.userId.toString()) {
            throw new Error("You can only delete your own comments");
        }

        await ctx.db.patch(args.commentId, {
            isDeleted: true,
            updatedAt: new Date().toISOString()
        });

        return args.commentId;
    }
});

export const getNodeComments = query({
    args: getNodeCommentsArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.visionId);

        const comments = await ctx.db
            .query("comments")
            .withIndex("by_node", (q) => q.eq("nodeId", args.nodeId))
            .filter((q) => q.neq(q.field("isDeleted"), true))
            .order("asc")
            .collect();

        const enrichedComments = await Promise.all(
            comments.map(async (comment) => {
                const author = await ctx.db
                    .query("users")
                    .filter((q) => q.eq(q.field("externalId"), comment.authorId))
                    .first();

                return {
                    ...comment,
                    author: author ? {
                        _id: author._id,
                        name: author.name,
                        picture: author.picture,
                        email: author.email
                    } : null
                };
            })
        );

        return enrichedComments;
    }
});

export const createCommentChat = mutation({
    args: createCommentChatArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id");
        }

        const plan = await getUserPlan(ctx.auth, ctx.db);
        requirePermission(plan, Permission.COMMENTING);

        await requireVisionAccess(ctx, args.visionId);

        const node = await ctx.db.get(args.nodeId);
        if (!node) {
            throw new Error("Node not found");
        }

        const now = new Date().toISOString();
        
        const rootCommentId = await ctx.db.insert("comments", {
            content: args.initialComment,
            authorId: identity.userId.toString(),
            nodeId: args.nodeId,
            visionId: args.visionId,
            channelId: node.channel,
            mentions: [],
            createdAt: now,
            updatedAt: now,
            isDeleted: false
        });

        const chatTitle = args.title || `Comment on ${node.title}`;
        const chatId = await ctx.db.insert("chats", {
            title: chatTitle,
            userId: identity.userId.toString(),
            nodeId: args.nodeId,
            visionId: args.visionId,
            channelId: node.channel,
            isCommentChat: true,
            rootCommentId: rootCommentId,
            isActive: true
        });

        await ctx.db.insert("messages", {
            chatId: chatId,
            content: args.initialComment,
            role: "user" as const,
            userId: identity.userId.toString(),
            streamId: crypto.randomUUID()
        });

        return {
            chatId,
            rootCommentId,
            success: true
        };
    }
});

export const getCommentChat = query({
    args: getCommentChatArgs,
    handler: async (ctx, args) => {
        const comment = await ctx.db.get(args.commentId);
        if (!comment) {
            throw new Error("Comment not found");
        }

        await requireVisionAccess(ctx, comment.visionId);

        const chat = await ctx.db
            .query("chats")
            .withIndex("by_rootComment", (q) => q.eq("rootCommentId", args.commentId))
            .first();

        if (!chat) {
            return null;
        }

        const node = chat.nodeId ? await ctx.db.get(chat.nodeId) : null;

        return {
            ...chat,
            node: node ? {
                _id: node._id,
                title: node.title,
                channelId: node.channel
            } : null
        };
    }
});

export const getNodeCommentChats = query({
    args: getNodeCommentChatsArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.visionId);

        const chats = await ctx.db
            .query("chats")
            .withIndex("by_nodeId", (q) => q.eq("nodeId", args.nodeId))
            .filter((q) => q.eq(q.field("isCommentChat"), true))
            .filter((q) => q.neq(q.field("isActive"), false))
            .order("desc")
            .collect();

        const enrichedChats = await Promise.all(
            chats.map(async (chat) => {
                const rootComment = chat.rootCommentId ? await ctx.db.get(chat.rootCommentId) : null;
                
                const latestMessage = await ctx.db
                    .query("messages")
                    .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
                    .order("desc")
                    .first();

                const messageCount = await ctx.db
                    .query("messages")
                    .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
                    .collect()
                    .then(messages => messages.length);

                let commentAuthor = null;
                if (rootComment) {
                    commentAuthor = await ctx.db
                        .query("users")
                        .filter((q) => q.eq(q.field("externalId"), rootComment.authorId))
                        .first();
                }

                return {
                    ...chat,
                    rootComment: rootComment ? {
                        ...rootComment,
                        author: commentAuthor ? {
                            _id: commentAuthor._id,
                            name: commentAuthor.name,
                            picture: commentAuthor.picture
                        } : null
                    } : null,
                    lastMessage: latestMessage?.content || null,
                    lastMessageAt: latestMessage?._creationTime || chat._creationTime,
                    messageCount
                };
            })
        );

        return enrichedChats;
    }
});

export const closeCommentChat = mutation({
    args: closeCommentChatArgs,
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
            throw new Error("You can only close your own chats");
        }

        await ctx.db.patch(args.chatId, {
            isActive: false
        });

        return { success: true };
    }
});

export const getInactiveCommentChats = query({
    args: getInactiveCommentChatsArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.visionId);

        const chats = await ctx.db
            .query("chats")
            .withIndex("by_nodeId", (q) => q.eq("nodeId", args.nodeId))
            .filter((q) => q.eq(q.field("isCommentChat"), true))
            .filter((q) => q.eq(q.field("isActive"), false))
            .order("desc")
            .collect();

        const enrichedChats = await Promise.all(
            chats.map(async (chat) => {
                const rootComment = chat.rootCommentId ? await ctx.db.get(chat.rootCommentId) : null;
                
                const latestMessage = await ctx.db
                    .query("messages")
                    .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
                    .order("desc")
                    .first();

                const messageCount = await ctx.db
                    .query("messages")
                    .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
                    .collect()
                    .then(messages => messages.length);

                let commentAuthor = null;
                if (rootComment) {
                    commentAuthor = await ctx.db
                        .query("users")
                        .filter((q) => q.eq(q.field("externalId"), rootComment.authorId))
                        .first();
                }

                return {
                    ...chat,
                    rootComment: rootComment ? {
                        ...rootComment,
                        author: commentAuthor ? {
                            _id: commentAuthor._id,
                            name: commentAuthor.name,
                            picture: commentAuthor.picture
                        } : null
                    } : null,
                    lastMessage: latestMessage?.content || null,
                    lastMessageAt: latestMessage?._creationTime || chat._creationTime,
                    messageCount
                };
            })
        );

        return enrichedChats;
    }
});

export const getAllInactiveCommentChats = query({
    args: getAllInactiveCommentChatsArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.visionId);

        const chats = await ctx.db
            .query("chats")
            .withIndex("by_visionId", (q) => q.eq("visionId", args.visionId))
            .filter((q) => q.eq(q.field("isCommentChat"), true))
            .filter((q) => q.eq(q.field("isActive"), false))
            .order("desc")
            .collect();

        const enrichedChats = await Promise.all(
            chats.map(async (chat) => {
                const rootComment = chat.rootCommentId ? await ctx.db.get(chat.rootCommentId) : null;
                
                const latestMessage = await ctx.db
                    .query("messages")
                    .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
                    .order("desc")
                    .first();

                const messageCount = await ctx.db
                    .query("messages")
                    .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
                    .collect()
                    .then(messages => messages.length);

                let commentAuthor = null;
                if (rootComment) {
                    commentAuthor = await ctx.db
                        .query("users")
                        .filter((q) => q.eq(q.field("externalId"), rootComment.authorId))
                        .first();
                }

                let nodeInfo = null;
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
                    node: nodeInfo,
                    rootComment: rootComment ? {
                        ...rootComment,
                        author: commentAuthor ? {
                            _id: commentAuthor._id,
                            name: commentAuthor.name,
                            picture: commentAuthor.picture
                        } : null
                    } : null,
                    lastMessage: latestMessage?.content || null,
                    lastMessageAt: latestMessage?._creationTime || chat._creationTime,
                    messageCount
                };
            })
        );

        return enrichedChats;
    }
});

export type CreateCommentArgs = Infer<typeof createCommentArgs>;
export type UpdateCommentArgs = Infer<typeof updateCommentArgs>;
export type DeleteCommentArgs = Infer<typeof deleteCommentArgs>;
export type GetNodeCommentsArgs = Infer<typeof getNodeCommentsArgs>;
export type GetCommentChatArgs = Infer<typeof getCommentChatArgs>;
export type CreateCommentChatArgs = Infer<typeof createCommentChatArgs>;
export type GetNodeCommentChatsArgs = Infer<typeof getNodeCommentChatsArgs>;
export type GetInactiveCommentChatsArgs = Infer<typeof getInactiveCommentChatsArgs>;
export type GetAllInactiveCommentChatsArgs = Infer<typeof getAllInactiveCommentChatsArgs>;
export type CloseCommentChatArgs = Infer<typeof closeCommentChatArgs>;
