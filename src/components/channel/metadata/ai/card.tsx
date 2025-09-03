"use client"

import React, { useRef, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import MessageItem from "./message-item";
import dynamic from "next/dynamic";
import { Id } from "../../../../../convex/_generated/dataModel";
import { MessageCircle, Sparkles } from "lucide-react";

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
    const messages = useQuery(api.messages.listMessagesByChat, { chatId: chatId as Id<"chats"> });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    // Handle initial load - wait for all messages to be ready before first scroll
    useEffect(() => {
        if (messages && messages.page.length > 0 && !initialLoadComplete) {
            const hasStreamingMessages = messages.page.some(message =>
                drivenIds.has(message._id)
            );

            if (!hasStreamingMessages) {
                setInitialLoadComplete(true);
                setTimeout(() => {
                    scrollToBottom();
                }, 100);
            }
        }
    }, [messages, drivenIds, scrollToBottom, initialLoadComplete]);

    // Handle ongoing scrolling - always scroll when messages change after initial load
    useEffect(() => {
        if (initialLoadComplete && messages) {
            scrollToBottom();
        }
    }, [messages, scrollToBottom, initialLoadComplete]);

    if (!messages) {
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

    // Reverse messages so newest appear at bottom
    const reversedMessages = [...messages.page].reverse();

    return (
        <motion.div
            className="w-full h-full flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            <div
                ref={messageContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden 
               scrollbar-thin scrollbar-track-transparent 
               scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300"
            >
                <div className="w-full max-w-full space-y-4 p-2 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {messages.page.length === 0 ? (
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
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col gap-10"
                            >
                                {reversedMessages.map((message, index) => (
                                    <React.Fragment key={message._id}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <MessageItem message={message} isUser={true}>
                                                {message.content}
                                            </MessageItem>
                                        </motion.div>
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 + 0.1 }}
                                        >
                                            <MessageItem message={message} isUser={false}>
                                                <ServerMessage
                                                    message={message}
                                                    isDriven={drivenIds.has(message._id)}
                                                    stopStreaming={() => {
                                                        onFocusInput();
                                                    }}
                                                    scrollToBottom={scrollToBottom}
                                                />
                                            </MessageItem>
                                        </motion.div>
                                    </React.Fragment>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>
            </div>
        </motion.div>
    );
}
