"use client";

import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Hash, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface Chat {
    id: string;
    title: string;
    lastMessage?: string;
    updatedAt: Date;
    channel?: {
        _id: string;
        title: string;
    } | null;
    node?: {
        _id: string;
        title: string;
        channelId: string;
    } | null;
}

interface ChatListProps {
    chats: Chat[];
    selectedChatId?: string;
    onChatSelect: (chatId: string) => void;
    onNewChat: () => void;
    onChannelNavigate?: (channelId: string, nodeId?: string) => void;
    onDeleteChat: (chatId: string) => void;
    className?: string;
}

export function ChatList({ chats, selectedChatId, onChatSelect, onNewChat, onChannelNavigate, onDeleteChat, className }: ChatListProps) {

    const handleChannelClick = (e: React.MouseEvent, channelId: string, nodeId?: string) => {
        e.stopPropagation();
        if (onChannelNavigate) {
            onChannelNavigate(channelId, nodeId);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        onDeleteChat(chatId);
    };
    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="flex items-center justify-between p-3 border-b">
                <h3 className="text-sm font-medium">AI Chats</h3>
                <Button
                    onClick={onNewChat}
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {chats.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center h-32 text-center px-4"
                    >
                        <MessageCircle className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No chats yet</p>
                        <p className="text-xs text-muted-foreground/60">Start a conversation to begin</p>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {chats.map((chat, index) => (
                            <motion.button
                                key={chat.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => onChatSelect(chat.id)}
                                className={cn(
                                    "w-full text-left p-3 border-b hover:bg-accent/50 transition-colors",
                                    selectedChatId === chat.id && "bg-accent"
                                )}
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium truncate flex-1">{chat.title}</span>
                                        <div className="flex items-center gap-1">
                                            {(chat.channel || chat.node) && (
                                                <button
                                                    onClick={(e) => handleChannelClick(
                                                        e,
                                                        chat.channel?._id || chat.node?.channelId || '',
                                                        chat.node?._id
                                                    )}
                                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-background/50"
                                                    title="Go to channel"
                                                >
                                                    <Hash className="w-3 h-3" />
                                                    <span className="truncate max-w-16">
                                                        {chat.channel?.title || 'Channel'}
                                                    </span>
                                                </button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant={"outline"}
                                                onClick={(e) => handleDeleteClick(e, chat.id)}
                                                title="Delete chat"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    {chat.lastMessage && (
                                        <span className="text-xs text-muted-foreground truncate">
                                            {chat.lastMessage}
                                        </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        {chat.updatedAt.toLocaleDateString()}
                                    </span>
                                </div>
                            </motion.button>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
