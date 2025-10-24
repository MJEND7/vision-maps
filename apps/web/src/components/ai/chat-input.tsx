"use client";

import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { motion } from "framer-motion";
import { Send, Fullscreen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerContent,
} from "@/components/ui/drawer";

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

export interface ChatInputRef {
    focus: () => void;
}

const MOBILE_MAX_ROWS = 6;
const DESKTOP_MAX_ROWS = 10;

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
    function ChatInput(
        {
            onSendMessage,
            disabled = false,
            placeholder = "Type your message...",
            className,
        },
        ref
    ) {
        const [message, setMessage] = useState("");
        const [isDesktop, setIsDesktop] = useState(false);
        const [isDrawerOpen, setIsDrawerOpen] = useState(false);
        const [showExpand, setShowExpand] = useState(false);

        const containerRef = useRef<HTMLDivElement>(null);
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const drawerTextareaRef = useRef<HTMLTextAreaElement>(null);

        useImperativeHandle(ref, () => ({
            focus: () => {
                if (isDrawerOpen) {
                    drawerTextareaRef.current?.focus();
                } else {
                    textareaRef.current?.focus();
                }
            },
        }));

        // Detect desktop vs. mobile (md >= 768px)
        useEffect(() => {
            if (typeof window === "undefined") return;
            const mql = window.matchMedia("(min-width: 768px)");
            const update = () => setIsDesktop(mql.matches);
            update();
            try {
                mql.addEventListener("change", update);
                return () => mql.removeEventListener("change", update);
            } catch {
                // Safari fallback
                mql.addListener(update);
                return () => mql.removeListener(update);
            }
        }, []);

        // Focus drawer textarea when opened
        useEffect(() => {
            if (isDrawerOpen) {
                requestAnimationFrame(() => {
                    drawerTextareaRef.current?.focus();
                });
            }
        }, [isDrawerOpen]);

        // Auto-resize textarea
        const adjustTextareaHeight = () => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            // Reset height to auto to get the correct scrollHeight
            textarea.style.height = "auto";

            const scrollHeight = textarea.scrollHeight;
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
            const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 0;
            const paddingBottom = parseInt(getComputedStyle(textarea).paddingBottom) || 0;

            const maxRows = isDesktop ? DESKTOP_MAX_ROWS : MOBILE_MAX_ROWS;
            const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;

            const newHeight = Math.min(scrollHeight, maxHeight);
            textarea.style.height = `${newHeight}px`;

            // Show expand button on mobile when content exceeds visible area
            const currentRows = Math.ceil((scrollHeight - paddingTop - paddingBottom) / lineHeight);
            setShowExpand(!isDesktop && currentRows >= MOBILE_MAX_ROWS);
        };

        useLayoutEffect(() => {
            adjustTextareaHeight();
        }, [message, isDesktop]);

        useEffect(() => {
            if (typeof window === "undefined") return;
            const handleResize = () => adjustTextareaHeight();
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }, [message, isDesktop]);

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (message.trim() && !disabled) {
                onSendMessage(message.trim());
                setMessage("");
                if (isDrawerOpen) setIsDrawerOpen(false);
            }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
            }
        };

        const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement;
            const isButton = target.closest("button");
            const isTextarea = target.closest("textarea");

            if (!isButton && !isTextarea && !disabled) {
                textareaRef.current?.focus();
            }
        };

        return (
            <>
                <div className={cn("w-full", className)}>
                    <form onSubmit={handleSubmit} className="w-full">
                        <div
                            ref={containerRef}
                            onClick={handleContainerClick}
                            className={cn(
                                "relative flex-1 flex items-stretch justify-between min-h-[10px] max-w-none min-w-0",
                                "bg-muted/70 dark:bg-muted/50",
                                "rounded-2xl border-0 py-2 pl-4 pr-2",
                                "transition-colors duration-200",
                                "focus-within:bg-muted/60",
                                "cursor-text",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div className="relative flex-1 flex mr-2 items-center min-h-full min-w-0 gap-2">
                                <textarea
                                    ref={textareaRef}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={placeholder}
                                    disabled={disabled}
                                    rows={1}
                                    className={cn(
                                        "flex-1 resize-none bg-transparent scrollbar-hide",
                                        "text-base sm:text-sm ",
                                        "placeholder:text-muted-foreground",
                                        "border-0 outline-none focus:outline-none",
                                        "overflow-y-auto scrollbar-thin",
                                        "scrollbar-track-transparent",
                                        "scrollbar-thumb-muted-foreground/20",
                                        "disabled:cursor-not-allowed",
                                        "break-words overflow-wrap-anywhere",
                                        "min-w-0 w-full" // Ensures flexbox can shrink this element
                                    )}
                                    style={{
                                        height: "auto",
                                        minHeight: "20px"
                                    }}
                                    aria-label="Message input"
                                />

                            </div>

                            {/* Expand button for mobile */}
                            <div className="relative flex flex-col min-h-full min-w-0">
                                <div className="">
                                    <motion.button
                                        type="button"
                                        onClick={() => setIsDrawerOpen(true)}
                                        className={cn(
                                            "absolute right-0 md:hidden flex-shrink-0 self-start",
                                            "p-1.5 rounded-md text-muted-foreground",
                                            "hover:text-foreground hover:bg-muted",
                                            "transition-all duration-200",
                                            "focus:outline-none focus:ring-2 focus:ring-ring",
                                            showExpand ? "" : "hidden"
                                        )}
                                        animate={{
                                            opacity: showExpand ? 1 : 0,
                                            scale: showExpand ? 1 : 0.8
                                        }}
                                        transition={{ duration: 0.2 }}
                                        disabled={disabled || !showExpand}
                                        aria-label="Expand to full screen"
                                    >
                                        <Fullscreen className="h-4 w-4" />
                                    </motion.button>
                                </div>

                                <div className="flex flex-col justify-end min-h-full min-w-0">
                                    <Button
                                        type="submit"
                                        disabled={!message.trim() || disabled}
                                        className={cn(
                                            "h-9 w-9 rounded-xl flex-shrink-0 self-end",
                                            "transition-all duration-200"
                                        )}
                                        aria-label="Send message"
                                    >
                                        <motion.div
                                            whileTap={{ scale: 0.95 }}
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <Send className="h-4 w-4" />
                                        </motion.div>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Mobile drawer */}
                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <DrawerContent className="md:hidden">
                        <div className="flex flex-col h-[90vh] max-h-[700px]">
                            <div className="flex-1 p-4 min-h-0">
                                <div className="h-full bg-muted/50 rounded-xl p-3">
                                    <textarea
                                        ref={drawerTextareaRef}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={placeholder}
                                        disabled={disabled}
                                        className={cn(
                                            "w-full h-full resize-none bg-transparent",
                                            "text-base leading-6 border-0 outline-none",
                                            "placeholder:text-muted-foreground",
                                            "scrollbar-thin scrollbar-track-transparent",
                                            "scrollbar-thumb-muted-foreground/20"
                                        )}
                                        aria-label="Message input (expanded)"
                                    />
                                </div>
                            </div>
                        </div>
                    </DrawerContent>
                </Drawer>
            </>
        );
    }
);
