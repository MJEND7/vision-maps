"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({ onSendMessage, disabled = false, placeholder = "Type your message...", className }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex gap-2 p-3 border-t bg-background", className)}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className={cn(
          "flex-1 min-h-[38px] max-h-32 px-3 py-2 mb-8 resize-none",
          "border border-input bg-background",
          "rounded-md placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200"
        )}
      />
      <Button 
        type="submit" 
        disabled={!message.trim() || disabled}
        size="sm"
        className="h-[38px] px-3"
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}
