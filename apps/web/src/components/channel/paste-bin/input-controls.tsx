"use client";

import React, {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../../ui/button";
import { FileText, Brain, Fullscreen } from "lucide-react";
import { PasteBinMode } from "@/types/pastebin-component";
import { AudioDeviceMenu } from "./audio-device-menu";
import { cn } from "@/lib/utils";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const MOBILE_MAX_ROWS = 4;
const DESKTOP_MAX_ROWS = 10;

interface InputControlsProps {
    ref: React.RefObject<HTMLTextAreaElement | null>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    mode: PasteBinMode;
    value: string | undefined;
    placeholder: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    onMicrophoneSelect: () => Promise<void>;
    onDeviceSelect: (deviceId: string) => Promise<void>;
    onFileSelect: () => void;
    onStartPrompt?: () => void;
    children?: React.ReactNode;
}

// Main component
export function InputControls({
    ref,
    mode,
    value,
    placeholder,
    onChange,
    onKeyDown,
    onPaste,
    onMicrophoneSelect,
    onDeviceSelect,
    onFileSelect,
    onStartPrompt,
    children,
}: InputControlsProps) {
    const isIdleMode = mode === PasteBinMode.IDLE;

    const [isDesktop, setIsDesktop] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showExpand, setShowExpand] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const drawerTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Detect mobile vs desktop
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mql = window.matchMedia("(min-width: 768px)");
        const update = () => setIsDesktop(mql.matches);
        update();
        mql.addEventListener("change", update);
        return () => mql.removeEventListener("change", update);
    }, []);

    // Focus textarea in drawer when open
    useEffect(() => {
        if (isDrawerOpen) {
            requestAnimationFrame(() => {
                drawerTextareaRef.current?.focus();
            });
        }
    }, [isDrawerOpen]);

    // Adjust height of textarea + toggle expand
    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        const scrollHeight = textarea.scrollHeight;
        const lineHeight =
            parseInt(getComputedStyle(textarea).lineHeight) || 24;
        const paddingTop =
            parseInt(getComputedStyle(textarea).paddingTop) || 0;
        const paddingBottom =
            parseInt(getComputedStyle(textarea).paddingBottom) || 0;

        const maxRows = isDesktop ? DESKTOP_MAX_ROWS : MOBILE_MAX_ROWS;
        const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;
        const newHeight = Math.min(scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;

        const currentRows = Math.ceil(
            (scrollHeight - paddingTop - paddingBottom) / lineHeight
        );
        setShowExpand(!isDesktop && currentRows >= MOBILE_MAX_ROWS);
    }, [value, isDesktop]);

    return (
        <>
            <motion.div
                className={cn(
                    "relative flex flex-col gap-1 w-full dark:bg-muted/50 dark:backdrop-blur-lg border-none bg-background h-full resize-none transition-all duration-200",
                    "px-3 shadow-sm duration-200",
                    "focus-within:ring-[3px] focus-within:ring-ring/50",
                    "focus-within:ring-offset-2 focus-within:ring-offset-background",
                    "cursor-text",
                    !isIdleMode
                        ? "rounded-xl shadow-sm hover:shadow-lg focus:shadow-lg py-1.5"
                        : "rounded-2xl shadow-sm hover:shadow-lg focus:shadow-lg overflow-hidden"
                )}
                style={{
                    lineHeight: !isIdleMode ? "1.5" : "44px",
                    minHeight: "44px",
                }}>
                <textarea
                    className={cn(
                        "w-full pr-5 h-full scrollbar-hide rounded-none focus:border-none border-none bg-transparent resize-none outline-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    )}
                    ref={ref}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    onPaste={onPaste}
                />  {/* Expand button (mobile only) */}
                <motion.button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsDrawerOpen(true);
                    }}
                    className={cn(
                        "absolute right-1 top-4 -translate-y-1/2 md:hidden flex-shrink-0 self-start",
                        "p-1.5 rounded-md text-muted-foreground",
                        "hover:text-foreground hover:bg-muted",
                        !isIdleMode ? "" : "hidden"
                    )}
                    animate={{
                        opacity: showExpand ? 1 : 0,
                        scale: showExpand ? 1 : 0.8,
                    }}
                    transition={{ duration: 0.2 }}
                    disabled={!showExpand}
                    aria-label="Expand editor"
                >
                    <Fullscreen size={14} />
                </motion.button>


                {children && (
                    <div>
                        {children}
                    </div>
                )}

                <AnimatePresence>
                    {/* Compact mode buttons */}
                    {isIdleMode && (
                        <motion.div
                            key="idle-buttons"
                            className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2"
                            initial={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <AudioDeviceMenu
                                onMicrophoneSelect={onMicrophoneSelect}
                                onDeviceSelect={onDeviceSelect}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-[13px] px-2 text-xs border-none transition-colors"
                                onClick={onFileSelect}
                            >
                                <FileText size={12} />
                            </Button>
                            {onStartPrompt && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-[13px] px-2 text-xs border-none transition-colors"
                                    onClick={onStartPrompt}
                                >
                                    <Brain size={12} />
                                </Button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Mobile Drawer */}
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DrawerHeader className="hidden">
                    <VisuallyHidden>
                        <DrawerTitle>Expanded editor</DrawerTitle>
                    </VisuallyHidden>
                </DrawerHeader>
                <DrawerContent
                    className="md:hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4">
                        <div className="flex flex-col gap-3 h-[90vh] max-h-[600px]">
                            <textarea
                                ref={drawerTextareaRef}
                                value={value}
                                onChange={onChange}
                                onKeyDown={onKeyDown}
                                onPaste={onPaste}
                                placeholder={placeholder}
                                className="w-full bg-muted/30 h-full p-3 rounded-xl resize-none outline-none"
                            />
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    );
}
