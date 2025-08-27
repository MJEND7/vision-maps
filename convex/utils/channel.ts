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

  const channelId = await ctx.db.insert("channels", {
    title,
    description,
    vision: visionId,
    createdAt: now,
    updatedAt: now,
  });

  await createDefaultFrame(ctx, channelId, visionId);

  return channelId;
}