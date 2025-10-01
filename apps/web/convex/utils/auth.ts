import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { VisionAccessRole, VisionUserStatus } from "../visions/table";

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

    // Get the vision to check if it's an organization vision
    const vision = await ctx.db.get(visionId);
    if (!vision) {
        throw new Error("Vision not found");
    }

    // Check for explicit vision membership first
    const visionUser = await ctx.db
        .query("vision_users")
        .withIndex("by_visionId", (q) => q.eq("visionId", visionId))
        .filter((q) => 
            q.and(
                q.eq(q.field("userId"), identity.userId),
                q.or(
                    q.eq(q.field("status"), VisionUserStatus.Approved),
                    q.eq(q.field("status"), undefined) // For backward compatibility with existing data
                )
            )
        )
        .first();

    // If user has explicit access, check role requirements
    if (visionUser) {
        if (requiredRole && visionUser.role !== requiredRole && visionUser.role !== VisionAccessRole.Owner) {
            throw new Error(`Access denied: ${requiredRole} role required`);
        }
        return { identity, visionUser };
    }

    // If no explicit access but vision belongs to an organization,
    // allow access for organization members (assuming Clerk verifies org membership)
    // This is a simplified approach - in production you'd want to verify org membership via Clerk
    if (vision.organization && vision.organization !== "") {
        // For organization visions, grant editor access by default
        // The frontend should ensure the user is actually a member of this organization
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
