"use client"

import React, { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import MessageItem from "./message-item";
import dynamic from "next/dynamic";
import { Id } from "@convex/_generated/dataModel";
import { MessageCircle, Sparkles } from "lucide-react";
import InfiniteScroll from "react-infinite-scroll-component";

const MessageSkeleton = () => (
    <div className="flex flex-col gap-10">
        {[...Array(3)].map((_, i) => (
            <React.Fragment key={i}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-3"
                >
                    <div className="w-8 h-8 bg-blue-100 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 + 0.05 }}
                    className="flex gap-3"
                >
                    <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                    </div>
                </motion.div>
            </React.Fragment>
        ))}
    </div>
);

const ServerMessage = dynamic(() => import("./server-message").then(mod => ({ default: mod.ServerMessage })), {
    ssr: false,
    loading: () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-primary py-2"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
                <Sparkles className="w-4 h-4" />
            </motion.div>
            Thinking...
        </motion.div>
    )
});

interface AiCardProps {
    chatId: string,
    drivenIds: Set<string>
    onFocusInput: () => void;
}

export function ChatCard({ chatId, drivenIds, onFocusInput }: AiCardProps) {
    const {
        results: messagesPage,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.messages.listMessagesByChat,
        { chatId: chatId as Id<"chats"> },
        { initialNumItems: 20 }
    );

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    // Combine all messages from all pages
    const allMessages = useMemo(() => {
        return messagesPage?.flatMap(page => page) || [];
    }, [messagesPage]);
    
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, []);

    // Handle initial load - wait for all messages to be ready before first scroll
    useEffect(() => {
        if (allMessages && allMessages.length > 0 && !initialLoadComplete) {
            const hasStreamingMessages = allMessages.some(message =>
                drivenIds.has(message._id)
            );

            if (!hasStreamingMessages) {
                setInitialLoadComplete(true);
                setTimeout(() => {
                    scrollToBottom();
                }, 100);
            }
        }
    }, [allMessages, drivenIds, scrollToBottom, initialLoadComplete]);

    // Handle ongoing scrolling - always scroll when messages change after initial load
    useEffect(() => {
        if (initialLoadComplete && allMessages) {
            scrollToBottom();
        }
    }, [allMessages, scrollToBottom, initialLoadComplete]);

    if (status === "LoadingFirstPage") {
        return (
            <motion.div
                className="w-full h-full overflow-hidden flex flex-col"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
                    <div className="w-full max-w-full space-y-4 p-2 overflow-hidden">
                        <MessageSkeleton />
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="w-full h-full flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            <div
                ref={scrollContainerRef}
                id="scrollable-chat-container"
                className="flex-1 overflow-y-auto overflow-x-hidden 
               scrollbar-thin scrollbar-track-transparent 
               scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300"
            >
                {allMessages.length === 0 ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            className="text-center py-12"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="flex flex-col items-center gap-3 text-gray-500">
                                <div className="p-3 rounded-full bg-blue-50 border border-blue-100">
                                    <MessageCircle className="w-6 h-6 text-blue-600" />
                                </div>
                                <p className="text-sm font-medium">Ready for conversation</p>
                                <p className="text-xs text-gray-400">Ask me anything to get started</p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <InfiniteScroll
                        dataLength={allMessages.length}
                        next={() => loadMore(10)}
                        hasMore={status === "CanLoadMore"}
                        loader={
                            <div className="flex justify-center py-4">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                >
                                    <Sparkles className="w-4 h-4 text-primary" />
                                </motion.div>
                            </div>
                        }
                        scrollableTarget="scrollable-chat-container"
                        inverse={true}
                        style={{ display: "flex", flexDirection: "column-reverse" }}
                        className="w-full p-2"
                    >
                        <div ref={messagesEndRef} />
                        {allMessages.map((message, index) => (
                            <React.Fragment key={message._id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    className="mb-3"
                                >
                                    <MessageItem message={message} isUser={false}>
                                        <ServerMessage
                                            message={message}
                                            isDriven={drivenIds.has(message._id)}
                                            stopStreaming={() => {
                                                onFocusInput();
                                            }}
                                            scrollToBottom={scrollToBottom}
                                            isAssistant={true}
                                        />
                                    </MessageItem>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.02 + 0.05 }}
                                    className="mb-3"
                                >
                                    <MessageItem message={message} isUser={true}>
                                        {message.content}
                                    </MessageItem>
                                </motion.div>
                            </React.Fragment>
                        ))}
                    </InfiniteScroll>
                )}
            </div>
        </motion.div>
    );
}
