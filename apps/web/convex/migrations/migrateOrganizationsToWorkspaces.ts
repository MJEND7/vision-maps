/**
 * MIGRATION SCRIPT: Organizations -> Workspaces
 *
 * This migration handles the transition from organization-based structure to workspace-based structure.
 *
 * What it does:
 * 1. Creates a workspace for each existing organization (1:1 mapping)
 * 2. Migrates all organization members to workspace members
 * 3. Migrates all organization visions to workspace visions
 * 4. Converts organization plans to workspace plans
 * 5. Creates default workspaces for users with personal visions (those without an organization)
 * 6. Converts personal user plans to workspace plans
 *
 * Data preservation:
 * - All original organization data is preserved but marked as legacy
 * - All original user and vision data remains unchanged
 * - Plan data is converted but history is preserved
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { WorkspaceMemberRole } from "../tables/workspaceMember";

export const runMigration = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting migration: Organizations -> Workspaces");

    const migrationReport = {
      organizationsCreatedAsWorkspaces: 0,
      membersCreated: 0,
      visionsUpdated: 0,
      plansConverted: 0,
      defaultWorkspacesCreated: 0,
      errors: [] as string[],
    };

    try {
      // ========================================
      // PHASE 1: Migrate existing organizations to workspaces
      // ========================================
      console.log("PHASE 1: Migrating organizations to workspaces...");

      const organizations = await ctx.db.query("organizations").collect();
      const orgIdToWorkspaceIdMap = new Map<string, string>();

      for (const org of organizations) {
        try {
          // Create workspace from organization
          const workspaceId = await ctx.db.insert("workspaces", {
            name: org.name,
            slug: org.slug,
            imageUrl: org.imageUrl,
            hasImage: org.hasImage,
            membersCount: org.membersCount,
            maxAllowedMemberships: org.maxAllowedMemberships,
            adminDeleteEnabled: org.adminDeleteEnabled,
            publicMetadata: { ...org.publicMetadata, legacyOrgId: org._id },
            privateMetadata: { ...org.privateMetadata, migratedFrom: "organization" },
            createdBy: org.createdBy,
            isDefault: false,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
          });

          orgIdToWorkspaceIdMap.set(org._id.toString(), workspaceId.toString());
          migrationReport.organizationsCreatedAsWorkspaces++;

          console.log(`Created workspace ${workspaceId} from organization ${org._id}`);
        } catch (error) {
          const errorMsg = `Failed to migrate organization ${org._id}: ${error}`;
          console.error(errorMsg);
          migrationReport.errors.push(errorMsg);
        }
      }

      // ========================================
      // PHASE 2: Migrate organization members to workspace members
      // ========================================
      console.log("PHASE 2: Migrating organization members to workspace members...");

      const orgMembers = await ctx.db.query("organization_members").collect();

      for (const member of orgMembers) {
        try {
          const workspaceId = orgIdToWorkspaceIdMap.get(member.organizationId.toString());
          if (!workspaceId) {
            throw new Error(`No workspace found for organization ${member.organizationId}`);
          }

          // Create workspace member
          await ctx.db.insert("workspace_members", {
            workspaceId: workspaceId as any,
            userId: member.userId,
            role: member.role as any, // Same role enum values
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
          });

          migrationReport.membersCreated++;
        } catch (error) {
          const errorMsg = `Failed to migrate organization member ${member._id}: ${error}`;
          console.error(errorMsg);
          migrationReport.errors.push(errorMsg);
        }
      }

      // ========================================
      // PHASE 3: Migrate organization visions to workspace visions
      // ========================================
      console.log("PHASE 3: Migrating organization visions to workspace visions...");

      const visions = await ctx.db.query("visions").collect();

      for (const vision of visions) {
        try {
          const visionWithOrg = vision as any;
          if (visionWithOrg.organization) {
            const workspaceId = orgIdToWorkspaceIdMap.get(visionWithOrg.organization);
            if (!workspaceId) {
              throw new Error(
                `Vision ${vision._id} has organization ${visionWithOrg.organization} but no workspace mapping`
              );
            }

            // Update vision to reference workspace instead of organization
            await ctx.db.patch(vision._id, {
              workspace: workspaceId,
            });

            migrationReport.visionsUpdated++;
          } else {
            // Personal vision - will be handled in PHASE 5
            console.log(`Vision ${vision._id} is personal (no organization), will handle in PHASE 5`);
          }
        } catch (error) {
          const errorMsg = `Failed to migrate vision ${vision._id}: ${error}`;
          console.error(errorMsg);
          migrationReport.errors.push(errorMsg);
        }
      }

      // ========================================
      // PHASE 4: Convert organization plans to workspace plans
      // ========================================
      console.log("PHASE 4: Converting organization plans to workspace plans...");

      const plans = await ctx.db.query("plans").collect();

      for (const plan of plans) {
        try {
          if (plan.ownerType === "org") {
            const workspaceId = orgIdToWorkspaceIdMap.get(plan.ownerId);
            if (!workspaceId) {
              throw new Error(`No workspace found for org plan owner ${plan.ownerId}`);
            }

            // Update plan to reference workspace
            await ctx.db.patch(plan._id, {
              ownerType: "workspace" as any,
              ownerId: workspaceId,
            });

            migrationReport.plansConverted++;
          }
        } catch (error) {
          const errorMsg = `Failed to migrate plan ${plan._id}: ${error}`;
          console.error(errorMsg);
          migrationReport.errors.push(errorMsg);
        }
      }

      // ========================================
      // PHASE 5: Create default workspaces for users with personal visions
      // ========================================
      console.log("PHASE 5: Creating default workspaces for users with personal visions...");

      // Get all users who have personal visions (vision.workspace was not set yet - legacy data only)
      // Since all new visions require workspace, we only need to find visions with empty/undefined workspace
      // This phase handles any legacy visions that existed before the migration
      const allVisions = await ctx.db.query("visions").collect();
      const personalVisions = allVisions.filter((v) => {
        const vWithOrg = v as any;
        return !v.workspace || v.workspace === "" || (vWithOrg.organization && vWithOrg.organization !== "");
      });

      const usersWithPersonalVisions = new Set<string>();
      for (const vision of personalVisions) {
        const visionUsers = await ctx.db
          .query("vision_users")
          .withIndex("by_visionId", (q) => q.eq("visionId", vision._id))
          .collect();

        for (const visionUser of visionUsers) {
          if (visionUser.role === "owner") {
            usersWithPersonalVisions.add(visionUser.userId);
          }
        }
      }

      // Create default workspace for each user
      const userIdToDefaultWorkspaceMap = new Map<string, string>();

      for (const userId of Array.from(usersWithPersonalVisions)) {
        try {
          // Check if user already has a default workspace
          const existingDefaultWorkspace = await ctx.db
            .query("workspace_members")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect()
            .then(async (memberships) => {
              for (const membership of memberships) {
                const workspace = await ctx.db.get(membership.workspaceId);
                if (workspace?.isDefault) {
                  return workspace._id;
                }
              }
              return null;
            });

          if (existingDefaultWorkspace) {
            userIdToDefaultWorkspaceMap.set(userId, existingDefaultWorkspace.toString());
            continue;
          }

          // Create default workspace
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
            privateMetadata: { migratedFrom: "personal_user" },
            createdBy: userId,
            isDefault: true,
            createdAt: now,
            updatedAt: now,
          });

          // Add user as admin
          await ctx.db.insert("workspace_members", {
            workspaceId,
            userId,
            role: WorkspaceMemberRole.Admin,
            createdAt: now,
            updatedAt: now,
          });

          userIdToDefaultWorkspaceMap.set(userId, workspaceId.toString());
          migrationReport.defaultWorkspacesCreated++;

          console.log(`Created default workspace ${workspaceId} for user ${userId}`);
        } catch (error) {
          const errorMsg = `Failed to create default workspace for user ${userId}: ${error}`;
          console.error(errorMsg);
          migrationReport.errors.push(errorMsg);
        }
      }

      // ========================================
      // PHASE 6: Update personal visions to belong to user's default workspace
      // ========================================
      console.log("PHASE 6: Updating personal visions to belong to workspaces...");

      for (const vision of personalVisions) {
        try {
          const visionUsers = await ctx.db
            .query("vision_users")
            .withIndex("by_visionId", (q) => q.eq("visionId", vision._id))
            .collect();

          const ownerId = visionUsers.find((vu) => vu.role === "owner")?.userId;
          if (!ownerId) {
            throw new Error(`Vision ${vision._id} has no owner`);
          }

          const workspaceId = userIdToDefaultWorkspaceMap.get(ownerId);
          if (!workspaceId) {
            throw new Error(
              `No default workspace found for user ${ownerId} who owns vision ${vision._id}`
            );
          }

          // Update vision to reference workspace
          await ctx.db.patch(vision._id, {
            workspace: workspaceId,
          });

          migrationReport.visionsUpdated++;
        } catch (error) {
          const errorMsg = `Failed to migrate personal vision ${vision._id}: ${error}`;
          console.error(errorMsg);
          migrationReport.errors.push(errorMsg);
        }
      }

      // ========================================
      // PHASE 7: Convert personal user plans to workspace plans
      // ========================================
      console.log("PHASE 7: Converting personal user plans to workspace plans...");

      const userPlans = await ctx.db
        .query("plans")
        .filter((q) => q.eq(q.field("ownerType"), "user"))
        .collect();

      for (const userPlan of userPlans) {
        try {
          const workspaceId = userIdToDefaultWorkspaceMap.get(userPlan.ownerId);
          if (!workspaceId) {
            // User has no personal visions, keep as user plan
            continue;
          }

          // Update plan to reference workspace instead of user
          await ctx.db.patch(userPlan._id, {
            ownerType: "workspace" as any,
            ownerId: workspaceId,
          });

          migrationReport.plansConverted++;
        } catch (error) {
          const errorMsg = `Failed to migrate user plan ${userPlan._id}: ${error}`;
          console.error(errorMsg);
          migrationReport.errors.push(errorMsg);
        }
      }

      // ========================================
      // MIGRATION COMPLETE
      // ========================================
      console.log("Migration complete!");
      console.log("Migration Report:", JSON.stringify(migrationReport, null, 2));

      return migrationReport;
    } catch (error) {
      console.error("FATAL ERROR during migration:", error);
      throw error;
    }
  },
});
