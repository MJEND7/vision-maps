"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { Id } from '../../../convex/_generated/dataModel';
import { Send, User, MoreHorizontal, Edit2, Trash2, Reply } from 'lucide-react';
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

export function CommentChat({ chatId, className }: CommentChatProps) {
  const { user } = useUser();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mutations
  const createComment = useMutation(api.comments.createComment);
  const updateComment = useMutation(api.comments.updateComment);
  const deleteComment = useMutation(api.comments.deleteComment);

  // Get chat details
  const chat = useQuery(api.chats.getChat, { chatId: chatId as Id<"chats"> });

  // Get comments for the node
  const comments = useQuery(
    api.comments.getNodeComments,
    chat?.nodeId && chat?.visionId
      ? { nodeId: chat.nodeId, visionId: chat.visionId }
      : "skip"
  ) as Comment[] | undefined;

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

  const handleSendComment = async () => {
    if (!newComment.trim() || !chat?.nodeId || !chat?.visionId) return;

    try {
      await createComment({
        content: newComment.trim(),
        nodeId: chat.nodeId,
        visionId: chat.visionId,
        parentCommentId: replyingTo ? (replyingTo as Id<"comments">) : undefined,
        mentions: [] // TODO: Extract mentions from content
      });

      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send comment:', error);
    }
  };

  const handleEditComment = async () => {
    if (!editContent.trim() || !editingComment) return;

    try {
      await updateComment({
        commentId: editingComment as Id<"comments">,
        content: editContent.trim()
      });

      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment({
        commentId: commentId as Id<"comments">
      });
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
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

  // Group comments by thread (replies under parent comments)
  const threadedComments = React.useMemo(() => {
    if (!comments) return [];

    const parentComments = comments.filter(c => !c.parentCommentId && !c.isDeleted);
    const repliesMap = new Map<string, Comment[]>();

    // Group replies by parent
    comments.forEach(comment => {
      if (comment.parentCommentId && !comment.isDeleted) {
        const parentId = comment.parentCommentId;
        if (!repliesMap.has(parentId)) {
          repliesMap.set(parentId, []);
        }
        repliesMap.get(parentId)!.push(comment);
      }
    });

    return parentComments.map(parent => ({
      parent,
      replies: repliesMap.get(parent._id) || []
    }));
  }, [comments]);

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading chat...
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-medium text-sm">{chat.title}</h3>
        <p className="text-xs text-muted-foreground">
          {comments?.length || 0} comment{(comments?.length || 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Comments */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {threadedComments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No comments yet. Start the conversation!</p>
            </div>
          ) : (
            threadedComments.map(({ parent, replies }) => (
              <div key={parent._id} className="space-y-2">
                {/* Parent Comment */}
                <CommentItem
                  comment={parent}
                  currentUserId={user?.id}
                  isEditing={editingComment === parent._id}
                  editContent={editContent}
                  onEditContent={setEditContent}
                  onStartEditing={() => startEditing(parent)}
                  onStartReplying={() => startReplying(parent._id)}
                  onSaveEdit={handleEditComment}
                  onCancelEdit={cancelEditing}
                  onDelete={() => handleDeleteComment(parent._id)}
                  onKeyPress={handleKeyPress}
                />

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="ml-8 space-y-2 border-l-2 border-muted pl-4">
                    {replies.map(reply => (
                      <CommentItem
                        key={reply._id}
                        comment={reply}
                        currentUserId={user?.id}
                        isEditing={editingComment === reply._id}
                        editContent={editContent}
                        onEditContent={setEditContent}
                        onStartEditing={() => startEditing(reply)}
                        onStartReplying={() => startReplying(parent._id)} // Reply to parent
                        onSaveEdit={handleEditComment}
                        onCancelEdit={cancelEditing}
                        onDelete={() => handleDeleteComment(reply._id)}
                        onKeyPress={handleKeyPress}
                        isReply={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        {replyingTo && (
          <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
            <Reply className="w-3 h-3" />
            Replying to comment
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelReplying}
              className="h-4 px-2 text-xs"
            >
              Cancel
            </Button>
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
  isReply?: boolean;
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
  onKeyPress,
  isReply = false
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
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {comment.author?.name || 'Unknown User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(new Date(comment.createdAt))}
              {comment.updatedAt !== comment.createdAt && ' (edited)'}
            </span>
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
              
              {/* Actions */}
              <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onStartReplying}
                    className="h-6 px-2 text-xs"
                  >
                    <Reply className="w-3 h-3 mr-1" />
                    Reply
                  </Button>
                )}

                {isOwnComment && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
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
          )}
        </div>
      </div>
    </div>
  );
}