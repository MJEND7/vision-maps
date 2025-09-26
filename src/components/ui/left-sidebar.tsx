"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { ChatCard } from "../channel/metadata/ai/card";
import { ChatInput } from "../ai/chat-input";
import { ImprovedChatList } from "../ai/improved-chat-list";
import { CommentChatList } from "../comments/comment-chat-list";
import { CommentChat } from "../comments/comment-chat";
import { MessageSquare, Bot } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface LeftSidebarContentProps {
    visionId: string;
    onChannelNavigate?: (channelId: string, nodeId?: string) => void;
    selectedNodeId?: string; // For showing comments for a specific node
}

export interface LeftSidebarContentRef {
    openChat: (chatId: string) => void;
    openNodeComments: (nodeId: string) => void;
    openCommentChat: (chatId: string, nodeId?: string) => void;
}

export const LeftSidebarContent = forwardRef<LeftSidebarContentRef, LeftSidebarContentProps>(
    function LeftSidebarContent({ visionId, onChannelNavigate }, ref) {
        const [selectedTab, setSelectedTab] = useState("ai");
        const [selectedChatId, setSelectedChatId] = useState<string>();
        const [selectedNodeForComments, setSelectedNodeForComments] = useState<string>();
        const [drivenMessageIds, setDrivenMessageIds] = useState(new Set<string>());
        const [localCommentData, setLocalCommentData] = useState<{chatId: string, nodeId: string} | null>(null);


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

        // Expose the open chat and comment functions via ref
        useImperativeHandle(ref, () => ({
            openChat: (chatId: string) => {
                setSelectedTab("ai");
                setSelectedChatId(chatId);
                setSelectedNodeForComments(undefined);
            },
            openNodeComments: (nodeId: string) => {
                setSelectedTab("comments");
                setSelectedNodeForComments(nodeId);
                setSelectedChatId(undefined);
            },
            openCommentChat: (chatId: string, nodeId?: string) => {
                setSelectedTab("comments");
                setSelectedChatId(chatId);
                setSelectedNodeForComments(undefined);
                
                // Handle local comment chat creation
                if (chatId.startsWith('local-comment-') && nodeId) {
                    setLocalCommentData({ chatId, nodeId });
                } else {
                    setLocalCommentData(null);
                }
            }
        }), []);

        return (
            <div className="h-full flex flex-col bg-background">
                {/* Header with bubble tabs */}
                <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center justify-center">
                        <div className="inline-flex items-center justify-center rounded-full bg-muted p-1 space-x-1">
                            <button
                                onClick={() => {
                                    if (selectedTab !== "ai") {
                                        setSelectedChatId(undefined);
                                        setSelectedNodeForComments(undefined);
                                    }
                                    setSelectedTab("ai");
                                }}
                                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                    selectedTab === "ai" 
                                        ? "bg-background text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                }`}
                            >
                                <Bot className="w-4 h-4 mr-2" />
                                AI Chats
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedTab !== "comments") {
                                        setSelectedChatId(undefined);
                                        setSelectedNodeForComments(undefined);
                                    }
                                    setSelectedTab("comments");
                                }}
                                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                    selectedTab === "comments" 
                                        ? "bg-background text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                }`}
                            >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Comments
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    {/* AI Tab Content */}
                    {selectedTab === "ai" && (
                        <div className="flex-1 flex flex-col min-h-0">
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

                                    <div className="flex-1 p-4 min-h-0 bg-background">
                                        <ChatCard
                                            chatId={selectedChatId}
                                            drivenIds={drivenMessageIds}
                                            onFocusInput={handleFocusInput}
                                        />
                                    </div>

                                    <div className="flex-shrink-0 p-4 border-t bg-muted/10">
                                        <ChatInput
                                            onSendMessage={handleSendMessage}
                                            placeholder="Ask AI about this vision..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Comments Tab Content */}
                    {selectedTab === "comments" && (
                        <div className="flex-1 flex flex-col min-h-0">
                        {!selectedChatId ? (
                            <CommentChatList
                                visionId={visionId}
                                selectedNodeId={selectedNodeForComments}
                                selectedChatId={selectedChatId}
                                onChatSelect={setSelectedChatId}
                                onNodeSelect={setSelectedNodeForComments}
                                onChannelNavigate={onChannelNavigate}
                                className="flex-1"
                            />
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center gap-2 p-3 border-b">
                                    <button
                                        onClick={() => setSelectedChatId(undefined)}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        ← Back to comments
                                    </button>
                                    <span className="text-sm font-medium">
                                        Comment Chat
                                    </span>
                                </div>

                                    <div className="flex-1 min-h-0 bg-background">
                                        <CommentChat
                                            chatId={selectedChatId}
                                            className="h-full"
                                            onClose={() => {
                                                setSelectedChatId(undefined);
                                                setLocalCommentData(null);
                                            }}
                                            localCommentData={localCommentData}
                                            visionId={visionId}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    });
