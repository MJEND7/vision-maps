import { mutation, query, QueryCtx } from "./_generated/server";
import { v, Infer } from "convex/values";
import { requireAuth } from "./utils/auth";
import { OrgMemberRole } from "./tables/organizationMember";
import { Id } from "./_generated/dataModel";

// Args schemas
const getByIdArgs = v.object({
    organizationId: v.id("organizations"),
});

const getUserOrganizationsArgs = v.object({
    userId: v.optional(v.string()),
});

const getMembersArgs = v.object({
    organizationId: v.id("organizations"),
});

const addMemberArgs = v.object({
    organizationId: v.id("organizations"),
    userId: v.string(),
    role: v.optional(v.string()),
});

const inviteMemberArgs = v.object({
    organizationId: v.id("organizations"),
    recipientEmail: v.string(),
    role: v.optional(v.string()),
});

const removeMemberArgs = v.object({
    organizationId: v.id("organizations"),
    userId: v.string(),
});

const updateMemberRoleArgs = v.object({
    organizationId: v.id("organizations"),
    userId: v.string(),
    newRole: v.string(),
});

const createArgs = v.object({
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
});

const updateArgs = v.object({
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    maxAllowedMemberships: v.optional(v.number()),
});

const deleteArgs = v.object({
    organizationId: v.id("organizations"),
});

export const getById = query({
    args: getByIdArgs,
    handler: async (ctx, { organizationId }) => {
        return await ctx.db.get(organizationId);
    },
});

export const getUserOrganizations = query({
    args: getUserOrganizationsArgs,
    handler: async (ctx, { userId }) => {
        const identity = await requireAuth(ctx);
        const userIdToUse = userId || identity.userId?.toString();

        if (!userIdToUse) {
            return [];
        }

        // Get all organization memberships for the user
        const memberships = await ctx.db
            .query("organization_members")
            .withIndex("by_user", (q) => q.eq("userId", userIdToUse))
            .collect();

        // Fetch organization details for each membership
        const organizations = await Promise.all(
            memberships.map(async (membership) => {
                const org = await ctx.db.get(membership.organizationId);
                if (!org) return null;

                return {
                    ...org,
                    role: membership.role,
                    membershipId: membership._id,
                };
            })
        );

        return organizations.filter((org) => org !== null);
    },
});

export const getMembers = query({
    args: getMembersArgs,
    handler: async (ctx, { organizationId }) => {
        const members = await ctx.db
            .query("organization_members")
            .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
            .collect();

        // Fetch user details for each member
        const membersWithUserInfo = await Promise.all(
            members.map(async (member) => {
                const user = await ctx.db
                    .query("users")
                    .withIndex("by_external_id", (q) => q.eq("externalId", member.userId))
                    .first();

                return {
                    id: member._id,
                    userId: member.userId,
                    role: member.role,
                    name: user?.name,
                    email: user?.email,
                    picture: user?.picture,
                    createdAt: member.createdAt,
                };
            })
        );

        return membersWithUserInfo;
    },
});

export const addMember = mutation({
    args: addMemberArgs,
    handler: async (ctx, { organizationId, userId, role }) => {
        const identity = await requireAuth(ctx);

        // Check if requester is an admin of the organization
        const requesterMembership = await ctx.db
            .query("organization_members")
            .withIndex("by_org_and_user", (q) =>
                q.eq("organizationId", organizationId).eq("userId", identity.userId?.toString() || "")
            )
            .first();

        if (!requesterMembership || requesterMembership.role !== OrgMemberRole.Admin) {
            throw new Error("Only admins can add members to the organization");
        }

        // Check if user is already a member
        const existingMembership = await ctx.db
            .query("organization_members")
            .withIndex("by_org_and_user", (q) =>
                q.eq("organizationId", organizationId).eq("userId", userId)
            )
            .first();

        if (existingMembership) {
            throw new Error("User is already a member of this organization");
        }

        // Add the member
        await ctx.db.insert("organization_members", {
            organizationId,
            userId,
            role: role || OrgMemberRole.Member,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Update members count
        const org = await ctx.db.get(organizationId);
        if (org) {
            await ctx.db.patch(organizationId, {
                membersCount: org.membersCount + 1,
                updatedAt: Date.now(),
            });
        }
    },
});

export const inviteMember = mutation({
    args: inviteMemberArgs,
    handler: async (ctx, { organizationId, recipientEmail, role }) => {
        const identity = await requireAuth(ctx);

        // Check if requester is an admin of the organization
        const requesterMembership = await ctx.db
            .query("organization_members")
            .withIndex("by_org_and_user", (q) =>
                q.eq("organizationId", organizationId).eq("userId", identity.userId?.toString() || "")
            )
            .first();

        if (!requesterMembership || requesterMembership.role !== OrgMemberRole.Admin) {
            throw new Error("Only admins can invite members to the organization");
        }

        // Get organization details
        const org = await ctx.db.get(organizationId);
        if (!org) {
            throw new Error("Organization not found");
        }

        // Find user by email
        const recipient = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("email"), recipientEmail))
            .first();

        if (!recipient) {
            throw new Error("User not found with this email address");
        }

        // Check if user is already a member
        const existingMembership = await ctx.db
            .query("organization_members")
            .withIndex("by_org_and_user", (q) =>
                q.eq("organizationId", organizationId).eq("userId", recipient.externalId)
            )
            .first();

        if (existingMembership) {
            throw new Error("User is already a member of this organization");
        }

        // Check if there's already a pending invite
        const allNotifications = await ctx.db
            .query("notifications")
            .filter((q) =>
                q.and(
                    q.eq(q.field("type"), "org_invite"),
                    q.eq(q.field("recipientId"), recipient.externalId),
                    q.eq(q.field("inviteStatus"), "pending"),
                    q.neq(q.field("isDeleted"), true)
                )
            )
            .collect();

        const existingInvite = allNotifications.find(
            (n) => n.inviteData && "organizationId" in n.inviteData && n.inviteData.organizationId === organizationId
        );

        if (existingInvite) {
            throw new Error("User already has a pending invitation to this organization");
        }

        // Get sender info
        const sender = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("externalId"), identity.userId!.toString()))
            .first();

        // Create notification
        const notificationId = await ctx.db.insert("notifications", {
            recipientId: recipient.externalId,
            senderId: identity.userId!.toString(),
            type: "org_invite",
            title: "Organization Invitation",
            message: `${sender?.name || 'Someone'} invited you to join "${org.name}" as ${role || "member"}`,
            inviteStatus: "pending",
            inviteData: {
                organizationId,
                organizationName: org.name,
                role: role || "member"
            },
            isRead: false,
            createdAt: new Date().toISOString()
        });

        return notificationId;
    },
});

export const removeMember = mutation({
    args: removeMemberArgs,
    handler: async (ctx, { organizationId, userId }) => {
        const identity = await requireAuth(ctx);

        const isSelfRemoval = identity.userId?.toString() === userId;

        // If not removing self, check if requester is an admin
        if (!isSelfRemoval) {
            const requesterMembership = await ctx.db
                .query("organization_members")
                .withIndex("by_org_and_user", (q) =>
                    q.eq("organizationId", organizationId).eq("userId", identity.userId?.toString() || "")
                )
                .first();

            if (!requesterMembership || requesterMembership.role !== OrgMemberRole.Admin) {
                throw new Error("Only admins can remove other members from the organization");
            }
        }

        // Find the member to remove
        const memberToRemove = await ctx.db
            .query("organization_members")
            .withIndex("by_org_and_user", (q) =>
                q.eq("organizationId", organizationId).eq("userId", userId)
            )
            .first();

        if (!memberToRemove) {
            throw new Error("User is not a member of this organization");
        }

        // Prevent removing the last admin
        if (memberToRemove.role === OrgMemberRole.Admin) {
            const adminCount = await ctx.db
                .query("organization_members")
                .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
                .filter((q) => q.eq(q.field("role"), OrgMemberRole.Admin))
                .collect();

            if (adminCount.length === 1) {
                throw new Error("Cannot remove the last admin from the organization");
            }
        }

        // Remove the member
        await ctx.db.delete(memberToRemove._id);

        // Update members count
        const org = await ctx.db.get(organizationId);
        if (org) {
            await ctx.db.patch(organizationId, {
                membersCount: Math.max(0, org.membersCount - 1),
                updatedAt: Date.now(),
            });
        }
    },
});

export const updateMemberRole = mutation({
    args: updateMemberRoleArgs,
    handler: async (ctx, { organizationId, userId, newRole }) => {
        const identity = await requireAuth(ctx);

        // Check if requester is an admin of the organization
        const requesterMembership = await ctx.db
            .query("organization_members")
            .withIndex("by_org_and_user", (q) =>
                q.eq("organizationId", organizationId).eq("userId", identity.userId?.toString() || "")
            )
            .first();

        if (!requesterMembership || requesterMembership.role !== OrgMemberRole.Admin) {
            throw new Error("Only admins can update member roles");
        }

        // Find the member to update
        const memberToUpdate = await ctx.db
            .query("organization_members")
            .withIndex("by_org_and_user", (q) =>
                q.eq("organizationId", organizationId).eq("userId", userId)
            )
            .first();

        if (!memberToUpdate) {
            throw new Error("User is not a member of this organization");
        }

        // If demoting an admin, check if they're the last one
        if (memberToUpdate.role === OrgMemberRole.Admin && newRole !== OrgMemberRole.Admin) {
            const adminCount = await ctx.db
                .query("organization_members")
                .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
                .filter((q) => q.eq(q.field("role"), OrgMemberRole.Admin))
                .collect();

            if (adminCount.length === 1) {
                throw new Error("Cannot demote the last admin of the organization");
            }
        }

        // Update the role
        await ctx.db.patch(memberToUpdate._id, {
            role: newRole,
            updatedAt: Date.now(),
        });
    },
});

export const create = mutation({
    args: createArgs,
    handler: async (ctx, { name, slug, imageUrl }) => {
        const identity = await requireAuth(ctx);

        if (!identity.userId) {
            throw new Error("User not authenticated");
        }

        const now = Date.now();
        const generatedSlug = slug || `${name.toLowerCase().replace(/\s+/g, '-')}-${now}`;

        // Create the organization
        const orgId = await ctx.db.insert("organizations", {
            name,
            slug: generatedSlug,
            imageUrl: imageUrl || undefined,
            hasImage: !!imageUrl,
            membersCount: 1,
            maxAllowedMemberships: 5,
            adminDeleteEnabled: true,
            publicMetadata: {},
            privateMetadata: {},
            createdBy: identity.userId.toString(),
            createdAt: now,
            updatedAt: now,
        });

        // Add creator as admin member
        await ctx.db.insert("organization_members", {
            organizationId: orgId,
            userId: identity.userId.toString(),
            role: OrgMemberRole.Admin,
            createdAt: now,
            updatedAt: now,
        });

        return orgId;
    },
});

export const update = mutation({
    args: updateArgs,
    handler: async (ctx, { organizationId, name, imageUrl, maxAllowedMemberships }) => {
        const identity = await requireAuth(ctx);

        // Check if requester is an admin of the organization
        const requesterMembership = await ctx.db
            .query("organization_members")
            .withIndex("by_org_and_user", (q) =>
                q.eq("organizationId", organizationId).eq("userId", identity.userId?.toString() || "")
            )
            .first();

        if (!requesterMembership || requesterMembership.role !== OrgMemberRole.Admin) {
            throw new Error("Only admins can update the organization");
        }

        const updates: any = {
            updatedAt: Date.now(),
        };

        if (name !== undefined) updates.name = name;
        if (imageUrl !== undefined) {
            updates.imageUrl = imageUrl;
            updates.hasImage = !!imageUrl;
        }
        if (maxAllowedMemberships !== undefined) updates.maxAllowedMemberships = maxAllowedMemberships;

        await ctx.db.patch(organizationId, updates);
    },
});

export const remove = mutation({
    args: deleteArgs,
    handler: async (ctx, { organizationId }) => {
        const identity = await requireAuth(ctx);

        // Check if requester is an admin of the organization
        const requesterMembership = await ctx.db
            .query("organization_members")
            .withIndex("by_org_and_user", (q) =>
                q.eq("organizationId", organizationId).eq("userId", identity.userId?.toString() || "")
            )
            .first();

        if (!requesterMembership || requesterMembership.role !== OrgMemberRole.Admin) {
            throw new Error("Only admins can delete the organization");
        }

        // Delete all members first
        const members = await ctx.db
            .query("organization_members")
            .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
            .collect();

        for (const member of members) {
            await ctx.db.delete(member._id);
        }

        // Delete the organization
        await ctx.db.delete(organizationId);
    },
});

// Type exports
export type GetOrgByIdArgs = Infer<typeof getByIdArgs>;
export type GetUserOrganizationsArgs = Infer<typeof getUserOrganizationsArgs>;
export type GetOrgMembersArgs = Infer<typeof getMembersArgs>;
export type AddOrgMemberArgs = Infer<typeof addMemberArgs>;
export type RemoveOrgMemberArgs = Infer<typeof removeMemberArgs>;
export type UpdateOrgMemberRoleArgs = Infer<typeof updateMemberRoleArgs>;
export type CreateOrgArgs = Infer<typeof createArgs>;
export type UpdateOrgArgs = Infer<typeof updateArgs>;
export type DeleteOrgArgs = Infer<typeof deleteArgs>;
