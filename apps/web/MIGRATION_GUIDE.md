# Migration Guide: Organizations → Workspaces

This guide explains how to run the migration script that converts your existing organizations to the new workspace-based system.

## Overview

The migration script (`migrateOrganizationsToWorkspaces.ts`) converts your entire system from organization-based to workspace-based structure. It:

1. Creates a workspace for each existing organization (1:1 mapping)
2. Migrates all organization members to workspace members
3. Updates all visions to reference workspaces instead of organizations
4. Converts organization plans to workspace plans
5. Creates default workspaces for users with personal visions
6. Converts personal user plans to workspace plans

## Prerequisites

- Your Convex backend is deployed and running
- You have access to the Convex dashboard or CLI
- All Convex functions have been deployed
- You have a backup of your database (recommended)

## Running the Migration

### Option 1: Using Convex Dashboard (Recommended for First-Time Users)

1. **Open Convex Dashboard:**
   - Go to https://dashboard.convex.dev
   - Select your project
   - Navigate to the "Functions" tab

2. **Find the Migration Function:**
   - Search for "runMigration" in the functions list
   - You should see `migrations/migrateOrganizationsToWorkspaces.runMigration`

3. **Run the Migration:**
   - Click on the function
   - Click the "Run" button
   - Leave the arguments empty (the function takes no arguments)
   - Click "Run mutation"

4. **Monitor Progress:**
   - The function will log progress to the console
   - Watch for the completion message with a migration report
   - The report will show:
     - Number of organizations created as workspaces
     - Number of members migrated
     - Number of visions updated
     - Number of plans converted
     - Number of default workspaces created
     - Any errors encountered

### Option 2: Using Convex CLI

1. **Open Terminal:**
   ```bash
   cd /home/mjend/work/vision_maps/apps/web
   ```

2. **Start Convex Dev Server (if not already running):**
   ```bash
   npx convex dev
   ```

3. **Run the Migration in Another Terminal:**
   ```bash
   npx convex run migrations/migrateOrganizationsToWorkspaces:runMigration
   ```

4. **Check the Output:**
   - The command will display the migration report
   - Save this output for reference

### Option 3: Programmatically in Your Frontend

You can also trigger the migration from your frontend code:

```typescript
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";

export function MigrationButton() {
  const runMigration = useMutation(api.migrations.migrateOrganizationsToWorkspaces.runMigration);

  const handleMigrate = async () => {
    try {
      const report = await runMigration({});
      console.log("Migration completed:", report);
      alert(`Migration complete! ${report.organizationsCreatedAsWorkspaces} organizations migrated.`);
    } catch (error) {
      console.error("Migration failed:", error);
      alert("Migration failed. Check console for details.");
    }
  };

  return <button onClick={handleMigrate}>Run Migration</button>;
}
```

## Understanding the Migration Report

After the migration completes, you'll receive a report like:

```json
{
  "organizationsCreatedAsWorkspaces": 5,
  "membersCreated": 23,
  "visionsUpdated": 42,
  "plansConverted": 8,
  "defaultWorkspacesCreated": 12,
  "errors": []
}
```

### What Each Number Means:

- **organizationsCreatedAsWorkspaces**: Number of organizations converted to workspaces (1:1)
- **membersCreated**: Number of organization members migrated to workspace members
- **visionsUpdated**: Number of visions that now reference workspaces instead of organizations
- **plansConverted**: Number of plans that were converted from org/user to workspace ownership
- **defaultWorkspacesCreated**: Number of default workspaces created for users with personal visions
- **errors**: Array of any errors that occurred (should be empty for successful migration)

## Post-Migration Steps

### 1. Verify the Migration

Check that everything was migrated correctly:

```typescript
// In your browser console or a test file
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

// Check workspaces were created
const workspaces = await api.workspaces.getUserWorkspaces.invoke({});
console.log("User workspaces:", workspaces);

// Check visions were updated
const visions = await api.visions.list.invoke({
  workspaceId: workspaces[0]._id,
  search: undefined
});
console.log("Visions in workspace:", visions);

// Check plans were converted
const plan = await api.plans.getPlanByOwner.invoke({
  ownerType: "workspace",
  ownerId: workspaces[0]._id
});
console.log("Workspace plan:", plan);
```

### 2. Update Your Frontend (if needed)

If you were using `OrganizationContext` directly:

```typescript
// OLD (still works due to backward compatibility wrapper)
import { useOrganization } from "@/contexts/OrganizationContext";
const { organization } = useOrganization();

// NEW (recommended for new code)
import { useWorkspace } from "@/contexts/WorkspaceContext";
const { workspace, defaultWorkspace } = useWorkspace();
```

### 3. Monitor for Issues

- Watch your application logs for any errors
- Check that users can still see their visions
- Verify that workspaces appear in the UI
- Test vision creation in a workspace

### 4. Remove Old Organization Data (Optional)

Once you've verified everything works, you can optionally delete the old `organizations` table:

```typescript
// This is optional and only do this if you're certain you don't need
// the old organization data for reference

// WARNING: This is irreversible. Only do this after full verification.
// To delete old organizations:
// 1. Ensure all data is in workspaces
// 2. Manually delete from Convex dashboard or with a custom script
```

## Troubleshooting

### Migration Takes Too Long

The migration might take a while if you have a lot of data. Here's why:

- It processes each organization individually
- It updates each vision's workspace reference
- It converts each plan

**What to do:**
- Let it run to completion (don't interrupt)
- Check your Convex usage limits
- Consider running during off-peak hours if you have many users

### Migration Fails with Errors

If the migration reports errors:

1. **Check the error messages** - they'll tell you what went wrong
2. **Common issues:**
   - Organization ID not found - rare, but can happen if orgs are deleted mid-migration
   - Plan update failed - check if all plans are valid
   - Vision update failed - check if all visions exist

3. **What to do:**
   - Review the specific errors in the migration report
   - Check your Convex logs for more details
   - If critical errors, restore from backup and investigate
   - Contact support if issues persist

### Some Users Lost Access to Visions

This shouldn't happen with the migration script, but if it does:

1. **Verify workspace memberships:**
   ```typescript
   const memberships = await api.workspaces.getMembers.invoke({
     workspaceId: workspaceId
   });
   console.log("Workspace members:", memberships);
   ```

2. **Check vision access:**
   - Users should be auto-added to workspace visions
   - If they're not in the workspace, they won't see visions
   - Use `api.workspaces.addMember` to manually add users

### Workspace Not Appearing in UI

If users don't see their workspaces in the workspace switcher:

1. **Refresh the page** - the UI might not have updated
2. **Clear localStorage:**
   ```javascript
   localStorage.removeItem('selectedWorkspaceId');
   location.reload();
   ```

3. **Check the WorkspaceContext is loading:**
   - Open React DevTools
   - Check if `WorkspaceProvider` shows loaded state
   - Verify `useWorkspace()` returns the workspace

## Rollback

If something goes wrong and you need to rollback:

1. **Restore from Backup** (if you have one):
   - Use Convex's backup/restore feature
   - Or restore from your database snapshot

2. **Revert Code:**
   ```bash
   git revert <commit-that-deployed-workspace-code>
   ```

3. **Contact Support:**
   - If migration corrupted data, Convex support can help
   - Provide the migration report and error details

## Next Steps After Migration

1. **Update Your API Calls:**
   - Change `organizationId` parameters to `workspaceId` in new code
   - Old code still works due to backward compatibility

2. **Plan Updates:**
   - Update UI to show workspace-level plans
   - Users should see billing tied to their workspace

3. **Default Workspaces:**
   - Users now have a default workspace
   - New users will automatically get one

4. **Test End-to-End:**
   - Create a new vision in a workspace
   - Add members to workspace
   - Verify visions appear for all workspace members
   - Check billing is workspace-level

## Questions?

Refer to:
- `/convex/migrations/migrateOrganizationsToWorkspaces.ts` - migration source code
- `/convex/workspaces.ts` - workspace API functions
- `/src/contexts/WorkspaceContext.tsx` - frontend workspace context

## Migration Phases (For Reference)

The migration runs 7 phases:

1. **Phase 1:** Organizations → Workspaces (1:1 mapping)
2. **Phase 2:** Organization Members → Workspace Members
3. **Phase 3:** Organization Visions → Workspace Visions
4. **Phase 4:** Organization Plans → Workspace Plans
5. **Phase 5:** Create Default Workspaces for Personal Vision Users
6. **Phase 6:** Assign Personal Visions to Default Workspaces
7. **Phase 7:** Convert Personal User Plans → Workspace Plans

Each phase is independent and includes error handling to prevent one failure from stopping the entire migration.
