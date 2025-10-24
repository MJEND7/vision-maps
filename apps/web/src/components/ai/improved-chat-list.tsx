"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Hash,
  Trash2,
  Edit2,
  Check,
  X,
  MoreVertical,
  Calendar,
  MessageSquare,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { usePaginatedQuery } from "convex/react";
import { useConvexMutation } from "@/hooks/convex/useConvexWithToast";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import InfiniteScroll from "react-infinite-scroll-component";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { timeSinceFromDateString } from "@/utils/date";

interface ChatListProps {
  visionId: string;
  selectedChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onChannelNavigate?: (channelId: string, nodeId?: string) => void;
  className?: string;
}

interface ChatWidgetProps {
  chat: any;
  isSelected: boolean;
  onSelect: () => void;
  onChannelNavigate?: (channelId: string, nodeId?: string) => void;
  onDelete: (chatId: string) => void;
  onUpdateTitle: (chatId: string, title: string) => void;
}

/* -------------------- Chat Card -------------------- */
function ChatWidget({
  chat,
  isSelected,
  onSelect,
  onChannelNavigate,
  onDelete,
  onUpdateTitle,
}: ChatWidgetProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditedTitle(chat.title);
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle.trim() !== chat.title) {
      onUpdateTitle(chat._id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle(chat.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveTitle();
    else if (e.key === "Escape") handleCancelEdit();
  };

  const handleChannelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChannelNavigate) {
      onChannelNavigate(
        chat.channel?._id || chat.node?.channelId || "",
        chat.node?._id
      );
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(chat._id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "group relative cursor-pointer rounded-md border border-border/40 bg-muted/20 p-3",
        "hover:bg-muted/30 hover:shadow-sm transition-all",
        isSelected && "border-primary bg-primary/10 shadow-sm"
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                ref={inputRef}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm font-medium"
                placeholder="Chat title..."
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                onClick={handleSaveTitle}
              >
                <Check className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                onClick={handleCancelEdit}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="max-w-[260px] flex gap-2 items-center">
                <h4 className="text-sm font-medium text-foreground/90 truncate">
                  {chat.title}
                </h4>
                {chat.nodeId && (
                  <Brain
                    className="w-3 h-3 text-blue-500"
                    aria-label="Linked to AI node in channel"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <div className="flex items-center ml-1 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={handleStartEdit}
            title="Edit title"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleStartEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit title
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteClick}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {(chat.channel || chat.node) && (
          <button
            onClick={handleChannelClick}
            className="flex items-center gap-1 text-xs text-muted-foreground/80 hover:text-primary transition-colors"
            title="Go to channel"
          >
            <Hash className="w-3 h-3" />
            <span className="truncate">
              {chat.channel?.title || chat.node?.title || "Channel"}
            </span>
          </button>
        )}

        {chat.lastMessage && (
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
              {chat.lastMessage}
            </p>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <Calendar className="w-3 h-3" />
          <span>
            {timeSinceFromDateString(
              new Date(chat.lastMessageAt || chat._creationTime)
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------- Skeleton -------------------- */
function ChatListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-md border border-border/40 bg-muted/20 p-4 animate-pulse"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 bg-gray-200/40 rounded w-32" />
            <div className="h-6 w-6 bg-gray-200/40 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200/40 rounded w-20" />
            <div className="h-3 bg-gray-200/40 rounded w-full" />
            <div className="h-3 bg-gray-200/40 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------- Main Component -------------------- */
export function ImprovedChatList({
  visionId,
  selectedChatId,
  onChatSelect,
  onNewChat,
  onChannelNavigate,
  className,
}: ChatListProps) {
  const { results: chatsPage, status, loadMore } = usePaginatedQuery(
    api.chats.listVisionChatsPaginated,
    { visionId: visionId as Id<"visions"> },
    { initialNumItems: 10 }
  );

  const updateChatTitle = useConvexMutation(api.chats.updateChatTitle);
  const deleteChat = useConvexMutation(api.chats.deleteChat);

  const allChats = chatsPage?.flatMap((page) => page) || [];
  const filteredChats = allChats.filter((chat: any) => !chat.isCommentChat);

  const handleUpdateTitle = async (chatId: string, title: string) => {
    try {
      await updateChatTitle({
        chatId: chatId as Id<"chats">,
        title,
      });
      toast.success("Chat title updated");
    } catch {}
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat({ chatId: chatId as Id<"chats"> });
      toast.success("Chat deleted");
    } catch {}
  };

  /* -------------------- Layout -------------------- */
  if (status === "LoadingFirstPage") {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <ChatListSkeleton />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Scrollable Chat List */}
      <div className="flex-1 overflow-hidden">
        {filteredChats.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center px-6"
          >
            <h4 className="text-sm font-medium mb-2 text-foreground/80">
              No conversations yet
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              Start your first AI conversation to see it here
            </p>
          </motion.div>
        ) : (
          <div
            id="chat-list-scroll"
            className="h-full overflow-y-auto"
            style={{ overflowAnchor: "none" }}
          >
            <InfiniteScroll
              dataLength={filteredChats.length}
              next={() => loadMore(5)}
              hasMore={status === "CanLoadMore"}
              loader={
                <div className="flex justify-center py-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                  />
                </div>
              }
              scrollableTarget="chat-list-scroll"
              className="space-y-3 p-3"
            >
              <AnimatePresence mode="popLayout">
                {filteredChats.map((chat) => (
                  <ChatWidget
                    key={chat._id}
                    chat={chat}
                    isSelected={selectedChatId === chat._id}
                    onSelect={() => onChatSelect(chat._id)}
                    onChannelNavigate={onChannelNavigate}
                    onDelete={handleDeleteChat}
                    onUpdateTitle={handleUpdateTitle}
                  />
                ))}
              </AnimatePresence>
            </InfiniteScroll>
          </div>
        )}
      </div>

      {/* Fixed bottom button */}
      <div className="sm:py-3 border-t bg-muted/40 px-4 pt-3 pb-8">
        <Button
          onClick={onNewChat}
          size="sm"
          className="w-full justify-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>
    </div>
  );
}
