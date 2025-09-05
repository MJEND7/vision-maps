"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { ChatCard } from "../channel/metadata/ai/card";
import { ChatInput } from "../ai/chat-input";
import { ChatList } from "../ai/chat-list";
import { Bot, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface RightSidebarContentProps {
    visionId?: string;
}

export interface RightSidebarContentRef {
    openChat: (chatId: string) => void;
}

export const RightSidebarContent = forwardRef<RightSidebarContentRef, RightSidebarContentProps>(
    function RightSidebarContent({}, ref) {
    const [selectedTab, setSelectedTab] = useState("ai");
    const [selectedChatId, setSelectedChatId] = useState<string>();
    const [drivenMessageIds, setDrivenMessageIds] = useState(new Set<string>());

    // Fetch user chats from Convex
    const chats = useQuery(api.chats.listUserChats, {});
    const createChat = useMutation(api.chats.createChat);
    const sendMessage = useMutation(api.messages.sendMessage);

    const handleNewChat = async () => {
        try {
            const newChatId = await createChat({
                title: `New Chat ${(chats?.length || 0) + 1}`
            });

            if (newChatId) {
                setSelectedChatId(newChatId);
            }
        } catch (error) {
            console.error("Failed to create chat:", error);
        }
    };

    const handleSendMessage = async (message: string) => {
        if (!selectedChatId) return;

        try {
            const result = await sendMessage({
                chatId: selectedChatId as Id<"chats">,
                content: message
            });
            setDrivenMessageIds((ids) => ids.add(result.messageId))
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const handleFocusInput = () => {
        // Handle focus input - could be used for stopping streaming
    };

    // Expose the open chat function via ref
    useImperativeHandle(ref, () => ({
        openChat: (chatId: string) => {
            if (chats?.some(chat => chat._id === chatId)) {
                setSelectedTab("ai");
                setSelectedChatId(chatId);
            }
        }
    }), [chats]);

    // Transform Convex chats to match ChatList interface
    const transformedChats = (chats || []).map(chat => ({
        id: chat._id,
        title: chat.title,
        lastMessage: undefined, // Could be populated with latest message if needed
        updatedAt: new Date(chat._creationTime)
    }));

    return (
        <div className="h-full flex flex-col">
            <Tabs defaultValue="ai" value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
                <TabsList className="shrink-0 grid w-full grid-cols-2">
                    <TabsTrigger value="ai" className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        <span>AI</span>
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Comments</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="flex-1 flex flex-col mt-0 min-h-0">
                    {!selectedChatId ? (
                        <ChatList
                            chats={transformedChats}
                            selectedChatId={selectedChatId}
                            onChatSelect={setSelectedChatId}
                            onNewChat={handleNewChat}
                            className="flex-1"
                        />
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center gap-2 p-3 border-b">
                                <button
                                    onClick={() => setSelectedChatId(undefined)}
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    ← Back to chats
                                </button>
                                <span className="text-sm font-medium">
                                    {transformedChats.find(c => c.id === selectedChatId)?.title}
                                </span>
                            </div>

                            <div className="flex-1 p-4 min-h-0">
                                <ChatCard
                                    chatId={selectedChatId}
                                    drivenIds={drivenMessageIds}
                                    onFocusInput={handleFocusInput}
                                />
                            </div>

                            <ChatInput
                                onSendMessage={handleSendMessage}
                                placeholder="Ask AI about this vision..."
                            />
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="comments" className="flex-1 mt-0 pt-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center h-32 text-center"
                    >
                        <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Comments coming soon</p>
                        <p className="text-xs text-muted-foreground/60">This feature is under development</p>
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    );
});
