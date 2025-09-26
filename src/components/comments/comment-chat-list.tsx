"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { MessageSquare, MessageCircle, Users } from "lucide-react";
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
    selectedNodeId,
    selectedChatId,
    onChatSelect,
    onNodeSelect,
    onChannelNavigate,
    className
}: CommentChatListProps) {
    const [filter, setFilter] = useState<"all" | "active">("all");

    // Get all comment chats for the vision
    const allVisionChats = useQuery(
        api.chats.listVisionChats,
        { visionId: visionId as Id<"visions"> }
    );

    // Filter only comment chats
    const nodeCommentChats = allVisionChats?.filter(chat => chat.isCommentChat) || [];

    // Group chats by node
    const chatsByNode = nodeCommentChats.reduce((acc, chat) => {
        if (!chat.nodeId) return acc;
        
        const nodeId = chat.nodeId;
        if (!acc[nodeId]) {
            acc[nodeId] = [];
        }
        acc[nodeId].push(chat);
        return acc;
    }, {} as Record<string, typeof nodeCommentChats>);

    // Get node information for chat grouping
    // const nodeIds = Object.keys(chatsByNode); // Unused for now

    if (!nodeCommentChats.length) {
        return (
            <div className={`flex flex-col ${className || ""}`}>
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">Comments</h2>
                    <p className="text-sm text-muted-foreground">
                        Node conversations and comments
                    </p>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No comments yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Right-click on any node in a frame to add a comment
                    </p>
                </div>
            </div>
        );
    }

    const handleNodeClick = (nodeId: string) => {
        onNodeSelect(nodeId);
    };

    const handleChatClick = (chatId: string) => {
        onChatSelect(chatId);
    };

    const handleNavigateToNode = (channelId: string, nodeId: string) => {
        onChannelNavigate?.(channelId, nodeId);
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
                        variant={filter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("all")}
                    >
                        All
                    </Button>
                    <Button
                        variant={filter === "active" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("active")}
                    >
                        Active
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                    <AnimatePresence>
                        {Object.entries(chatsByNode).map(([nodeId, chats]) => {
                            const firstChat = chats[0];
                            if (!firstChat?.node) return null;

                            const isSelected = selectedNodeId === nodeId;
                            const totalMessages = chats.length; // For now, just use chat count
                            const lastActivity = Math.max(...chats.map(chat => chat._creationTime));

                            return (
                                <motion.div
                                    key={nodeId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="border rounded-lg overflow-hidden"
                                >
                                    {/* Node Header */}
                                    <div
                                        className={`p-3 cursor-pointer transition-colors ${
                                            isSelected 
                                                ? "bg-primary/10 border-primary/20" 
                                                : "hover:bg-muted/50"
                                        }`}
                                        onClick={() => handleNodeClick(nodeId)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                    <span className="font-medium text-sm truncate">
                                                        {firstChat.node.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <MessageSquare className="w-3 h-3" />
                                                        {chats.length} chat{chats.length !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {totalMessages} message{totalMessages !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatTimeAgo(new Date(lastActivity))}
                                            </div>
                                        </div>

                                        {/* Quick navigate button */}
                                        <div className="mt-2 flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (firstChat.node?.channelId) {
                                                        handleNavigateToNode(firstChat.node.channelId, nodeId);
                                                    }
                                                }}
                                                className="text-xs h-6 px-2"
                                            >
                                                Go to node →
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Chat List (when expanded) */}
                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="border-t bg-muted/20"
                                            >
                                                <div className="p-2 space-y-1">
                                                    {chats.map((chat) => (
                                                        <div
                                                            key={chat._id}
                                                            className={`p-2 rounded cursor-pointer transition-colors text-sm ${
                                                                selectedChatId === chat._id
                                                                    ? "bg-primary/20 border border-primary/30"
                                                                    : "hover:bg-muted/50"
                                                            }`}
                                                            onClick={() => handleChatClick(chat._id)}
                                                        >
                                                            <div className="flex items-start justify-between mb-1">
                                                                <span className="font-medium text-sm truncate">
                                                                    {chat.title}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    0
                                                                </span>
                                                            </div>
                                                            {/* {chat.lastMessage && (
                                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                                    {chat.lastMessage}
                                                                </p>
                                                            )} */}
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {formatTimeAgo(new Date(chat._creationTime))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </ScrollArea>
        </div>
    );
}