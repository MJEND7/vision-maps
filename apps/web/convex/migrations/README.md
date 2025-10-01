# Convex Migrations

This directory contains data migrations for the Convex database.

## Migration: Transcription Nodes (migrateTranscriptionNodes.ts)

This migration converts the old `transcriptChunks` array field to JSON stored in the `value` field, and removes the `audioDuration` field.

### What it does:

1. Finds all Transcription variant nodes
2. Converts `transcriptChunks` array to JSON string
3. Stores JSON in the `value` field
4. Removes `transcriptChunks` and `audioDuration` fields

### How to run:

#### 1. Dry Run (Check what will be migrated)

```bash
npx convex run migrations/migrateTranscriptionNodes:dryRun
```

This will show you:
- Total number of Transcription nodes
- How many need migration
- How many are already migrated
- A sample of what will change

#### 2. Run Migration

```bash
npx convex run migrations/migrateTranscriptionNodes:migrate
```

This will:
- Migrate all Transcription nodes with `transcriptChunks`
- Output progress and results
- Return a summary with counts of migrated/skipped/errors

### Expected Output:

```
Starting migration: transcriptChunks to JSON in value field
Found X Transcription nodes to check
Migrating node <id>
...
Migration complete: { total: X, migrated: Y, skipped: Z, errors: 0 }
```

### Safety:

- The migration only updates nodes that have `transcriptChunks`
- Nodes without chunks are skipped
- Errors are caught and logged per-node
- The old fields are set to `undefined` (they'll be ignored after schema update)
- You can run the migration multiple times safely (idempotent)

### After Migration:

Once the migration completes successfully:

1. **Verify the migration results** - Check that all nodes were migrated successfully
2. **Remove temporary fields from schema** - Edit `convex/nodes/table.ts` and remove these lines:
   ```typescript
   // TEMPORARY: Keep old fields for migration - remove after running migrateTranscriptionNodes
   transcriptChunks: v.optional(v.array(v.object({
       text: v.string(),
       timestamp: v.number(),
   }))),
   audioDuration: v.optional(v.number()),
   ```
3. **Deploy the schema change** - Push the updated schema to remove the old fields
4. **Verify** - New transcription nodes will store chunks as JSON in `value`, and old nodes now have their chunks accessible from `value`

### Deployment Process:

This is a two-step deployment because Convex validates all existing data against the schema:

**Step 1 - Deploy with temporary fields:**
- Schema includes old fields as optional (current state)
- Deploy the code with the migration
- Run the migration to convert data
- All existing data now works with the new format

**Step 2 - Remove temporary fields:**
- Remove the temporary fields from schema
- Deploy again
- Schema is now clean and only allows the new format
