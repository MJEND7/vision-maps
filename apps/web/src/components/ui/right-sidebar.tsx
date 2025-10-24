"use client";

import { useState, useImperativeHandle, forwardRef, useRef } from "react";
import { ChatCard } from "../channel/metadata/ai/card";
import { ChatInput, ChatInputRef } from "../ai/chat-input";
import { ImprovedChatList } from "../ai/improved-chat-list";
import { CommentChatList } from "../comments/comment-chat-list";
import { CommentChat } from "../comments/comment-chat";
import { MessageSquare, Bot, Lock, PanelRightClose } from "lucide-react";
import { useConvexMutation } from "@/hooks/convex/useConvexWithToast";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Permission } from "@/lib/permissions";
import { PresenceFacePile } from "./face-pile";
import { Button } from "./button";

interface RightSidebarContentProps {
    visionId: string;
    onChannelNavigate?: (channelId: string, nodeId?: string) => void;
    onToggleRightSidebar?: () => void;
    selectedNodeId?: string; // For showing comments for a specific node
    currentFrameId?: string; // The currently active frame, if in a frame view
}

export interface RightSidebarContentRef {
    openChat: (chatId: string) => void;
    openNodeComments: (nodeId: string) => void;
    openCommentChat: (chatId: string, nodeId?: string) => void;
}

export const RightSidebarContent = forwardRef<RightSidebarContentRef, RightSidebarContentProps>(
    function RightSidebarContent({ visionId, onChannelNavigate, onToggleRightSidebar, currentFrameId }, ref) {
        const [selectedTab, setSelectedTab] = useState("ai");
        const [selectedChatId, setSelectedChatId] = useState<string>();
        const [selectedNodeForComments, setSelectedNodeForComments] = useState<string>();
        const [drivenMessageIds, setDrivenMessageIds] = useState(new Set<string>());
        const [localCommentData, setLocalCommentData] = useState<{ chatId: string, nodeId: string } | null>(null);

        const chatInputRef = useRef<ChatInputRef>(null);

        const { hasPermission } = usePermissions();
        const { workspace } = useWorkspace();
        const canUseAI = hasPermission(Permission.AI_NODES);
        const canComment = hasPermission(Permission.COMMENTING);

        // Mutations for chat operations
        const createChatWithNode = useConvexMutation(api.chats.createChatWithNode);
        const sendMessage = useConvexMutation(api.messages.sendMessage);
        const branchChatMutation = useConvexMutation(api.chats.branchChat);
        const deleteMessagesAfter = useConvexMutation(api.messages.deleteMessagesAfter);
        const createTextNodeFromMessage = useConvexMutation(api.nodes.createTextNodeFromMessage);

        const handleNewChat = async () => {
            try {
                const result = await createChatWithNode({
                    title: "New Chat",
                    visionId: visionId as Id<"visions">,
                    workspaceId: workspace?._id || ""
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


        const handleRetryMessage = async (messageId: string) => {
            if (!selectedChatId) return;

            try {
                console.log('[Retry] Starting retry for message:', messageId);

                // Delete all messages after this AI response and get the user prompt
                const result = await deleteMessagesAfter({
                    chatId: selectedChatId as Id<"chats">,
                    afterMessageId: messageId as Id<"messages">,
                });

                console.log('[Retry] Deleted messages, got user prompt:', result?.userPromptContent);
                console.log('[Retry] Deleted count:', result?.deletedCount);

                // Resend the user's prompt
                if (result?.userPromptContent) {
                    console.log('[Retry] Resending message:', result.userPromptContent);

                    // Small delay to ensure Convex has processed the deletions
                    await new Promise(resolve => setTimeout(resolve, 100));

                    await handleSendMessage(result.userPromptContent);
                    console.log('[Retry] Message sent successfully');
                } else {
                    console.error('[Retry] No user prompt found!');
                }
            } catch (e) {
                console.error('[Retry] Error during retry:', e);
                // Error already shown as toast by useConvexMutation
            }
        };

        const handleBranchChat = async (messageId: string) => {
            if (!selectedChatId) return;

            try {
                // If we're in a frame, calculate position for the new node
                const frameId = currentFrameId;
                let position = undefined;

                if (frameId) {
                    // Position the new node 200 pixels below the source
                    // The backend will use this position directly
                    position = {
                        x: 100, // Default x position
                        y: 100, // Will be adjusted based on source node position by backend if possible
                    };
                }

                const result = await branchChatMutation({
                    sourceChatId: selectedChatId as Id<"chats">,
                    upToMessageId: messageId as Id<"messages">,
                    frameId: frameId as Id<"frames"> | undefined,
                    position: position,
                });

                if (result?.chatId) {
                    setSelectedChatId(result.chatId);
                }
            } catch (e) {
                // Error already shown as toast by useConvexMutation
                console.error(e);
            }
        };

        const handleCreateTextNode = async (messageId: string) => {
            if (!selectedChatId) return;

            try {
                await createTextNodeFromMessage({
                    chatId: selectedChatId as Id<"chats">,
                    messageId: messageId as Id<"messages">,
                });
            } catch (e) {
                // Error already shown as toast by useConvexMutation
                console.error(e);
            }
        };

        const handleFocusInput = () => {
            // Focus the chat input when streaming stops or user wants to interact
            chatInputRef.current?.focus();
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
                {/* Header with improved layout (responsive & compact) */}
                <div className="p-3 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    {/* Left section: presence + toggle */}
                    <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2">
                        <PresenceFacePile visionId={visionId} />

                        {onToggleRightSidebar && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onToggleRightSidebar}
                                className="p-2 bg-background sm:ml-1"
                                aria-label="Close sidebar"
                            >
                                <PanelRightClose className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    {/* Right section: Tabs */}
                    <div className="flex w-full sm:w-auto justify-center">
                        <div className="inline-flex items-center justify-between rounded-full bg-background/60 border border-border p-1 w-full max-w-sm sm:max-w-none">
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
                                className={`flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all ${selectedTab === "ai"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                    }`}
                            >
                                {!canUseAI && <Lock className="w-3 h-3 mr-1" />}
                                <Bot className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">AI Chats</span>
                                <span className="sm:hidden">AI</span>
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
                                className={`flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all ${selectedTab === "comments"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                    }`}
                            >
                                {!canComment && <Lock className="w-3 h-3 mr-1" />}
                                <MessageSquare className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Comments</span>
                                <span className="sm:hidden">Notes</span>
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

                                        <div className="flex-1 p-3 min-h-0 bg-background">
                                            <ChatCard
                                                chatId={selectedChatId}
                                                drivenIds={drivenMessageIds}
                                                onFocusInput={handleFocusInput}
                                                onRetryMessage={handleRetryMessage}
                                                onBranchChat={handleBranchChat}
                                                onCreateTextNode={handleCreateTextNode}
                                            />
                                        </div>

                                        <div className="flex-shrink-0 px-4 pb-8 sm:pb-4">
                                            <ChatInput
                                                ref={chatInputRef}
                                                onSendMessage={handleSendMessage}
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

RightSidebarContent.displayName = "RightSidebarContent";
