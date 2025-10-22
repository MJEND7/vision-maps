import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { VisionAccessRole, VisionUserStatus } from "../tables/visions";
import { getUserPlan } from "../auth";
import { Plan } from "../permissions";

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

export async function optionalAuth(ctx: QueryCtx | MutationCtx) {
    return await ctx.auth.getUserIdentity();
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

    const vision = await ctx.db.get(visionId);
    if (!vision) {
        throw new Error("Vision not found");
    }

    const currentPlan = await getUserPlan(ctx.auth, ctx.db);

    const visionUser = await ctx.db
        .query("vision_users")
        .withIndex("by_visionId", (q) => q.eq("visionId", visionId))
        .filter((q) =>
            q.and(
                q.eq(q.field("userId"), identity.userId),
                q.or(
                    q.eq(q.field("status"), VisionUserStatus.Approved),
                    q.eq(q.field("status"), undefined)
                )
            )
        )
        .first();

    if (visionUser) {
        if (currentPlan === Plan.FREE && vision.createdWithPlan && vision.createdWithPlan !== "free") {
            throw new Error("This vision was created with a paid plan. Please upgrade to access it. Current plain: "+currentPlan);
        }

        if (requiredRole && visionUser.role !== requiredRole && visionUser.role !== VisionAccessRole.Owner) {
            throw new Error(`Access denied: ${requiredRole} role required`);
        }
        return { identity, visionUser };
    }

    // User has implicit access if they're a member of the workspace
    const workspaceMember = await ctx.db
        .query("workspace_members")
        .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", vision.workspace as Id<"workspaces">).eq("userId", identity.userId! as string)
        )
        .first();

    if (workspaceMember) {
        if (currentPlan === Plan.FREE && vision.createdWithPlan && vision.createdWithPlan !== "free") {
            throw new Error("This vision was created with a paid plan. Please upgrade to access it.");
        }

        const implicitVisionUser = {
            userId: identity.userId!,
            role: VisionAccessRole.Editor,
            status: VisionUserStatus.Approved,
            visionId: visionId,
        };

        if (requiredRole === VisionAccessRole.Owner) {
            throw new Error("Access denied: Owner role required");
        }

        return { identity, visionUser: implicitVisionUser };
    }

    throw new Error("Access denied: You are not a member of this vision");
}
