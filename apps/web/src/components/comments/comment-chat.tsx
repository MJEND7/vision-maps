"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { Id } from '../../../convex/_generated/dataModel';
import { Send, User, MoreHorizontal, Edit2, Trash2, Reply, CornerUpLeft, X } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
// Simple utility to format time ago
function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
}
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface CommentChatProps {
  chatId: string;
  className?: string;
  onClose?: () => void;
  localCommentData?: {chatId: string, nodeId: string} | null;
  visionId?: string;
}

interface Comment {
  _id: Id<"comments">;
  content: string;
  authorId: string;
  nodeId?: Id<"nodes">;
  visionId: Id<"visions">;
  parentCommentId?: Id<"comments">;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  author: {
    _id: Id<"users">;
    name: string;
    picture?: string;
    email: string;
  } | null;
}

export function CommentChat({ chatId, className, onClose, localCommentData, visionId }: CommentChatProps) {
  const { user } = useUser();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [tempMessage, setTempMessage] = useState<string>('');
  const [realChatId, setRealChatId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Mutations
  const closeCommentChat = useMutation(api.comments.closeCommentChat);
  const createCommentChat = useMutation(api.comments.createCommentChat);

  // Check if this is a local comment chat
  const isLocalChat = chatId?.startsWith('local-comment-');
  
  // For existing chats, set realChatId immediately
  React.useEffect(() => {
    if (!isLocalChat && chatId && !realChatId) {
      setRealChatId(chatId);
    }
  }, [isLocalChat, chatId, realChatId]);

  // Get chat details (skip for local chats that don't have real chat ID yet)
  const chat = useQuery(api.chats.getChat,
    realChatId ? { chatId: realChatId as Id<"chats"> } : "skip"
  );

  // Get messages for this specific chat (skip for local chats without real ID)
  const messagesResult = useQuery(
    api.messages.listMessagesByChat,
    chat && realChatId ? {
      chatId: chat._id,
      paginationOpts: {
        numItems: 50,
        cursor: null
      }
    } : "skip"
  );

  // Get unique user IDs from messages
  const userIds = React.useMemo(() => {
    if (!messagesResult?.page) return [];
    const ids = messagesResult.page.map((message: any) => message.userId).filter(Boolean);
    return [...new Set(ids)];
  }, [messagesResult]);

  // Get user data for all message authors
  const users = useQuery(
    api.user.getUsersByExternalIds,
    userIds.length > 0 ? { externalIds: userIds } : "skip"
  );

  // Convert messages to comment-like structure for display
  const comments = React.useMemo(() => {
    if (!messagesResult?.page || !chat) return [];
    
    return messagesResult.page.map((message: any) => {
      const author = users?.find((user: any) => user.externalId === message.userId);
      return {
        _id: message._id as any,
        content: message.content,
        authorId: message.userId || chat.userId,
        nodeId: chat.nodeId,
        visionId: chat.visionId,
        parentCommentId: message.replyToMessageId, // Use the replyToMessageId for threading
        mentions: [],
        createdAt: new Date(message._creationTime).toISOString(),
        updatedAt: new Date(message._creationTime).toISOString(),
        isDeleted: false,
        author: author ? {
          _id: author._id,
          name: author.name || 'Unknown User',
          picture: author.picture,
          email: author.email || ''
        } : {
          _id: message._id as any,
          name: 'Unknown User',
          picture: undefined,
          email: ''
        }
      };
    }) as Comment[];
  }, [messagesResult, chat, users]);

  // Auto-scroll to bottom when new comments are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [comments]);

  // Focus textarea when replying or editing
  useEffect(() => {
    if ((replyingTo || editingComment) && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo, editingComment]);

  const sendMessage = useMutation(api.messages.sendMessage);

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    try {
      // If this is a local chat, create the actual chat first
      if (isLocalChat && localCommentData && visionId) {
        setIsCreatingChat(true);
        setTempMessage(newComment.trim()); // Store the message to show temporarily
        const result = await createCommentChat({
          nodeId: localCommentData.nodeId as Id<"nodes">,
          visionId: visionId as Id<"visions">,
          initialComment: newComment.trim(),
          title: `Comment thread`
        });
        
        if (result.success && result.chatId) {
          // Clear the input immediately to show responsiveness
          setNewComment('');
          setReplyingTo(null);
          
          // Store the real chat ID but don't notify parent to switch
          // This will make the queries start fetching real data
          setRealChatId(result.chatId);
          setIsCreatingChat(false);
          setTempMessage('');
          return; // Exit early for local chat creation
        } else {
          console.error('Failed to create comment chat');
          setIsCreatingChat(false);
          setTempMessage('');
          return;
        }
      } else if (!chat) {
        return;
      } else {
        // Send message to existing chat
        await sendMessage({
          chatId: chat._id,
          content: newComment.trim(),
          replyToMessageId: replyingTo ? (replyingTo as any) : undefined
        });
      }

      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsCreatingChat(false);
    }
  };

  // For now, disable editing and deleting messages in comment chats
  const handleEditComment = async () => {
    console.log('Message editing not yet implemented for comment chats');
    setEditingComment(null);
    setEditContent('');
  };

  const handleDeleteComment = async () => {
    console.log('Message deletion not yet implemented for comment chats');
  };

  const startEditing = (comment: Comment) => {
    setEditingComment(comment._id);
    setEditContent(comment.content);
    setReplyingTo(null);
  };

  const startReplying = (commentId: string) => {
    setReplyingTo(commentId);
    setEditingComment(null);
    setNewComment('');
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditContent('');
  };

  const cancelReplying = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  const scrollToComment = (commentId: string) => {
    const commentElement = commentRefs.current.get(commentId);
    if (commentElement && scrollAreaRef.current) {
      commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedCommentId(commentId);
      setTimeout(() => setHighlightedCommentId(null), 2000);
    }
  };

  const setCommentRef = (commentId: string, element: HTMLDivElement | null) => {
    if (element) {
      commentRefs.current.set(commentId, element);
    } else {
      commentRefs.current.delete(commentId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingComment) {
        handleEditComment();
      } else {
        handleSendComment();
      }
    } else if (e.key === 'Escape') {
      if (editingComment) {
        cancelEditing();
      } else if (replyingTo) {
        cancelReplying();
      }
    }
  };

  // Show all comments in chronological order with reply references
  const allComments = React.useMemo(() => {
    let displayComments = comments?.filter(c => !c.isDeleted) || [];
    
    // If we're creating a chat and there's a temp message, show it as a temporary comment
    if (isCreatingChat && tempMessage) {
      const tempComment = {
        _id: 'temp-comment' as any,
        content: tempMessage,
        authorId: user?.id || '',
        nodeId: localCommentData?.nodeId as Id<"nodes"> | undefined,
        visionId: visionId as Id<"visions"> | undefined,
        parentCommentId: undefined,
        mentions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
        author: {
          _id: 'temp-user' as any,
          name: user?.fullName || user?.firstName || 'You',
          picture: user?.imageUrl,
          email: user?.primaryEmailAddress?.emailAddress || ''
        }
      } as Comment;
      displayComments = [...displayComments, tempComment];
    }
    
    return displayComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [comments, isCreatingChat, tempMessage, localCommentData, user, visionId]);

  // Create a map for quick parent lookup
  const commentMap = React.useMemo(() => {
    const map = new Map<string, Comment>();
    comments?.forEach(comment => {
      map.set(comment._id, comment);
    });
    return map;
  }, [comments]);

  if (!chat && !isLocalChat) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading chat...
      </div>
    );
  }

  // For local chats, create a temporary chat object
  const displayChat = chat || (isLocalChat ? {
    _id: chatId,
    title: 'New Comment Thread',
    nodeId: localCommentData?.nodeId,
    visionId: visionId
  } : null);

  if (!displayChat) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/10">
        <div>
          <h3 className="font-medium text-sm">{displayChat.title}</h3>
          <p className="text-xs text-muted-foreground">
{allComments?.length || 0} message{(allComments?.length || 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              if (realChatId && chat) {
                await closeCommentChat({ chatId: chat._id });
              }
              onClose?.();
            } catch (error) {
              console.error('Failed to close chat:', error);
            }
          }}
          className="h-8 px-3 text-muted-foreground hover:text-foreground bg-background hover:bg-muted/60 transition-colors"
          title="Close this comment chat"
        >
          <X className="w-3 h-3 mr-1" />
          <span className="text-xs">Close Chat</span>
        </Button>
      </div>

      {/* Comments */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-3">
          {allComments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No comments yet. Start the conversation!</p>
            </div>
          ) : (
            allComments.map((comment) => {
              const parentComment = comment.parentCommentId ? commentMap.get(comment.parentCommentId) : null;
              return (
                <div
                  key={comment._id}
                  ref={(el) => setCommentRef(comment._id, el)}
                  className={`transition-all duration-500 ${highlightedCommentId === comment._id ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-2' : ''}`}
                >
                  {/* Reply Reference */}
                  {parentComment && (
                    <div className="mb-2 pl-4 border-l-2 border-muted">
                      <button
                        onClick={() => scrollToComment(parentComment._id)}
                        className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group w-full text-left"
                      >
                        <CornerUpLeft className="w-3 h-3 mt-0.5 flex-shrink-0 group-hover:text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{parentComment.author?.name || 'Unknown User'}</span>
                          <p className="line-clamp-1 opacity-75 group-hover:opacity-100">
                            {parentComment.content}
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                  
                  {/* Comment */}
                  <CommentItem
                    comment={comment}
                    currentUserId={user?.id}
                    isEditing={editingComment === comment._id}
                    editContent={editContent}
                    onEditContent={setEditContent}
                    onStartEditing={() => startEditing(comment)}
                    onStartReplying={() => startReplying(comment._id)}
                    onSaveEdit={handleEditComment}
                    onCancelEdit={cancelEditing}
                    onDelete={handleDeleteComment}
                    onKeyPress={handleKeyPress}
                  />
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        {replyingTo && (
          <div className="mb-2 p-2 bg-muted/50 rounded border-l-2 border-blue-500">
            <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
              <Reply className="w-3 h-3" />
              <span>Replying to:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelReplying}
                className="h-4 px-2 text-xs ml-auto"
              >
                Cancel
              </Button>
            </div>
            {commentMap.get(replyingTo) && (
              <div className="text-xs opacity-75">
                <span className="font-medium">
                  {commentMap.get(replyingTo)?.author?.name || 'Unknown User'}:
                </span>
                <span className="ml-1 line-clamp-1">
                  {commentMap.get(replyingTo)?.content}
                </span>
              </div>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={editingComment ? editContent : newComment}
            onChange={(e) => editingComment ? setEditContent(e.target.value) : setNewComment(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={editingComment ? "Edit your comment..." : replyingTo ? "Write a reply..." : "Write a comment..."}
            className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={1}
          />
          <Button
            onClick={editingComment ? handleEditComment : handleSendComment}
            disabled={editingComment ? !editContent.trim() : !newComment.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {editingComment && (
          <div className="mt-2 flex gap-2">
            <Button variant="outline" size="sm" onClick={cancelEditing}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleEditComment} disabled={!editContent.trim()}>
              Save changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  isEditing: boolean;
  editContent: string;
  onEditContent: (content: string) => void;
  onStartEditing: () => void;
  onStartReplying: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

function CommentItem({
  comment,
  currentUserId,
  isEditing,
  editContent,
  onEditContent,
  onStartEditing,
  onStartReplying,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onKeyPress
}: CommentItemProps) {
  const isOwnComment = currentUserId === comment.authorId;

  return (
    <div className="group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.author?.picture ? (
            <Image
              src={comment.author.picture}
              alt={comment.author.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {comment.author?.name || 'Unknown User'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(new Date(comment.createdAt))}
                {comment.updatedAt !== comment.createdAt && ' (edited)'}
              </span>
            </div>
            
            {/* Inline Actions */}
            <div className="flex items-center gap-1 opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={onStartReplying}
                className="h-7 px-2 text-xs bg-muted/50 hover:bg-muted"
                title="Reply to this message"
              >
                <Reply className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Reply</span>
              </Button>
              
              {isOwnComment && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 bg-muted/50 hover:bg-muted"
                      title="More actions"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onStartEditing}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => onEditContent(e.target.value)}
                onKeyPress={onKeyPress}
                className="w-full min-h-[60px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={onSaveEdit} disabled={!editContent.trim()}>
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}