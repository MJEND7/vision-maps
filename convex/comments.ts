import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireVisionAccess } from "./utils/auth";
import { Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

// Helper function to extract @mentions from comment content
function extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[1]);
    }
    return mentions;
}

// Helper function to validate mentioned users are part of the vision
async function validateMentions(
    ctx: QueryCtx | MutationCtx,
    visionId: Id<"visions">,
    mentions: string[]
): Promise<Id<"users">[]> {
    const validUserIds: Id<"users">[] = [];

    for (const mention of mentions) {
        // Find user by external ID or name (depending on your user lookup strategy)
        const user = await ctx.db
            .query("users")
            .filter((q) => q.or(
                q.eq(q.field("name"), mention),
                q.eq(q.field("externalId"), mention)
            ))
            .first();

        if (user) {
            // Check if user is part of the vision
            const visionUser = await ctx.db
                .query("vision_users")
                .withIndex("by_visionId", (q) => q.eq("visionId", visionId))
                .filter((q) => q.eq(q.field("userId"), user.externalId))
                .first();

            if (visionUser) {
                validUserIds.push(user.externalId as Id<"users">);
            }
        }
    }

    return validUserIds;
}

export const create = mutation({
    args: {
        content: v.string(),
        visionId: v.id("visions"),
        nodeId: v.optional(v.id("nodes")),
        frameId: v.optional(v.id("frames")),
        channelId: v.optional(v.id("channels")),
        parentCommentId: v.optional(v.id("comments"))
    },
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.visionId);
        const identity = await requireAuth(ctx);

        if (!identity.userId) {
            throw new Error("Failed to get userId");
        }

        const now = new Date().toISOString();

        // Extract and validate mentions
        const mentionStrings = extractMentions(args.content);
        const validMentions = await validateMentions(ctx, args.visionId, mentionStrings);

        const commentId = await ctx.db.insert("comments", {
            content: args.content,
            authorId: identity.userId!.toString(),
            visionId: args.visionId,
            nodeId: args.nodeId,
            frameId: args.frameId,
            channelId: args.channelId,
            parentCommentId: args.parentCommentId,
            mentions: validMentions,
            createdAt: now,
            updatedAt: now
        });

        // Get user record for notification
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        // Create notifications for mentions
        for (const mentionedUserId of validMentions) {
            await ctx.db.insert("notifications", {
                recipientId: mentionedUserId,
                senderId: identity.userId!.toString(),
                type: "mention",
                title: "You were mentioned in a comment",
                message: `${user?.name || 'Someone'} mentioned you in a comment: "${args.content.substring(0, 100)}${args.content.length > 100 ? '...' : ''}"`,
                visionId: args.visionId,
                commentId,
                isRead: false,
                createdAt: now
            });
        }

        return commentId;
    }
});

export const getByVision = query({
    args: {
        visionId: v.id("visions"),
        limit: v.optional(v.number()),
        cursor: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.visionId);

        const comments = await ctx.db
            .query("comments")
            .withIndex("by_vision_created", (q) => q.eq("visionId", args.visionId))
            .order("desc")
            .filter((q) => q.neq(q.field("isDeleted"), true))
            .take(args.limit || 50);

        // Populate author information
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
                        picture: author.picture
                    } : null
                };
            })
        );

        return enrichedComments;
    }
});

export const getByChannel = query({
    args: {
        channelId: v.id("channels"),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        // Get the channel first to verify vision access
        const channel = await ctx.db.get(args.channelId);
        if (!channel || !channel.vision) {
            throw new Error("Channel not found or has no vision");
        }

        await requireVisionAccess(ctx, channel.vision);

        const comments = await ctx.db
            .query("comments")
            .withIndex("by_channel_created", (q) => q.eq("channelId", args.channelId))
            .order("desc")
            .filter((q) => q.neq(q.field("isDeleted"), true))
            .take(args.limit || 50);

        // Populate author information
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
                        picture: author.picture
                    } : null
                };
            })
        );

        return enrichedComments;
    }
});

export const search = query({
    args: {
        visionId: v.id("visions"),
        searchTerm: v.string(),
        authorId: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.visionId);

        let query = ctx.db
            .query("comments")
            .withIndex("by_vision", (q) => q.eq("visionId", args.visionId))
            .filter((q) => q.neq(q.field("isDeleted"), true));

        // Filter by author if specified
        if (args.authorId) {
            query = query.filter((q) => q.eq(q.field("authorId"), args.authorId));
        }

        const comments = await query.take(args.limit || 50);

        // Filter by search term in memory (Convex doesn't support full-text search)
        const filteredComments = comments.filter(comment =>
            comment.content.toLowerCase().includes(args.searchTerm.toLowerCase())
        );

        // Populate author information
        const enrichedComments = await Promise.all(
            filteredComments.map(async (comment) => {
                const author = await ctx.db
                    .query("users")
                    .filter((q) => q.eq(q.field("externalId"), comment.authorId))
                    .first();
                return {
                    ...comment,
                    author: author ? {
                        _id: author._id,
                        name: author.name,
                        picture: author.picture
                    } : null
                };
            })
        );

        return enrichedComments;
    }
});

export const update = mutation({
    args: {
        commentId: v.id("comments"),
        content: v.string()
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity.userId) {
            throw new Error("Failed to get userId");
        }

        const comment = await ctx.db.get(args.commentId);
        if (!comment) {
            throw new Error("Comment not found");
        }

        // Get user record
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        if (!user || user.externalId !== comment.authorId) {
            throw new Error("You can only edit your own comments");
        }

        await requireVisionAccess(ctx, comment.visionId);

        const now = new Date().toISOString();

        // Extract and validate new mentions
        const mentionStrings = extractMentions(args.content);
        const validMentions = await validateMentions(ctx, comment.visionId, mentionStrings);

        await ctx.db.patch(args.commentId, {
            content: args.content,
            mentions: validMentions,
            updatedAt: now
        });

        return args.commentId;
    }
});

export const remove = mutation({
    args: {
        commentId: v.id("comments")
    },
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity.userId) {
            throw new Error("Failed to get userId");
        }

        const comment = await ctx.db.get(args.commentId);
        if (!comment) {
            throw new Error("Comment not found");
        }

        // Get user record
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        if (!user || user.externalId !== comment.authorId) {
            throw new Error("You can only delete your own comments");
        }

        await requireVisionAccess(ctx, comment.visionId);

        // Soft delete
        await ctx.db.patch(args.commentId, {
            isDeleted: true,
            updatedAt: new Date().toISOString()
        });

        return args.commentId;
    }
});
