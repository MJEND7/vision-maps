"use client";

import { StreamId } from "@convex-dev/persistent-text-streaming";
import { useStream } from "@convex-dev/persistent-text-streaming/react";
import { useMemo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Markdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Memoize remarkPlugins array to prevent unnecessary re-renders
const REMARK_PLUGINS = [remarkGfm];
import { Prism as SyntaxHighlighter, SyntaxHighlighterProps } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Doc } from "@convex/_generated/dataModel";
import { getConvexSiteUrl } from "@/utils/convex";
import { api } from "@convex/_generated/api";
import { AlertCircle, Copy, CopyCheck, Sparkles, RotateCw, GitBranch, FileText } from "lucide-react";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

// Code component with copy functionality
const CodeComponent = ({ className, children, ...props }: any) => {
    const [copied, setCopied] = useState(false);
    const { theme: currentTheme } = useTheme();
    const match = /language-(\w+)/.exec(className || "");

    // Memoize theme to prevent recalculation on every render
    const theme = useMemo(() => {
        return currentTheme === "dark" ? oneDark : oneLight;
    }, [currentTheme]);

    const codeString = String(children).replace(/\n$/, "");

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(codeString);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code:", err);
        }
    };

    return match ? (
        <div className="max-w-[455px] relative group my-3">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 text-xs rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                {copied ? <CopyCheck size={15} /> : <Copy size={15} />}
            </button>
            <SyntaxHighlighter
                style={theme as SyntaxHighlighterProps["style"]}
                language={match[1]}
                PreTag="div"
                className="rounded-md border"
                {...props}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
    ) : (
        <code
            className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-card-foreground"
            {...props}
        >
            {children}
        </code>
    );
};

// Custom ChatGPT-like Markdown styles with theme tokens
const markdownComponents: Components = {
    h1: ({ ...props }) => (
        <h1 className="text-2xl font-bold text-card-foreground mb-3" {...props} />
    ),
    h2: ({ ...props }) => (
        <h2 className="text-xl font-semibold text-card-foreground mt-4 mb-2" {...props} />
    ),
    p: ({ ...props }) => (
        <p className="text-card-foreground leading-relaxed mb-3" {...props} />
    ),
    ul: ({ ...props }) => (
        <ul className="list-disc list-inside space-y-1 text-card-foreground mb-3" {...props} />
    ),
    ol: ({ ...props }) => (
        <ol className="list-decimal list-inside space-y-1 text-card-foreground mb-3" {...props} />
    ),
    li: ({ ...props }) => (
        <li className="ml-4 text-card-foreground" {...props} />
    ),
    blockquote: ({ ...props }) => (
        <blockquote
            className="border-l-4 border-border pl-4 italic text-muted-foreground my-3"
            {...props}
        />
    ),
    code: CodeComponent,
};

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
                            <Markdown remarkPlugins={REMARK_PLUGINS} components={markdownComponents}>
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
                        {(onRetry || onBranch || onCreateTextNode) && (
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
