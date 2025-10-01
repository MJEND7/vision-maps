"use client";

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface CommentIndicatorProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

export function CommentIndicator({ count, onClick, className }: CommentIndicatorProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute -top-2 -right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity",
        onClick && "hover:scale-110 transition-transform",
        className
      )}
      title={`${count} comment${count !== 1 ? 's' : ''}`}
    >
      <Badge
        variant="default"
        className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-background shadow-md"
      >
        <MessageSquare className="w-3 h-3 mr-1" />
        {count}
      </Badge>
    </button>
  );
}