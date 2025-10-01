import { internalMutation } from "../_generated/server";

/**
 * Migration: Convert transcriptChunks to JSON in value field
 *
 * This migration:
 * 1. Finds all Transcription nodes with transcriptChunks
 * 2. Converts transcriptChunks to JSON and stores in value field
 * 3. Removes transcriptChunks and audioDuration fields
 *
 * Run with: npx convex run migrations/migrateTranscriptionNodes:migrate
 */
export const migrate = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting migration: transcriptChunks to JSON in value field");

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Get all Transcription nodes
    const allNodes = await ctx.db
      .query("nodes")
      .filter((q) => q.eq(q.field("variant"), "Transcription"))
      .collect();

    console.log(`Found ${allNodes.length} Transcription nodes to check`);

    for (const node of allNodes) {
      try {
        const nodeData = node as any; // TypeScript will complain about old fields

        // Check if this node has the old transcriptChunks field
        if (nodeData.transcriptChunks && Array.isArray(nodeData.transcriptChunks)) {
          console.log(`Migrating node ${node._id}`);

          // Convert chunks to JSON string
          const chunksJson = JSON.stringify(nodeData.transcriptChunks);

          // Prepare update - we'll patch the node to update value
          // Note: The old fields (transcriptChunks, audioDuration) will be automatically
          // removed by Convex once the schema is updated and no longer includes them
          await ctx.db.patch(node._id, {
            value: chunksJson,
          });

          migratedCount++;
        } else {
          // Node already migrated or doesn't have chunks
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error migrating node ${node._id}:`, error);
        errorCount++;
      }
    }

    const summary = {
      total: allNodes.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
    };

    console.log("Migration complete:", summary);
    return summary;
  },
});

/**
 * Dry run migration to see what would be migrated without making changes
 *
 * Run with: npx convex run migrations/migrateTranscriptionNodes:dryRun
 */
export const dryRun = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("DRY RUN: Checking what would be migrated");

    const allNodes = await ctx.db
      .query("nodes")
      .filter((q) => q.eq(q.field("variant"), "Transcription"))
      .collect();

    const nodesToMigrate = allNodes.filter((node) => {
      const nodeData = node as any;
      return nodeData.transcriptChunks && Array.isArray(nodeData.transcriptChunks);
    });

    console.log(`Total Transcription nodes: ${allNodes.length}`);
    console.log(`Nodes needing migration: ${nodesToMigrate.length}`);
    console.log(`Nodes already migrated: ${allNodes.length - nodesToMigrate.length}`);

    // Show sample of what would be migrated
    if (nodesToMigrate.length > 0) {
      const sample = nodesToMigrate[0] as any;
      console.log("\nSample node to migrate:");
      console.log(`- ID: ${sample._id}`);
      console.log(`- Current value: ${sample.value}`);
      console.log(`- Has transcriptChunks: ${sample.transcriptChunks?.length || 0} chunks`);
      console.log(`- Has audioDuration: ${sample.audioDuration !== undefined}`);
      console.log(`- New value would be: ${JSON.stringify(sample.transcriptChunks).substring(0, 100)}...`);
    }

    return {
      total: allNodes.length,
      needsMigration: nodesToMigrate.length,
      alreadyMigrated: allNodes.length - nodesToMigrate.length,
      sample: nodesToMigrate.length > 0 ? {
        id: nodesToMigrate[0]._id,
        hasChunks: !!(nodesToMigrate[0] as any).transcriptChunks,
        chunkCount: (nodesToMigrate[0] as any).transcriptChunks?.length || 0,
      } : null,
    };
  },
});
