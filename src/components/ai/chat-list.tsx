"use client";

import { Button } from "@/components/ui/button";
import { Plus, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface Chat {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: Date;
}

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  className?: string;
}

export function ChatList({ chats, selectedChatId, onChatSelect, onNewChat, className }: ChatListProps) {
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
                  <span className="text-sm font-medium truncate">{chat.title}</span>
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