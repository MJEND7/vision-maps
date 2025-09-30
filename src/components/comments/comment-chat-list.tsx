"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { MessageSquare, MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

// Simple utility to format time ago
function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

interface CommentChatListProps {
    visionId: string;
    selectedNodeId?: string;
    selectedChatId?: string;
    onChatSelect: (chatId: string) => void;
    onNodeSelect: (nodeId: string) => void;
    onChannelNavigate?: (channelId: string, nodeId?: string) => void;
    className?: string;
}

export function CommentChatList({
    visionId,
    selectedChatId,
    onChatSelect,
    onChannelNavigate,
    className
}: CommentChatListProps) {
    const [filter, setFilter] = useState<"active" | "inactive">("active");
    
    // Mutation for closing comment chats
    const closeCommentChat = useMutation(api.comments.closeCommentChat);

    // Get all comment chats for the vision
    const allVisionChats = useQuery(
        api.chats.listVisionChats,
        { visionId: visionId as Id<"visions"> }
    );

    // Filter only active comment chats
    const activeCommentChats = allVisionChats?.filter(chat =>
        chat.isCommentChat && chat.isActive !== false
    ) || [];

    // Get inactive comment chats if needed
    const inactiveChats = useQuery(
        api.comments.getAllInactiveCommentChats,
        filter === "inactive" ? {
            visionId: visionId as Id<"visions">
        } : "skip"
    ) || [];

    // Use the appropriate chat list based on filter, sorted by newest first
    const nodeCommentChats = (filter === "inactive" ? inactiveChats : activeCommentChats)
        .sort((a, b) => new Date(b._creationTime).getTime() - new Date(a._creationTime).getTime());

    const handleChatClick = (chatId: string) => {
        onChatSelect(chatId);
    };

    const handleNavigateToNode = (channelId: string, nodeId: string) => {
        onChannelNavigate?.(channelId, nodeId);
    };

    const handleCloseChat = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await closeCommentChat({ chatId: chatId as Id<"chats"> });
        } catch (error) {
            console.error('Failed to close chat:', error);
        }
    };

    return (
        <div className={`flex flex-col ${className || ""}`}>
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Comments</h2>
                <p className="text-sm text-muted-foreground mb-3">
                    Node conversations and comments
                </p>

                <div className="flex gap-2">
                    <Button
                        variant={filter === "active" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("active")}
                    >
                        Active
                    </Button>
                    <Button
                        variant={filter === "inactive" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("inactive")}
                    >
                        Inactive
                    </Button>
                </div>
            </div>

            {nodeCommentChats.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <h3 className="text-sm font-medium mb-2">
                        {filter === "inactive" ? "No inactive comments" : "No comments yet"}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                        {filter === "inactive"
                            ? "Closed comment chats will appear here"
                            : "Add a comment to any node in a channel or frame"
                        }
                    </p>
                </div>
            ) : (
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-3">
                        <AnimatePresence>
                            {nodeCommentChats.map((chat: any) => (
                                <motion.div
                                    key={chat._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className={`group border rounded-lg p-4 transition-colors cursor-pointer ${
                                        selectedChatId === chat._id
                                            ? "bg-primary/10 border-primary/30 shadow-sm"
                                            : "hover:bg-muted/50 hover:border-muted"
                                    }`}
                                    onClick={() => handleChatClick(chat._id)}
                                >
                                    {/* Chat Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span className="font-medium text-sm truncate">
                                                    {chat.title}
                                                </span>
                                            </div>
                                            {chat.node && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                                    <MessageCircle className="w-3 h-3" />
                                                    <span>Node: {chat.node.title}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs text-muted-foreground">
                                                {formatTimeAgo(new Date(chat._creationTime))}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => handleCloseChat(chat._id, e)}
                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
                                                title="Close this comment chat"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Chat Actions */}
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-muted-foreground">
                                            {chat.messageCount || 0} message{(chat.messageCount || 0) !== 1 ? 's' : ''}
                                        </div>
                                        
                                        {chat.node && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (chat.node?.channelId) {
                                                        handleNavigateToNode(chat.node.channelId, chat.nodeId);
                                                    }
                                                }}
                                                className="text-xs h-7 px-3 bg-background hover:bg-muted/60"
                                            >
                                                Go to node →
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}