"use client";

import { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { ChatCard } from "../channel/metadata/ai/card";
import { ChatInput } from "../ai/chat-input";
import { ChatList } from "../ai/chat-list";
import { Bot, MessageSquare, AlertTriangle, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { Alert, AlertDescription } from "./alert";

interface RightSidebarContentProps {
    visionId: string;
    onChannelNavigate?: (channelId: string, nodeId?: string) => void;
}

export interface RightSidebarContentRef {
    openChat: (chatId: string) => void;
}

export const RightSidebarContent = forwardRef<RightSidebarContentRef, RightSidebarContentProps>(
    function RightSidebarContent({ visionId, onChannelNavigate }, ref) {
    const [selectedTab, setSelectedTab] = useState("ai");
    const [selectedChatId, setSelectedChatId] = useState<string>();
    const [drivenMessageIds, setDrivenMessageIds] = useState(new Set<string>());
    
    // Delete chat dialog state
    const [deleteChatDialog, setDeleteChatDialog] = useState({
        isOpen: false,
        chatId: null as string | null,
        chatTitle: ""
    });

    // Fetch vision-specific chats from Convex
    const chats = useQuery(api.chats.listVisionChats, { visionId: visionId as Id<"visions"> });
    const createChat = useMutation(api.chats.createChat);
    const deleteChat = useMutation(api.chats.deleteChat);
    const sendMessage = useMutation(api.messages.sendMessage);

    const handleNewChat = async () => {
        try {
            const newChatId = await createChat({
                title: `New Chat ${(chats?.length || 0) + 1}`,
                visionId: visionId as Id<"visions">
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

    const handleDeleteChat = async (chatId: string) => {
        const chat = transformedChats.find(c => c.id === chatId);
        if (!chat) return;

        setDeleteChatDialog({
            isOpen: true,
            chatId,
            chatTitle: chat.title
        });
    };

    const confirmChatDelete = async () => {
        if (!deleteChatDialog.chatId) return;

        try {
            await deleteChat({ chatId: deleteChatDialog.chatId as Id<"chats"> });
            
            // If we're currently viewing the deleted chat, go back to chat list
            if (selectedChatId === deleteChatDialog.chatId) {
                setSelectedChatId(undefined);
            }
        } catch (error) {
            console.error("Failed to delete chat:", error);
        } finally {
            cancelChatDelete();
        }
    };

    const cancelChatDelete = () => {
        setDeleteChatDialog({
            isOpen: false,
            chatId: null,
            chatTitle: ""
        });
    };

    const handleFocusInput = () => {
        // Handle focus input - could be used for stopping streaming
    };

    // Check if currently selected chat still exists
    useEffect(() => {
        if (selectedChatId && chats && !chats.some(chat => chat._id === selectedChatId)) {
            // Currently selected chat no longer exists, go back to chat list
            setSelectedChatId(undefined);
        }
    }, [chats, selectedChatId]);

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
        updatedAt: new Date(chat._creationTime),
        channel: chat.channel,
        node: chat.node
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
                            onChannelNavigate={onChannelNavigate}
                            onDeleteChat={handleDeleteChat}
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

            {/* Chat Deletion Confirmation Dialog */}
            <Dialog open={deleteChatDialog.isOpen} onOpenChange={(open) => {
                if (!open) cancelChatDelete();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Delete Chat
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the chat "{deleteChatDialog.chatTitle}"?
                        </DialogDescription>
                    </DialogHeader>

                    <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            <strong>Warning:</strong> This action cannot be undone. Deleting this chat will permanently remove:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>All messages in this conversation</li>
                                <li>All AI responses and context</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={cancelChatDelete}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmChatDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Chat
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});
