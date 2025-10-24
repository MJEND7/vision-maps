"use client";

import { StreamId } from "@convex-dev/persistent-text-streaming";
import { useStream } from "@convex-dev/persistent-text-streaming/react";
import { useMemo, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Doc } from "@convex/_generated/dataModel";
import { getConvexSiteUrl } from "@/utils/convex";
import { api } from "@convex/_generated/api";
import {
  AlertCircle,
  Copy,
  CopyCheck,
  Sparkles,
  RotateCw,
  GitBranch,
  FileText,
} from "lucide-react";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { MARKDOWN_COMPONENTS } from "@/lib/markdown";

const REMARK_PLUGINS = [remarkGfm];

export function ServerMessage({
  message,
  isDriven,
  stopStreaming,
  scrollToBottom,
  isAssistant = false,
  onRetry,
  onBranch,
  onCreateTextNode,
}: {
  message: Doc<"messages">;
  isDriven: boolean;
  stopStreaming: () => void;
  scrollToBottom: () => void;
  isAssistant?: boolean;
  onRetry?: () => void;
  onBranch?: () => void;
  onCreateTextNode?: () => void;
}) {
  const isNodeOnFrame = useQuery(api.nodes.checkChatNodeOnFrame, {
    chatId: message.chatId,
  });
  const [copiedMessage, setCopiedMessage] = useState(false);

  const { text, status } = useStream(
    api.messages.getStreamBody,
    new URL(`${getConvexSiteUrl()}/chat-stream`),
    isDriven,
    message.streamId as StreamId,
    {
      headers: {
        "x-message-id": message._id,
        "x-chat-id": message.chatId,
      },
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

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  }, [text]);

  const showActions =
    !isCurrentlyStreaming &&
    text &&
    (onRetry || onBranch || onCreateTextNode);

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        {!text && status === "pending" ? (
          <motion.div
            key="thinking"
            className="flex items-center gap-2 text-primary py-2 px-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Sparkles className="w-4 h-4 flex-shrink-0" />
            </motion.div>
            <span className="text-sm font-medium">Thinking...</span>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full"
          >
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-[15px] prose-p:leading-relaxed prose-headings:text-base prose-headings:font-semibold prose-code:text-[13px] prose-pre:text-[13px] prose-li:text-[15px] prose-li:leading-relaxed break-words overflow-x-auto">
              <Markdown
                remarkPlugins={REMARK_PLUGINS}
                components={MARKDOWN_COMPONENTS}
              >
                {text}
              </Markdown>
            </div>

            {isCurrentlyStreaming && (
              <motion.div
                className="inline-block w-2 h-4 bg-primary ml-1"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}

            {showActions && (
              <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/40">
                {text && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyMessage}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground touch-manipulation"
                    title="Copy message"
                  >
                    {copiedMessage ? (
                      <CopyCheck className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                )}

                {onRetry && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRetry}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground touch-manipulation"
                    title="Retry from this response"
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                )}

                {onBranch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBranch}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground touch-manipulation"
                    title="Branch from this response"
                  >
                    <GitBranch className="w-4 h-4" />
                  </Button>
                )}

                {isAssistant && isNodeOnFrame && onCreateTextNode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCreateTextNode}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground touch-manipulation"
                    title="Create text node from this response"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {status === "error" && (
        <motion.div
          className="flex items-start gap-2 text-destructive mt-3 p-3 bg-destructive/10 border border-destructive rounded-lg touch-manipulation"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="text-sm leading-relaxed">
            Failed to load response. Please try again.
          </span>
        </motion.div>
      )}
    </div>
  );
}
