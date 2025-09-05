"use client";

import { StreamId } from "@convex-dev/persistent-text-streaming";
import { useStream } from "@convex-dev/persistent-text-streaming/react";
import { useMemo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Markdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter, SyntaxHighlighterProps } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { getConvexSiteUrl } from "@/utils/convex";
import { api } from "../../../../../convex/_generated/api";
import { AlertCircle, Copy, CopyCheck, Sparkles } from "lucide-react";

// Code component with copy functionality
const CodeComponent = ({ className, children, ...props }: any) => {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || "");
    const theme =
        typeof window !== "undefined" &&
            document.documentElement.classList.contains("dark")
            ? oneDark
            : oneLight;

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
                {copied ? <CopyCheck size={15} /> : <Copy size={15} /> }
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
                            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
