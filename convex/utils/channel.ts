import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { createDefaultFrame } from "./frame";

export async function createDefaultChannel(
  ctx: MutationCtx,
  visionId: Id<"visions">,
  title: string = "General",
  description?: string
) {
  const now = new Date().toISOString();

  // Get the next sort order for this vision
  const existingChannels = await ctx.db
    .query("channels")
    .withIndex("by_vision", (q) => q.eq("vision", visionId))
    .collect();
  
  const maxSortOrder = Math.max(0, ...existingChannels.map(c => c.sortOrder || 0));
  const newSortOrder = maxSortOrder + 1;

  const channelId = await ctx.db.insert("channels", {
    title,
    description,
    sortOrder: newSortOrder,
    vision: visionId,
    createdAt: now,
    updatedAt: now,
  });

  await createDefaultFrame(ctx, channelId, visionId);

  return channelId;
}