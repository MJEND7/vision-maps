"use client"

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AudioPlayer } from "./audio-player";
import { VideoPlayer } from "./video-player";
import { FilePreview } from "./file-preview";
import { useUploadThing } from "@/utils/uploadthing";
import { X, FileText, Send, Brain } from "lucide-react";
import Image from "next/image";
import { GitHubCard, FigmaCard, YouTubeCard, TwitterCard, NotionCard, WebsiteCard, LoomCard, SpotifyCard, AppleMusicCard, SkeletonCard, ChatCard, LinkMetadata } from "./metadata";
import { TweetSkeleton } from 'react-tweet';
import { Textarea } from "../ui/textarea";
import { usePasteBinState, pasteBinStorage, type StoredLinkMeta, type StoredMediaItem } from "@/lib/paste-bin-state";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type MediaType = "image" | "audio" | "video" | "file" | "link" | "text" | "ai";

interface MediaItem {
    type: MediaType;
    file?: File;
    url?: string;
    chatId?: string,
    isUploading?: boolean;
    uploadedUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    customName?: string;
}

interface LinkMeta extends LinkMetadata { }

export default function PasteBin() {
    // State management with reducer
    const { state, actions } = usePasteBinState();
    const { isDragOver, isLoadingLinkMeta, isLoadingTwitter, imageLoaded } = state;

    // Component state
    const [mediaItem, setMediaItem] = useState<MediaItem | null>(null);
    const [linkMeta, setLinkMeta] = useState<LinkMeta | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [thought, setThought] = useState("");
    const [isTextMode, setIsTextMode] = useState(false);
    const [drivenMessageIds, setDrivenMessageIds] = useState<Set<string>>(new Set())
    const [chatId, setChatId] = useState<string | null>(null)
    const [isAiMode, setIsAiMode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialLoadRef = useRef(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const createChat = useMutation(api.chats.createChat);
    const sendMessage = useMutation(api.messages.sendMessage);

    const newChat = async (title: string) => {
        const chatId = await createChat({
            title
        });

        setChatId(chatId)

        return chatId
    };

    // Load saved data from localStorage on mount
    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;

        const savedData = pasteBinStorage.load();

        setInputValue(savedData.inputValue);
        setThought(savedData.thought);

        // Restore media item if valid
        if (savedData.mediaItem) {
            const parsedMedia = savedData.mediaItem as StoredMediaItem;
            // Don't restore File objects as they can't be serialized
            if (parsedMedia.type !== 'file' || parsedMedia.uploadedUrl) {
                // Convert stored media item to MediaItem format
                const restoredMediaItem: MediaItem = {
                    type: parsedMedia.type as MediaType,
                    url: parsedMedia.url,
                    isUploading: parsedMedia.isUploading || false,
                    uploadedUrl: parsedMedia.uploadedUrl,
                    fileName: parsedMedia.fileName,
                    fileSize: parsedMedia.fileSize,
                    fileType: parsedMedia.fileType,
                    customName: parsedMedia.customName,
                };
                setMediaItem(restoredMediaItem);
                // Set image as loaded during initial load without causing re-renders
                if (parsedMedia.type === 'image') {
                    setTimeout(() => actions.setImageLoaded(true), 0);
                }
            }
        }

        // Restore link meta if valid
        if (savedData.linkMeta) {
            const storedMeta = savedData.linkMeta as StoredLinkMeta;
            // Convert StoredLinkMeta to LinkMeta format with required fields
            const restoredLinkMeta: LinkMeta = {
                type: storedMeta.type,
                title: storedMeta.title || 'Untitled Link',
                description: storedMeta.description,
                url: storedMeta.url,
                image: storedMeta.image,
                siteName: storedMeta.siteName,
            };
            setLinkMeta(restoredLinkMeta);
        }
    }, []);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Central update functions that handle both state and localStorage
    const updateInputValue = useCallback((value: string) => {
        setInputValue(value);
        pasteBinStorage.save.inputValue(value);
    }, []);

    const updateMediaItem = useCallback((item: MediaItem | null) => {
        setMediaItem(item);
        pasteBinStorage.save.mediaItem(item);
    }, []);

    const updateLinkMeta = useCallback((meta: LinkMeta | null) => {
        setLinkMeta(meta);
        pasteBinStorage.save.linkMeta(meta);
    }, []);

    const updateThought = useCallback((thoughtValue: string) => {
        setThought(thoughtValue);
        pasteBinStorage.save.thought(thoughtValue);
    }, []);

    const { startUpload, isUploading } = useUploadThing("mediaUploader", {
        onClientUploadComplete: (res) => {
            if (res && res[0]) {
                if (mediaItem) {
                    updateMediaItem({ ...mediaItem, uploadedUrl: res[0].ufsUrl, isUploading: false });
                }
            }
        },
        onUploadError: (error: Error) => {
            console.error("Upload failed:", error);
            if (mediaItem) {
                updateMediaItem({ ...mediaItem, isUploading: false });
            }
        },
    });

    const determineMediaType = (file: File): MediaType => {
        const type = file.type;
        if (type.startsWith("image/")) return "image";
        if (type.startsWith("audio/")) return "audio";
        if (type.startsWith("video/")) return "video";
        return "file";
    };

    const detectLinkType = (url: string): string => {
        try {
            const hostname = new URL(url).hostname.toLowerCase();

            if (hostname.includes('github.com')) return 'GitHub';
            if (hostname.includes('figma.com')) return 'Figma';
            if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube';
            if (hostname.includes('notion.so') || hostname.includes('notion.com')) return 'Notion';
            if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'Twitter';
            if (hostname.includes('loom.com')) return 'Loom';
            if (hostname.includes('spotify.com')) return 'Spotify';
            if (hostname.includes('music.apple.com')) return 'AppleMusic';
            if (hostname.includes('instagram.com')) return 'Instagram';
            if (hostname.includes('tiktok.com')) return 'TikTok';

            return 'Link'; // Default to generic website
        } catch (error) {
            console.error('Error parsing URL:', url, error);
            return 'Link';
        }
    };

    const fetchLinkMetadata = async (url: string): Promise<LinkMeta> => {
        try {
            const response = await fetch('/api/og', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch metadata');
            }

            // Map backend platform types to frontend display types
            const typeMapping: Record<string, string> = {
                github: 'GitHub',
                youtube: 'YouTube',
                twitter: 'Twitter',
                figma: 'Figma',
                notion: 'Notion',
                loom: 'Loom',
                spotify: 'Spotify',
                applemusic: 'AppleMusic',
                website: 'Link'
            };

            return {
                ...data.metadata,
                type: typeMapping[data.platformType] || 'Link'
            };
        } catch (error) {
            console.error('Error fetching metadata:', error);
            const fallbackType = detectLinkType(url);
            return {
                type: fallbackType,
                title: new URL(url).hostname,
                description: "",
                url
            };
        }
    };



    // Utility functions first
    const isTwitterUrl = (url: string): boolean => {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            return hostname.includes('twitter.com') || hostname.includes('x.com');
        } catch {
            return false;
        }
    };

    const isLoomUrl = (url: string): boolean => {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            return hostname.includes('loom.com');
        } catch {
            return false;
        }
    };

    // Core handlers in dependency order
    const handleFileSelect = useCallback((file: File) => {
        const mediaType = determineMediaType(file);
        const previewUrl = URL.createObjectURL(file);

        const newMediaItem: MediaItem = {
            type: mediaType,
            file,
            url: previewUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            isUploading: false,
        };

        updateMediaItem(newMediaItem);
        updateLinkMeta(null);
        actions.setImageLoaded(false);
    }, [actions, updateMediaItem, updateLinkMeta]);

    const handleLinkPaste = useCallback(async (url: string) => {
        updateMediaItem(null);
        updateLinkMeta(null);

        // Skip API call for Twitter URLs - let react-tweet handle it directly
        if (isTwitterUrl(url)) {
            actions.setLoadingTwitter(true);
            // Small delay to show the TweetSkeleton briefly
            setTimeout(() => {
                updateLinkMeta({
                    type: 'Twitter',
                    title: 'Twitter Post',
                    url: url
                });
                actions.setLoadingTwitter(false);
            }, 500);
            return;
        }

        // Skip API call for Loom URLs - load directly into iframe
        if (isLoomUrl(url)) {
            actions.setLoadingLinkMeta(true);
            // Small delay to show loading state
            setTimeout(() => {
                updateLinkMeta({
                    type: 'Loom',
                    title: 'Loom Video',
                    url: url
                });
                actions.setLoadingLinkMeta(false);
            }, 300);
            return;
        }

        actions.setLoadingLinkMeta(true);

        try {
            const meta = await fetchLinkMetadata(url);
            updateLinkMeta(meta);
        } catch (error) {
            console.error('Failed to fetch link metadata:', error);
        } finally {
            actions.setLoadingLinkMeta(false);
        }
    }, [actions, updateMediaItem, updateLinkMeta]);

    // Input handlers that depend on handleLinkPaste and handleFileSelect
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
        const clipboardData = e.clipboardData;
        const files = Array.from(clipboardData.files);
        const text = clipboardData.getData("text");

        if (files.length > 0) {
            handleFileSelect(files[0]);
        } else if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
            handleLinkPaste(text);
            updateInputValue("");  // Clear input after pasting link
        }
    }, [handleFileSelect, handleLinkPaste, updateInputValue]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        updateInputValue(value);

        // Auto-detect and handle URLs when user types/pastes
        if (value && (value.startsWith("http://") || value.startsWith("https://"))) {
            handleLinkPaste(value);
            updateInputValue("");  // Clear input after processing link
            return;
        }

        // Handle text mode with debounce
        if (value && !value.startsWith("http://") && !value.startsWith("https://")) {
            // Clear existing timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Set debounce timer to create text media item
            debounceTimerRef.current = setTimeout(() => {
                if (!isTextMode && !isAiMode) {
                    setIsTextMode(true);
                    updateMediaItem({
                        type: "text",
                        customName: value
                    });
                    setThought(value)
                    updateInputValue(""); // Clear input as it moves to textarea
                }
            }, 1000); // 1 second debounce
        }
    }, [handleLinkPaste, updateInputValue, isTextMode, isAiMode, updateMediaItem]);

    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue) {
            if (inputValue.startsWith("http://") || inputValue.startsWith("https://")) {
                handleLinkPaste(inputValue);
                updateInputValue("");
            }
        }
    }, [inputValue, handleLinkPaste, updateInputValue]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        actions.setDragOver(true);
    }, [actions]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        actions.setDragOver(false);
    }, [actions]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        actions.setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [actions, handleFileSelect]);

    const handleToggleAiMode = useCallback(async () => {
        if (mediaItem?.type === "text") {
            if (thought) {
                const chatId = await newChat(thought);
                updateMediaItem({
                    ...mediaItem,
                    chatId,
                    type: "ai"
                });
            }
            setIsAiMode(true);
        }
    }, [mediaItem, updateMediaItem]);

    const clearMedia = useCallback(() => {
        updateMediaItem(null);
        updateLinkMeta(null);
        updateInputValue("");
        updateThought("");
        setIsTextMode(false);
        setIsAiMode(false);

        // Clear debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        // Reset state machine
        actions.resetState();

        // Clear all localStorage data
        pasteBinStorage.clear();

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [actions, updateMediaItem, updateLinkMeta, updateInputValue, updateThought]);

    const handleCreate = useCallback(async () => {
        if (mediaItem) {
            const finalName = mediaItem.fileName;

            if (!finalName && mediaItem.type !== "link") {
                alert("Please provide a name for this media");
                return;
            }

            if (mediaItem.file) {
                if (mediaItem) {
                    updateMediaItem({ ...mediaItem, isUploading: true, customName: finalName });
                }
                await startUpload([mediaItem.file]);
            }
        }

        if (linkMeta) {
            console.log("Creating link:", linkMeta);
        }

        // Clear all data and localStorage after successful creation
        clearMedia();
    }, [mediaItem, linkMeta, startUpload, clearMedia, updateMediaItem]);

    const isValidForCreation = useCallback(() => {
        if (mediaItem) {
            if (mediaItem.type === "text" || mediaItem.type === "ai") {
                return !!mediaItem.customName || !!thought;
            } else if (mediaItem.type !== "link") {
                return !!mediaItem.fileName && !mediaItem.isUploading;
            }
        }
        return !!linkMeta && !isLoadingLinkMeta;
    }, [mediaItem, linkMeta, isLoadingLinkMeta, thought]);

    const getDisplayName = useCallback(() => {
        if (mediaItem) {
            if (mediaItem.type === "text") {
                return mediaItem.customName || "Text note";
            }
            if (mediaItem.type === "ai") {
                return "AI Assistant";
            }
            return mediaItem.fileName || "Unnamed file";
        }
        if (linkMeta) {
            return linkMeta.title || "Unnamed link";
        }
        if (isLoadingLinkMeta) {
            return "Loading metadata...";
        }
        return "";
    }, [mediaItem, linkMeta, isLoadingLinkMeta]);

    return (
        <div
            className={`absolute bottom-0 w-full max-w-lg mx-auto`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="relative">
                {/* Floating helper / metadata container */}
                <motion.div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 will-change-transform"
                    animate={{
                        width: linkMeta || mediaItem || isLoadingLinkMeta || isLoadingTwitter ? "100%" : isDragOver ? "100%" : "10rem",
                        opacity: linkMeta || mediaItem || isLoadingLinkMeta || isLoadingTwitter ? 1 : isDragOver ? 1 : 0.8,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 35,
                        mass: 0.9,
                    }}
                >
                    <motion.div
                        className="w-full overflow-hidden rounded-2xl shadow-md border border-accent backdrop-blur-sm"
                        animate={{
                            height: linkMeta || mediaItem || isLoadingLinkMeta || isLoadingTwitter ? "auto" : isDragOver ? "8rem" : "2rem",
                            padding: linkMeta || mediaItem || isLoadingLinkMeta || isLoadingTwitter || isDragOver ? "0px" : "4px",
                            backgroundColor: isDragOver ? "hsl(var(--primary) / 0.05)" : "hsl(var(--background))",
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 280,
                            damping: 30,
                            mass: 1.0,
                        }}
                        style={{ minHeight: linkMeta || mediaItem || isLoadingLinkMeta || isLoadingTwitter ? "auto" : isDragOver ? "8rem" : "2rem" }}
                    >
                        <div className="relative flex flex-col items-center justify-center min-h-full">
                            <AnimatePresence mode="wait">
                                {isDragOver && (
                                    <motion.div
                                        key="dragover"
                                        className="absolute inset-0 flex items-center justify-center p-4"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            Drop here to upload
                                        </span>
                                    </motion.div>
                                )}

                                {!linkMeta && !mediaItem && !isLoadingLinkMeta && !isLoadingTwitter && !isDragOver && (
                                    <motion.div
                                        key="helper"
                                        className="absolute inset-0 flex items-center justify-center"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    >
                                        <span className="text-[10px] text-muted-foreground font-medium flex items-center justify-center">
                                            Press{" "}
                                            <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">Ctrl</kbd> +{" "}
                                            <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">V</kbd> to
                                            paste
                                        </span>
                                    </motion.div>
                                )}

                                {mediaItem && (
                                    <motion.div
                                        key="media"
                                        className="w-full overflow-hidden"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{
                                            height: (mediaItem.type === "image" && !imageLoaded) ? 0 : "auto",
                                            opacity: (mediaItem.type === "image" && !imageLoaded) ? 0 : 1
                                        }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 280,
                                            damping: 30,
                                            mass: 1.0,
                                        }}
                                    >
                                        <motion.div
                                            className="dark:bg-input/30 p-4 space-y-4"
                                            initial={{ y: 20, scale: 0.95 }}
                                            animate={{ y: 0, scale: 1 }}
                                            exit={{ y: -20, scale: 0.95 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 25,
                                                delay: 0.1
                                            }}
                                        >
                                            {mediaItem.isUploading && (
                                                <div className="text-center">
                                                    <div className="text-xs text-muted-foreground">
                                                        Uploading...
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-center items-center">
                                                {mediaItem.type === "image" && (
                                                    <div className="w-full max-w-sm mx-auto">
                                                        <Image
                                                            src={mediaItem.uploadedUrl || mediaItem.url!}
                                                            alt={mediaItem.fileName || "Pasted image"}
                                                            width={0}
                                                            height={0}
                                                            className="w-full h-full object-cover rounded-lg"
                                                            onLoad={() => actions.setImageLoaded(true)}
                                                            onError={() => actions.setImageLoaded(true)}
                                                        />
                                                    </div>
                                                )}

                                                {mediaItem.type === "audio" && (
                                                    <div className="w-full max-w-sm mx-auto">
                                                        <AudioPlayer
                                                            src={mediaItem.uploadedUrl || mediaItem.url!}
                                                            title={mediaItem.customName || mediaItem.fileName}
                                                        />
                                                    </div>
                                                )}

                                                {mediaItem.type === "video" && (
                                                    <div className="w-full max-w-sm mx-auto">
                                                        <VideoPlayer
                                                            src={mediaItem.uploadedUrl || mediaItem.url!}
                                                            title={mediaItem.customName || mediaItem.fileName}
                                                        />
                                                    </div>
                                                )}

                                                {mediaItem.type === "file" && (
                                                    <div className="w-full max-w-sm mx-auto">
                                                        <FilePreview
                                                            fileName={mediaItem.customName || mediaItem.fileName!}
                                                            fileSize={mediaItem.fileSize}
                                                            fileType={mediaItem.fileType}
                                                            downloadUrl={mediaItem.uploadedUrl}
                                                        />
                                                    </div>
                                                )}

                                                {mediaItem.type === "text" && (
                                                    <div className="" />
                                                )}

                                                {mediaItem.type === "ai" && mediaItem.chatId && (
                                                    <div className="w-full max-w-sm mx-auto">
                                                        <ChatCard drivenIds={drivenMessageIds} onFocusInput={() => {
                                                            //TODO focus textarea
                                                        }} chatId={mediaItem.chatId} />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {isLoadingLinkMeta && (
                                    <motion.div
                                        key="loading"
                                        className="w-full overflow-hidden"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 280,
                                            damping: 30,
                                            mass: 1.0,
                                        }}
                                    >
                                        <motion.div
                                            className="p-4 flex justify-center"
                                            initial={{ y: 20, scale: 0.95 }}
                                            animate={{ y: 0, scale: 1 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 25,
                                                delay: 0.1
                                            }}
                                        >
                                            <div className="w-full max-w-sm">
                                                <SkeletonCard />
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {isLoadingTwitter && (
                                    <motion.div
                                        key="twitter-loading"
                                        className="w-full overflow-hidden"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 280,
                                            damping: 30,
                                            mass: 1.0,
                                        }}
                                    >
                                        <motion.div
                                            className="p-4 flex justify-center"
                                            initial={{ y: 20, scale: 0.95 }}
                                            animate={{ y: 0, scale: 1 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 25,
                                                delay: 0.1
                                            }}
                                        >
                                            <div className="w-full">
                                                <TweetSkeleton />
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {linkMeta && (
                                    <motion.div
                                        key="link"
                                        className="w-full overflow-hidden"
                                        initial={{ height: "auto", opacity: 1 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 280,
                                            damping: 30,
                                            mass: 1.0,
                                        }}
                                    >
                                        <motion.div
                                            className="p-4 flex justify-center"
                                            initial={{ y: 20, scale: 0.95 }}
                                            animate={{ y: 0, scale: 1 }}
                                            exit={{ y: -20, scale: 0.95 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 25,
                                            }}
                                        >
                                            <div className="w-full">
                                                {linkMeta.type === 'GitHub' && <GitHubCard metadata={linkMeta} />}
                                                {linkMeta.type === 'Figma' && <FigmaCard metadata={linkMeta} />}
                                                {linkMeta.type === 'YouTube' && <YouTubeCard metadata={linkMeta} />}
                                                {linkMeta.type === 'Twitter' && <TwitterCard metadata={linkMeta} />}
                                                {linkMeta.type === 'Notion' && <NotionCard metadata={linkMeta} />}
                                                {linkMeta.type === 'Loom' && <LoomCard metadata={linkMeta} />}
                                                {linkMeta.type === 'Spotify' && <SpotifyCard metadata={linkMeta} />}
                                                {linkMeta.type === 'AppleMusic' && <AppleMusicCard metadata={linkMeta} />}
                                                {(linkMeta.type === 'Link' || !['GitHub', 'Figma', 'YouTube', 'Twitter', 'Notion', 'Loom', 'Spotify', 'AppleMusic'].includes(linkMeta.type)) &&
                                                    <WebsiteCard metadata={linkMeta} />
                                                }
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Input/Controls at bottom */}
                <motion.div
                    className="relative"
                    animate={{
                        height: mediaItem || linkMeta || isLoadingLinkMeta ? "80px" : "44px"
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        mass: 0.8
                    }}
                >
                    <AnimatePresence mode="wait">
                        {mediaItem || linkMeta || isLoadingLinkMeta ? (
                            <motion.div
                                key="expanded-input"
                                className="relative w-full h-full"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 25,
                                    mass: 0.6
                                }}
                            >
                                <motion.div
                                    className="relative w-full"
                                    initial={{ height: "44px" }}
                                    animate={{ height: "80px" }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 350,
                                        damping: 30,
                                        mass: 0.7
                                    }}
                                >
                                    <Textarea
                                        className="w-full h-full resize-none pr-24 rounded-xl shadow-sm hover:shadow-lg focus:shadow-lg transition-shadow duration-200"
                                        placeholder={`Enter a thought about: "${getDisplayName()}" ?`}
                                        value={thought}
                                        onChange={(e) => updateThought(e.target.value)}
                                        onKeyDown={async (e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                if (isAiMode && chatId) {
                                                    const data = await sendMessage({ content: thought, chatId: chatId as Id<"chats"> })
                                                    setDrivenMessageIds((s) => s.add(data.messageId))
                                                    setThought("")
                                                } else {
                                                    // In other modes, Enter creates the item
                                                    handleCreate();
                                                }
                                            }
                                        }}
                                    />
                                </motion.div>

                                <motion.div
                                    className="absolute right-2 bottom-2 flex gap-2"
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{
                                        delay: 0.1,
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 25,
                                        mass: 0.5
                                    }}
                                >
                                    {mediaItem?.type === "text" && !isAiMode && (
                                        <motion.div
                                            initial={{ x: 40, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{
                                                delay: 0.1,
                                                type: "spring",
                                                stiffness: 400,
                                                damping: 25
                                            }}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleToggleAiMode}
                                                className="h-8 w-8 p-0 rounded-lg hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                            >
                                                <Brain size={14} />
                                            </Button>
                                        </motion.div>
                                    )}

                                    <motion.div
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{
                                            delay: 0.15,
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 25
                                        }}
                                    >
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearMedia}
                                            className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </motion.div>

                                    <motion.div
                                        initial={{ x: 30, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{
                                            delay: 0.2,
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 25
                                        }}
                                    >
                                        <Button
                                            size="sm"
                                            onClick={handleCreate}
                                            disabled={!isValidForCreation()}
                                            className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all duration-200"
                                        >
                                            <Send size={12} />
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="compact-input"
                                className="relative w-full h-full"
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 25,
                                    mass: 0.6
                                }}
                            >
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                    multiple={false}
                                />

                                <motion.div
                                    className="relative w-full"
                                    initial={{ height: "80px" }}
                                    animate={{ height: "44px" }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 350,
                                        damping: 30,
                                        mass: 0.7
                                    }}
                                >
                                    <Input
                                        className="w-full h-full pr-16 rounded-2xl shadow-sm hover:shadow-lg focus:shadow-lg transition-shadow duration-200"
                                        placeholder="Enter Media and Create a Node"
                                        value={inputValue}
                                        onChange={handleInputChange}
                                        onKeyDown={handleInputKeyDown}
                                        onPaste={handlePaste}
                                    />

                                    <motion.div
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            delay: 0.1,
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 25
                                        }}
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-8 rounded-xl px-2 text-xs border-border/50 hover:border-border transition-colors"
                                        >
                                            <FileText size={12} />
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
