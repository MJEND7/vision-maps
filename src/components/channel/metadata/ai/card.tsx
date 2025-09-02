"use client"

import React, { useRef, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import MessageItem from "./message-item";
import dynamic from "next/dynamic";
import { useWindowSize } from "@/lib/utils";
import { Id } from "../../../../../convex/_generated/dataModel";

const ServerMessage = dynamic(() => import("./server-message").then(mod => ({ default: mod.ServerMessage })), {
    ssr: false,
    loading: () => <div>Loading...</div>
});

interface AiCardProps {
    chatId: string,
    drivenIds: Set<string>
    onFocusInput: () => void;
}

// Component that uses the streaming hooks
export function ChatCard({ chatId, drivenIds, onFocusInput }: AiCardProps) {
    //const [isStreaming, setIsStreaming] = useState(false);
    const messages = useQuery(api.messages.listMessagesByChat, { chatId: chatId as Id<"chats"> });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    //const clearAllMessages = useMutation(api.messages.clearMessages);

    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = "smooth") => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior });
            }
        },
        [messagesEndRef]
    );

    const windowSize = useWindowSize();

    useEffect(() => {
        scrollToBottom();
    }, [windowSize, scrollToBottom]);

    if (!messages) return null;

    return (
        <div className="flex-1 flex flex-col-reverse h-full max-h-[300px] bg-white">
            <div
                ref={messageContainerRef}
                className="flex-1 overflow-y-auto py-6 px-4 md:px-8 lg:px-12"
            >
                <div className="w-full max-w-5xl mx-auto space-y-6">
                    {messages.page.length === 0 && (
                        <div className="text-center text-gray-500">
                            No messages yet. Start the conversation!
                        </div>
                    )}
                    {messages.page.map((message) => (
                        <React.Fragment key={message._id}>
                            <MessageItem message={message} isUser={true}>
                                {message.content}
                            </MessageItem>
                            <MessageItem message={message} isUser={false}>
                                <ServerMessage
                                    message={message}
                                    isDriven={drivenIds.has(message._id)}
                                    stopStreaming={() => {
                                        //setIsStreaming(false);
                                        onFocusInput();
                                    }}
                                    scrollToBottom={scrollToBottom}
                                />
                            </MessageItem>
                        </React.Fragment>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        </div>
    );
}
