import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function createDefaultFrame(
  ctx: MutationCtx,
  channelId: Id<"channels">,
  visionId: Id<"visions">,
  title: string = "Frame 1"
) {
  const now = new Date().toISOString();

  const frameId = await ctx.db.insert("frames", {
    title,
    channel: channelId,
    vision: visionId,
    createdAt: now,
    updatedAt: now,
  });

  return frameId;
}