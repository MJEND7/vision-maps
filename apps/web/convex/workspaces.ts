import { mutation, query } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireAuth, optionalAuth } from "./utils/auth";
import { WorkspaceMemberRole } from "./tables/workspaceMember";
import { internal } from "./_generated/api";

const getByIdArgs = v.object({
    workspaceId: v.id("workspaces"),
});

const getUserWorkspacesArgs = v.object({
    userId: v.optional(v.string()),
});

const getMembersArgs = v.object({
    workspaceId: v.id("workspaces"),
});

const addMemberArgs = v.object({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: v.optional(v.string()),
});

const inviteMemberArgs = v.object({
    workspaceId: v.id("workspaces"),
    recipientEmail: v.string(),
    role: v.optional(v.string()),
});

const removeMemberArgs = v.object({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
});

const updateMemberRoleArgs = v.object({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    newRole: v.string(),
});

const createArgs = v.object({
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
});

const updateArgs = v.object({
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    maxAllowedMemberships: v.optional(v.number()),
});

const deleteArgs = v.object({
    workspaceId: v.id("workspaces"),
});

export const getById = query({
    args: getByIdArgs,
    handler: async (ctx, { workspaceId }) => {
        return await ctx.db.get(workspaceId);
    },
});

export const getUserWorkspaces = query({
    args: getUserWorkspacesArgs,
    handler: async (ctx, { userId }) => {
        const identity = await optionalAuth(ctx);
        if (!identity) {
            return [];
        }

        const userIdToUse = userId || identity.userId?.toString();

        if (!userIdToUse) {
            return [];
        }

        const memberships = await ctx.db
            .query("workspace_members")
            .withIndex("by_user", (q) => q.eq("userId", userIdToUse))
            .collect();

        const workspaces = await Promise.all(
            memberships.map(async (membership) => {
                const workspace = await ctx.db.get(membership.workspaceId);
                if (!workspace) return null;

                return {
                    ...workspace,
                    role: membership.role,
                    membershipId: membership._id,
                };
            })
        );

        return workspaces.filter((workspace) => workspace !== null);
    },
});

export const getDefaultWorkspaceForUser = query({
    args: v.object({
        userId: v.optional(v.string()),
    }),
    handler: async (ctx, { userId }) => {
        const identity = await optionalAuth(ctx);
        if (!identity) {
            return null;
        }

        const userIdToUse = userId || identity.userId?.toString();

        if (!userIdToUse) {
            return null;
        }

        const memberships = await ctx.db
            .query("workspace_members")
            .withIndex("by_user", (q) => q.eq("userId", userIdToUse))
            .collect();

        for (const membership of memberships) {
            const workspace = await ctx.db.get(membership.workspaceId);
            if (workspace && workspace.isDefault) {
                return workspace;
            }
        }

        return null;
    },
});

export const getMembers = query({
    args: getMembersArgs,
    handler: async (ctx, { workspaceId }) => {
        const members = await ctx.db
            .query("workspace_members")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
            .collect();

        const membersWithDetails = await Promise.all(
            members.map(async (member) => {
                const user = await ctx.db
                    .query("users")
                    .filter((q) => q.eq(q.field("externalId"), member.userId))
                    .first();

                return {
                    ...member,
                    user: user || null,
                };
            })
        );

        return membersWithDetails;
    },
});

export const create = mutation({
    args: createArgs,
    handler: async (ctx, { name, slug, imageUrl, isDefault }) => {
        const identity = await requireAuth(ctx);

        const now = Date.now();
        const generatedSlug = slug || `${name.toLowerCase().replace(/\s+/g, '-')}-${now}`;

        const workspaceId = await ctx.db.insert("workspaces", {
            name,
            slug: generatedSlug,
            imageUrl: imageUrl || undefined,
            hasImage: !!imageUrl,
            membersCount: 1,
            maxAllowedMemberships: 5,
            adminDeleteEnabled: true,
            publicMetadata: {},
            privateMetadata: {},
            createdBy: identity.userId!.toString(),
            isDefault: isDefault || false,
            createdAt: now,
            updatedAt: now,
        });

        // Creator added as Admin
        await ctx.db.insert("workspace_members", {
            workspaceId,
            userId: identity.userId!.toString(),
            role: WorkspaceMemberRole.Admin,
            createdAt: now,
            updatedAt: now,
        });

        return workspaceId;
    },
});

export const update = mutation({
    args: updateArgs,
    handler: async (ctx, { workspaceId, name, imageUrl, maxAllowedMemberships }) => {
        const identity = await requireAuth(ctx);

        const workspace = await ctx.db.get(workspaceId);
        if (!workspace) {
            throw new Error("Workspace not found");
        }

        // Check if user is admin
        const membership = await ctx.db
            .query("workspace_members")
            .withIndex("by_workspace_and_user", (q) =>
                q.eq("workspaceId", workspaceId).eq("userId", identity.userId!.toString())
            )
            .first();

        if (!membership || membership.role !== WorkspaceMemberRole.Admin) {
            throw new Error("Only admins can update workspace");
        }

        const updates: Record<string, any> = {
            updatedAt: Date.now(),
        };

        if (name !== undefined) updates.name = name;
        if (imageUrl !== undefined) {
            updates.imageUrl = imageUrl || undefined;
            updates.hasImage = !!imageUrl;
        }
        if (maxAllowedMemberships !== undefined) updates.maxAllowedMemberships = maxAllowedMemberships;

        await ctx.db.patch(workspaceId, updates);

        return await ctx.db.get(workspaceId);
    },
});

export const addMember = mutation({
    args: addMemberArgs,
    handler: async (ctx, { workspaceId, userId, role }) => {
        const identity = await requireAuth(ctx);

        const workspace = await ctx.db.get(workspaceId);
        if (!workspace) {
            throw new Error("Workspace not found");
        }

        // Check if requester is admin
        const requesterMembership = await ctx.db
            .query("workspace_members")
            .withIndex("by_workspace_and_user", (q) =>
                q.eq("workspaceId", workspaceId).eq("userId", identity.userId!.toString())
            )
            .first();

        if (!requesterMembership || requesterMembership.role !== WorkspaceMemberRole.Admin) {
            throw new Error("Only admins can add members");
        }

        // Check if member already exists
        const existingMembership = await ctx.db
            .query("workspace_members")
            .withIndex("by_workspace_and_user", (q) =>
                q.eq("workspaceId", workspaceId).eq("userId", userId)
            )
            .first();

        if (existingMembership) {
            throw new Error("User is already a member of this workspace");
        }

        const now = Date.now();
        const memberRole = role || WorkspaceMemberRole.Member;

        await ctx.db.insert("workspace_members", {
            workspaceId,
            userId,
            role: memberRole,
            createdAt: now,
            updatedAt: now,
        });

        // Update member count
        await ctx.db.patch(workspaceId, {
            membersCount: workspace.membersCount + 1,
            updatedAt: now,
        });

        // Auto-add to existing workspace visions
        const visions = await ctx.db
            .query("visions")
            .filter((q) => q.eq(q.field("workspace"), workspaceId))
            .collect();

        for (const vision of visions) {
            const existingVisionUser = await ctx.db
                .query("vision_users")
                .filter((q) =>
                    q.and(
                        q.eq(q.field("visionId"), vision._id),
                        q.eq(q.field("userId"), userId)
                    )
                )
                .first();

            if (!existingVisionUser) {
                await ctx.db.insert("vision_users", {
                    userId,
                    role: "editor",
                    status: "approved",
                    visionId: vision._id,
                });
            }
        }

        return await ctx.db.get(workspaceId);
    },
});

export const removeMember = mutation({
    args: removeMemberArgs,
    handler: async (ctx, { workspaceId, userId }) => {
        const identity = await requireAuth(ctx);

        const workspace = await ctx.db.get(workspaceId);
        if (!workspace) {
            throw new Error("Workspace not found");
        }

        // Check if requester is admin
        const requesterMembership = await ctx.db
            .query("workspace_members")
            .withIndex("by_workspace_and_user", (q) =>
                q.eq("workspaceId", workspaceId).eq("userId", identity.userId!.toString())
            )
            .first();

        if (!requesterMembership || requesterMembership.role !== WorkspaceMemberRole.Admin) {
            throw new Error("Only admins can remove members");
        }

        // Check if user to be removed is the last admin
        const adminCount = await ctx.db
            .query("workspace_members")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
            .collect()
            .then((members) =>
                members.filter((m) => m.role === WorkspaceMemberRole.Admin).length
            );

        if (adminCount === 1 && userId === (await ctx.db.get(workspaceId))?.createdBy) {
            throw new Error("Cannot remove the last admin from workspace");
        }

        const memberToRemove = await ctx.db
            .query("workspace_members")
            .withIndex("by_workspace_and_user", (q) =>
                q.eq("workspaceId", workspaceId).eq("userId", userId)
            )
            .first();

        if (!memberToRemove) {
            throw new Error("User is not a member of this workspace");
        }

        await ctx.db.delete(memberToRemove._id);

        // Update member count
        await ctx.db.patch(workspaceId, {
            membersCount: Math.max(0, workspace.membersCount - 1),
            updatedAt: Date.now(),
        });

        // Remove from all workspace visions
        const visions = await ctx.db
            .query("visions")
            .filter((q) => q.eq(q.field("workspace"), workspaceId))
            .collect();

        for (const vision of visions) {
            const visionUsers = await ctx.db
                .query("vision_users")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .collect();

            for (const visionUser of visionUsers) {
                if (visionUser.visionId === vision._id) {
                    await ctx.db.delete(visionUser._id);
                }
            }
        }

        return await ctx.db.get(workspaceId);
    },
});

export const updateMemberRole = mutation({
    args: updateMemberRoleArgs,
    handler: async (ctx, { workspaceId, userId, newRole }) => {
        const identity = await requireAuth(ctx);

        const workspace = await ctx.db.get(workspaceId);
        if (!workspace) {
            throw new Error("Workspace not found");
        }

        // Check if requester is admin
        const requesterMembership = await ctx.db
            .query("workspace_members")
            .withIndex("by_workspace_and_user", (q) =>
                q.eq("workspaceId", workspaceId).eq("userId", identity.userId!.toString())
            )
            .first();

        if (!requesterMembership || requesterMembership.role !== WorkspaceMemberRole.Admin) {
            throw new Error("Only admins can update member roles");
        }

        // Prevent demoting last admin
        if (newRole === WorkspaceMemberRole.Member) {
            const adminCount = await ctx.db
                .query("workspace_members")
                .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
                .collect()
                .then((members) =>
                    members.filter((m) => m.role === WorkspaceMemberRole.Admin).length
                );

            if (adminCount === 1 && userId === workspace.createdBy) {
                throw new Error("Cannot demote the last admin");
            }
        }

        const memberToUpdate = await ctx.db
            .query("workspace_members")
            .withIndex("by_workspace_and_user", (q) =>
                q.eq("workspaceId", workspaceId).eq("userId", userId)
            )
            .first();

        if (!memberToUpdate) {
            throw new Error("User is not a member of this workspace");
        }

        await ctx.db.patch(memberToUpdate._id, {
            role: newRole,
            updatedAt: Date.now(),
        });

        return await ctx.db.get(workspaceId);
    },
});

export const remove = mutation({
    args: deleteArgs,
    handler: async (ctx, { workspaceId }) => {
        const identity = await requireAuth(ctx);

        const workspace = await ctx.db.get(workspaceId);
        if (!workspace) {
            throw new Error("Workspace not found");
        }

        // Check if requester is admin (creator)
        if (workspace.createdBy !== identity.userId!.toString()) {
            throw new Error("Only workspace creator can delete workspace");
        }

        // Delete all workspace visions (cascading deletes)
        const visions = await ctx.db
            .query("visions")
            .filter((q) => q.eq(q.field("workspace"), workspaceId))
            .collect();

        for (const vision of visions) {
            // Delete vision cascading
            // 1. Delete all channels and their content
            const channels = await ctx.db
                .query("channels")
                .withIndex("by_vision", (q) => q.eq("vision", vision._id))
                .collect();

            for (const channel of channels) {
                const frames = await ctx.db
                    .query("frames")
                    .withIndex("by_channel", (q) => q.eq("channel", channel._id))
                    .collect();

                for (const frame of frames) {
                    const framedNodes = await ctx.db
                        .query("framed_node")
                        .withIndex("by_frame", (q) => q.eq("frameId", frame._id))
                        .collect();
                    for (const fn of framedNodes) {
                        await ctx.db.delete(fn._id);
                    }

                    const framePositions = await ctx.db
                        .query("frame_positions")
                        .withIndex("by_frame", (q) => q.eq("frameId", frame._id))
                        .collect();
                    for (const fp of framePositions) {
                        await ctx.db.delete(fp._id);
                    }

                    const edges = await ctx.db
                        .query("edges")
                        .withIndex("frame", (q) => q.eq("frameId", frame._id))
                        .collect();
                    for (const edge of edges) {
                        await ctx.db.delete(edge._id);
                    }

                    const nodes = await ctx.db
                        .query("nodes")
                        .withIndex("by_frame", (q) => q.eq("frame", frame._id))
                        .collect();
                    for (const node of nodes) {
                        await ctx.db.delete(node._id);
                    }

                    await ctx.db.delete(frame._id);
                }

                await ctx.db.delete(channel._id);
            }

            // 2. Delete all chats and messages
            const chats = await ctx.db
                .query("chats")
                .withIndex("by_visionId", (q) => q.eq("visionId", vision._id))
                .collect();

            for (const chat of chats) {
                const messages = await ctx.db
                    .query("messages")
                    .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
                    .collect();
                for (const message of messages) {
                    await ctx.db.delete(message._id);
                }
                await ctx.db.delete(chat._id);
            }

            // 3. Delete all comments
            const comments = await ctx.db
                .query("comments")
                .withIndex("by_vision", (q) => q.eq("visionId", vision._id))
                .collect();
            for (const comment of comments) {
                await ctx.db.delete(comment._id);
            }

            // 4. Delete all notifications
            const notifications = await ctx.db
                .query("notifications")
                .withIndex("by_vision", (q) => q.eq("visionId", vision._id))
                .collect();
            for (const notification of notifications) {
                await ctx.db.delete(notification._id);
            }

            // 5. Delete all vision_users
            const visionUsers = await ctx.db
                .query("vision_users")
                .withIndex("by_visionId", (q) => q.eq("visionId", vision._id))
                .collect();
            for (const visionUser of visionUsers) {
                await ctx.db.delete(visionUser._id);
            }

            // 6. Delete the vision
            await ctx.db.delete(vision._id);
        }

        // Delete all workspace members
        const members = await ctx.db
            .query("workspace_members")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
            .collect();

        for (const member of members) {
            await ctx.db.delete(member._id);
        }

        // Delete workspace
        await ctx.db.delete(workspaceId);

        return { success: true };
    },
});

export const createDefaultWorkspaceForUser = mutation({
    args: v.object({
        userId: v.string(),
    }),
    handler: async (ctx, { userId }) => {
        const now = Date.now();
        const defaultSlug = `workspace-${userId.substring(0, 8)}-${now}`;

        const workspaceId = await ctx.db.insert("workspaces", {
            name: "Default Workspace",
            slug: defaultSlug,
            imageUrl: undefined,
            hasImage: false,
            membersCount: 1,
            maxAllowedMemberships: 5,
            adminDeleteEnabled: true,
            publicMetadata: {},
            privateMetadata: {},
            createdBy: userId,
            isDefault: true,
            createdAt: now,
            updatedAt: now,
        });

        // Add user as Admin
        await ctx.db.insert("workspace_members", {
            workspaceId,
            userId,
            role: WorkspaceMemberRole.Admin,
            createdAt: now,
            updatedAt: now,
        });

        return workspaceId;
    },
});
