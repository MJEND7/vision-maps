import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function createDefaultFrame(
  ctx: MutationCtx,
  channelId: Id<"channels">,
  visionId: Id<"visions">,
  title: string = "Frame 1"
) {
  const now = new Date().toISOString();

  // Get the next sort order for this channel
  const existingFrames = await ctx.db
    .query("frames")
    .withIndex("by_channel", (q) => q.eq("channel", channelId))
    .collect();
  
  const maxSortOrder = Math.max(0, ...existingFrames.map(f => f.sortOrder || 0));
  const newSortOrder = maxSortOrder + 1;

  const frameId = await ctx.db.insert("frames", {
    title,
    sortOrder: newSortOrder,
    channel: channelId,
    vision: visionId,
    createdAt: now,
    updatedAt: now,
  });

  return frameId;
}