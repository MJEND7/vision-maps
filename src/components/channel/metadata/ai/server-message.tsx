"use client"

import { StreamId } from "@convex-dev/persistent-text-streaming";
import { useStream } from "@convex-dev/persistent-text-streaming/react";
import { useMemo, useEffect } from "react";
import Markdown from "react-markdown";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { getConvexSiteUrl } from "@/utils/convex";
import { api } from "../../../../../convex/_generated/api";

export function ServerMessage({
  message,
  isDriven,
  stopStreaming,
  scrollToBottom,
}: {
  message: Doc<"messages">;
  isDriven: boolean;
  stopStreaming: () => void;
  scrollToBottom: () => void;
}) {
  const { text, status } = useStream(
    api.messages.getStreamBody,
    new URL(`${getConvexSiteUrl()}/chat-stream`),
    isDriven,
    message.streamId as StreamId,
    { 
        headers: {
            "x-message-id": message._id,
            "x-chat-id": message.chatId,
        }
    }
  );

  const isCurrentlyStreaming = useMemo(() => {
    if (!isDriven) return false;
    return status === "pending" || status === "streaming";
  }, [isDriven, status]);

  useEffect(() => {
    if (!isDriven) return;
    if (isCurrentlyStreaming) return;
    stopStreaming();
  }, [isDriven, isCurrentlyStreaming, stopStreaming]);

  useEffect(() => {
    if (!text) return;
    scrollToBottom();
  }, [text, scrollToBottom]);

  return (
    <div className="md-answer">
      <Markdown>{text || "Thinking..."}</Markdown>
      {status === "error" && (
        <div className="text-red-500 mt-2">Error loading response</div>
      )}
    </div>
  );
}
