"use client";

import { StreamId } from "@convex-dev/persistent-text-streaming";
import { useStream } from "@convex-dev/persistent-text-streaming/react";
import { useMemo, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Memoize remarkPlugins array to prevent unnecessary re-renders
const REMARK_PLUGINS = [remarkGfm];
import { Doc } from "@convex/_generated/dataModel";
import { getConvexSiteUrl } from "@/utils/convex";
import { api } from "@convex/_generated/api";
import { AlertCircle, Copy, CopyCheck, Sparkles, RotateCw, GitBranch, FileText } from "lucide-react";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { MARKDOWN_COMPONENTS } from "@/lib/markdown";

export function ServerMessage({
    message,
    isDriven,
    stopStreaming,
    scrollToBottom,
    isAssistant = false,
    onRetry,
    onBranch,
    onCreateTextNode
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
    // Check if the chat's AI node is on a frame
    const isNodeOnFrame = useQuery(api.nodes.checkChatNodeOnFrame, { chatId: message.chatId });
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

    return (
        <div className="relative max-w-full overflow-x-auto">
            <AnimatePresence mode="wait">
                {!text && status === "pending" ? (
                    // Thinking state
                    <motion.div
                        key="thinking"
                        className="flex items-center gap-2 text-primary py-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <Sparkles className="w-4 h-4" />
                        </motion.div>
                        <span className="text-sm font-medium">Thinking...</span>
                    </motion.div>
                ) : (
                    // Main content
                    <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="max-w-full break-words"
                    >
                        <div className="prose prose-sm max-w-none">
                            <Markdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
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

                        {/* Action buttons - only for AI messages */}
                        {(onRetry || onBranch || onCreateTextNode || text) && (
                            <div className="flex justify-between">
                                <div className="flex gap-1 self-start">
                                    {/* Retry button for AI messages */}
                                    {onRetry && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onRetry}
                                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                            title="Retry from this response"
                                        >
                                            <RotateCw className="w-3 h-3 mr-1" />
                                            Retry
                                        </Button>
                                    )}

                                    {/* Branch button for AI messages */}
                                    {onBranch && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onBranch}
                                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                            title="Branch from this response"
                                        >
                                            <GitBranch className="w-3 h-3 mr-1" />
                                            Branch
                                        </Button>
                                    )}

                                    {/* Create text node button for AI messages */}
                                    {text && !isCurrentlyStreaming && isAssistant && isNodeOnFrame && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onCreateTextNode}
                                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                            title="Create text node from this response"
                                        >
                                            <FileText className="w-3 h-3 mr-1" />
                                            Text Node
                                        </Button>
                                    )}
                                </div>
                                <div>
                                    {/* Copy message button */}
                                    {text && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCopyMessage}
                                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                            title="Copy message"
                                        >
                                            {copiedMessage ? <CopyCheck className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                            {copiedMessage ? "Copied" : "Copy"}
                                        </Button>
                                    )}

                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {status === "error" && (
                <motion.div
                    className="flex items-center gap-2 text-destructive mt-3 p-3 bg-destructive/10 border border-destructive rounded-lg max-w-full"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm break-words">
                        Failed to load response. Please try again.
                    </span>
                </motion.div>
            )}
        </div>
    );
}
