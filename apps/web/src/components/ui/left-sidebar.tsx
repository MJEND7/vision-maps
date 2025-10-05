"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import { ChatCard } from "../channel/metadata/ai/card";
import { ChatInput } from "../ai/chat-input";
import { ImprovedChatList } from "../ai/improved-chat-list";
import { CommentChatList } from "../comments/comment-chat-list";
import { CommentChat } from "../comments/comment-chat";
import { MessageSquare, Bot, Lock } from "lucide-react";
import { useConvexMutation } from "@/hooks/useConvexWithToast";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Permission } from "@/lib/permissions";

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

        const { hasPermission } = usePermissions();
        const canUseAI = hasPermission(Permission.AI_NODES);
        const canComment = hasPermission(Permission.COMMENTING);

        // Mutations for chat operations
        const createChatWithNode = useConvexMutation(api.chats.createChatWithNode);
        const sendMessage = useConvexMutation(api.messages.sendMessage);

        const handleNewChat = async () => {
            try {
                const result = await createChatWithNode({
                    title: "New Chat",
                    visionId: visionId as Id<"visions">
                });

                if (result?.chatId) {
                    setSelectedChatId(result.chatId);
                }
            } catch {
                // Error already shown as toast by useConvexMutation
            }
        };

        const handleSendMessage = async (message: string) => {
            if (!selectedChatId) return;

            try {
                const result = await sendMessage({
                    chatId: selectedChatId as Id<"chats">,
                    content: message
                });
                if (!result) {
                    throw new Error("Missing result")
                }
                setDrivenMessageIds((ids) => ids.add(result.messageId));
            } catch (e) {
                // Error already shown as toast by useConvexMutation
                console.error(e)
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
                                    if (!canUseAI) return;
                                    if (selectedTab !== "ai") {
                                        setSelectedChatId(undefined);
                                        setSelectedNodeForComments(undefined);
                                    }
                                    setSelectedTab("ai");
                                }}
                                disabled={!canUseAI}
                                title={!canUseAI ? "Upgrade to Pro to use AI features" : ""}
                                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    selectedTab === "ai"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                }`}
                            >
                                {!canUseAI && <Lock className="w-3 h-3 mr-1" />}
                                <Bot className="w-4 h-4 mr-2" />
                                AI Chats
                            </button>
                            <button
                                onClick={() => {
                                    if (!canComment) return;
                                    if (selectedTab !== "comments") {
                                        setSelectedChatId(undefined);
                                        setSelectedNodeForComments(undefined);
                                    }
                                    setSelectedTab("comments");
                                }}
                                disabled={!canComment}
                                title={!canComment ? "Upgrade to Teams to use commenting" : ""}
                                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    selectedTab === "comments"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                }`}
                            >
                                {!canComment && <Lock className="w-3 h-3 mr-1" />}
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Comments
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    {/* AI Tab Content */}
                    {selectedTab === "ai" && (
                        canUseAI ? (
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
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-8">
                                <div className="text-center space-y-3">
                                    <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
                                    <h3 className="text-lg font-semibold">AI Features Locked</h3>
                                    <p className="text-sm text-muted-foreground max-w-xs">
                                        Upgrade to Pro to unlock AI-powered nodes, chats, and context mapping.
                                    </p>
                                </div>
                            </div>
                        )
                    )}

                    {/* Comments Tab Content */}
                    {selectedTab === "comments" && (
                        canComment ? (
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
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-8">
                                <div className="text-center space-y-3">
                                    <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
                                    <h3 className="text-lg font-semibold">Commenting Locked</h3>
                                    <p className="text-sm text-muted-foreground max-w-xs">
                                        Upgrade to Teams to unlock team commenting and collaboration features.
                                    </p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        );
    }
);

LeftSidebarContent.displayName = "LeftSidebarContent";
