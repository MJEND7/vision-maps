import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { VisionAccessRole, VisionUserStatus } from "../tables/visions";

export async function getUserByIdenityId(ctx: QueryCtx | MutationCtx, userId: string) {
    const user = await ctx.db.query("users").withIndex("by_external_id", (u) => u.eq("externalId", userId)).first();
    if (!user || !('name' in user)) {
        return null;
    }

    return user
}

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Unauthenticated call");
    }
    return identity;
}

export async function requireVisionAccess(
    ctx: QueryCtx | MutationCtx,
    visionId: Id<"visions"> | undefined,
    requiredRole?: VisionAccessRole
) {
    if (!visionId) {
        throw new Error("Vision ID is required");
    }
    const identity = await requireAuth(ctx);

    const visionUser = await ctx.db
        .query("vision_users")
        .withIndex("by_visionId", (q) => q.eq("visionId", visionId))
        .filter((q) => 
            q.and(
                q.eq(q.field("userId"), identity.userId),
                q.eq(q.field("status"), VisionUserStatus.Approved)
            )
        )
        .first();

    if (!visionUser) {
        throw new Error("Access denied: You are not a member of this vision");
    }

    if (requiredRole && visionUser.role !== requiredRole && visionUser.role !== VisionAccessRole.Owner) {
        throw new Error(`Access denied: ${requiredRole} role required`);
    }

    return { identity, visionUser };
}
