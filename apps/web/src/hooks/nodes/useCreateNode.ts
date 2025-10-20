import { useMetadataCache } from "@/utils/ogMetadata";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { NodeWithFrame } from "@convex/channels";
import { CreateNodeArgs } from "@convex/nodes";
import { useMutation } from "convex/react";
import React from "react";
import { toast } from "sonner";

export type FrameStatus = {
  id: Id<"frames">;
  center: { x: number; y: number };
};

type Params = {
  visionId: string;
  onPostCreation?: (node: NodeWithFrame) => void;
};

export default function useCreateNode(params: Params) {
  const { visionId, onPostCreation } = params;
  const creation = useMutation(api.nodes.create);
  const updateChatNodeId = useMutation(api.chats.updateChatNodeId);
  const { cacheMetadataForUrl } = useMetadataCache();

  // ✅ useCallback ensures function identity is stable across renders
  const create = React.useCallback(
    async (data: CreateNodeArgs, frameStatus?: FrameStatus) => {
      if (data.value) {
        await cacheMetadataForUrl(data.value);
      }

      try {
        let frameData = {};
        if (frameStatus) {
          const { x, y } = frameStatus.center;
          frameData = {
            frameId: frameStatus.id,
            position: {
              id: crypto.randomUUID(),
              position: { x, y },
              type: data.variant || "Text",
              data: "",
            },
          };
        }

        const nodeId = await creation({
          ...data,
          ...frameData,
        });

        const node: NodeWithFrame = {
          _id: nodeId,
          _creationTime: Date.now(),
          title: data.title,
          variant: data.variant,
          value: data.value,
          thought: data.thought,
          frame: data.frameId,
          channel: data.channel as Id<"channels">,
          vision: visionId as Id<"visions">,
          userId: "" as Id<"users">,
          updatedAt: new Date().toISOString(),
          frameTitle: null,
        };

        if (data.variant === "AI" && data.value) {
          try {
            await updateChatNodeId({
              chatId: data.value as Id<"chats">,
              nodeId,
            });
          } catch (error) {
            console.error("Failed to link chat to node:", error);
          }
        }

        onPostCreation?.(node);
      } catch (error) {
        const title = "Failed to create node";
        console.error(title, error);
        toast.error(title);
      }
    },
    [
      visionId,
      onPostCreation,
      creation,
      updateChatNodeId,
      cacheMetadataForUrl, // ✅ all external references must be included
    ]
  );

  // ✅ Return the callback directly — no useMemo() wrapper needed
  return create;
}
