import { internalMutation, query, QueryCtx } from "../_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator, Infer } from "convex/values";
import { requireVisionAccess } from "../utils/auth";

// Args schemas
const currentArgs = v.object({});

const upsertFromClerkArgs = v.object({
    data: v.any() as Validator<UserJSON>,
});

const deleteFromClerkArgs = v.object({
    clerkUserId: v.string(),
});

export const current = query({
    args: currentArgs,
    handler: async (ctx) => {
        return await getCurrentUser(ctx);
    },
});

export const upsertFromClerk = internalMutation({
    args: upsertFromClerkArgs,
    async handler(ctx, { data }) {
        const userAttributes = {
            name: `${data.first_name} ${data.last_name ? data.last_name : "" }`,
            email: data.email_addresses?.[0]?.email_address,
            externalId: data.id,
            tokenIdentifier: `https://clerk.com|${data.id}`,
            picture: data.image_url,
        };

        const user = await userByExternalId(ctx, data.id);
        if (user === null) {
            await ctx.db.insert("users", userAttributes);
        } else {
            await ctx.db.patch(user._id, userAttributes);
        }
    },
});

export const deleteFromClerk = internalMutation({
    args: deleteFromClerkArgs,
    async handler(ctx, { clerkUserId }) {
        const user = await userByExternalId(ctx, clerkUserId);

        if (user !== null) {
            await ctx.db.delete(user._id);
        } else {
            console.warn(
                `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
            );
        }
    },
});

// Add this to your args schemas
const searchUsersArgs = v.object({
    searchTerm: v.string(),
    vision: v.id("visions"),
    limit: v.optional(v.number()),
});

const searchUsersByEmailArgs = v.object({
    searchTerm: v.string(),
    limit: v.optional(v.number()),
});

const getUsersByExternalIdsArgs = v.object({
    externalIds: v.array(v.string()),
});

// Add this query function using search index
export const searchUsers = query({
    args: searchUsersArgs,
    handler: async (ctx, { searchTerm, vision, limit = 10 }) => {
        if (!requireVisionAccess(ctx, vision)) {
            throw new Error("Failed to get access to vision")
        }

        if (!searchTerm) {
            // Get connected users for this vision
            const visionUsers = await ctx.db
                .query("vision_users")
                .withIndex("by_visionId", (q) => q.eq("visionId", vision))
                .take(limit);

            // Fetch user details for each connected user
            const userPromises = visionUsers.map(visionUser =>
                ctx.db
                    .query("users")
                    .withIndex("by_external_id", (q) => q.eq("externalId", visionUser.userId))
                    .first()
            );

            const users = await Promise.all(userPromises);

            // Filter out any null results and map to the expected format
            return users
                .filter(user => user !== null)
                .map((user) => ({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    picture: user.picture,
                    externalId: user.externalId,
                    isInVisions: true,
                }));
        }

        // Simple email validation
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchTerm);

        let results = [];

        if (isEmail) {
            // Search by exact email match only
            results = await ctx.db
                .query("users")
                .withIndex("by_email", (q) => q.eq("email", searchTerm.toLowerCase()))
                .take(limit);
        } else {
            // Search by name using text search index only
            results = await ctx.db
                .query("users")
                .withSearchIndex("search_name", (q) => q.search("name", searchTerm))
                .take(limit);
        }

        return results
            .slice(0, limit)
            .map((user) => ({
                _id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture,
                externalId: user.externalId,
                isInVisions: false,
            }));
    },
});

export const searchUsersByEmail = query({
    args: searchUsersByEmailArgs,
    handler: async (ctx, { searchTerm, limit = 10 }) => {
        if (!searchTerm || searchTerm.length < 2) {
            return [];
        }

        // Search by email or name
        let users;
        if (searchTerm.includes("@")) {
            // Email search
            users = await ctx.db
                .query("users")
                .withIndex("by_email", (q) => q.eq("email", searchTerm))
                .take(limit);
        } else {
            // Name search
            users = await ctx.db
                .query("users")
                .withSearchIndex("search_name", (q) => q.search("name", searchTerm))
                .take(limit);
        }

        return users.map(user => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            picture: user.picture,
            externalId: user.externalId,
        }));
    },
});

export const getUsersByExternalIds = query({
    args: getUsersByExternalIdsArgs,
    handler: async (ctx, { externalIds }) => {
        if (!externalIds.length) return [];
        
        // Get users by their external IDs
        const userPromises = externalIds.map(externalId =>
            ctx.db
                .query("users")
                .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
                .unique()
        );

        const users = await Promise.all(userPromises);
        return users.filter(user => user !== null);
    },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
    const userRecord = await getCurrentUser(ctx);
    if (!userRecord) throw new Error("Can't get current user");
    return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
        return null;
    }
    return await userByExternalId(ctx, identity.subject.replace("https://clerk.com|", ""));
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
    return await ctx.db
        .query("users")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .unique();
}

// Type exports
export type GetCurrentUserArgs = Infer<typeof currentArgs>;
export type UpsertUserFromClerkArgs = Infer<typeof upsertFromClerkArgs>;
export type DeleteUserFromClerkArgs = Infer<typeof deleteFromClerkArgs>;
export type SearchUsersArgs = Infer<typeof searchUsersArgs>;
export type SearchUsersByEmailArgs = Infer<typeof searchUsersByEmailArgs>;
export type GetUsersByExternalIdsArgs = Infer<typeof getUsersByExternalIdsArgs>;
