"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import { Tabs, TabsContent } from "./tabs";
import { ChatCard } from "../channel/metadata/ai/card";
import { ChatInput } from "../ai/chat-input";
import { ImprovedChatList } from "../ai/improved-chat-list";
import { MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface LeftSidebarContentProps {
    visionId: string;
    onChannelNavigate?: (channelId: string, nodeId?: string) => void;
}

export interface LeftSidebarContentRef {
    openChat: (chatId: string) => void;
}

export const LeftSidebarContent = forwardRef<LeftSidebarContentRef, LeftSidebarContentProps>(
    function LeftSidebarContent({ visionId, onChannelNavigate }, ref) {
        const [selectedTab, setSelectedTab] = useState("ai");
        const [selectedChatId, setSelectedChatId] = useState<string>();
        const [drivenMessageIds, setDrivenMessageIds] = useState(new Set<string>());


        // Mutations for chat operations
        const createChatWithNode = useMutation(api.chats.createChatWithNode);
        const sendMessage = useMutation(api.messages.sendMessage);

        const handleNewChat = async () => {
            try {
                const result = await createChatWithNode({
                    title: "New Chat",
                    visionId: visionId as Id<"visions">
                });

                if (result.chatId) {
                    setSelectedChatId(result.chatId);
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
                setDrivenMessageIds((ids) => ids.add(result.messageId));
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
                setSelectedTab("ai");
                setSelectedChatId(chatId);
            }
        }), []);

        return (
            <div className="h-full flex flex-col">
                <Tabs defaultValue="ai" value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
                    <TabsContent value="ai" className="flex-1 flex flex-col mt-0 min-h-0">
                        {!selectedChatId ? (
                            <ImprovedChatList
                                visionId={visionId}
                                selectedChatId={selectedChatId}
                                onChatSelect={setSelectedChatId}
                                onNewChat={handleNewChat}
                                onChannelNavigate={onChannelNavigate}
                                className="flex-1"
                            />
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center gap-2 p-3">
                                    <button
                                        onClick={() => setSelectedChatId(undefined)}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        ← Back to chats
                                    </button>
                                    <span className="text-sm font-medium">
                                        Chat
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
