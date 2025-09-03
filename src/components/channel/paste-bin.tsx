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
import { GitHubCard, FigmaCard, YouTubeCard, TwitterCard, NotionCard, WebsiteCard, LoomCard, SpotifyCard, AppleMusicCard, SkeletonCard, ChatCard, LinkMetadata, GitHubMetadata, FigmaMetadata, YouTubeMetadata, TwitterMetadata, NotionMetadata, LoomMetadata, SpotifyMetadata, AppleMusicMetadata, WebsiteMetadata } from "./metadata";
import { Textarea } from "../ui/textarea";
import { usePasteBinState, pasteBinStorage, type StoredLinkMeta, type StoredMediaItem } from "@/lib/paste-bin-state";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { UserResource } from "@clerk/types";
import { CreateNodeArgs } from "../../../convex/nodes";
import { NodeVariants } from "../../../convex/tables/nodes";

// Paste-bin mode enum
export enum PasteBinMode {
    IDLE = 'idle',
    TEXT = 'text',
    AI = 'ai',
    MEDIA = 'media',
    EMBED = 'embed'
}

// Data interfaces
export interface MediaData {
    file: File;
    url: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    uploadedUrl?: string;
    isUploading?: boolean;
    customName?: string;
}

export interface EmbedData {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    type: string;
}

interface Media {
    type: NodeVariants;
    // File properties (for uploaded media)
    file?: File;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    uploadedUrl?: string;
    customName?: string;

    // Link/Embed properties (for external content) - matching LinkMetadata structure
    url?: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
    ogType?: string;
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;

    // Platform-specific fields from LinkMetadata
    stars?: number; // GitHub
    forks?: number; // GitHub
    language?: string; // GitHub
    topics?: string[]; // GitHub
    team?: string; // Figma
    figmaFileType?: string; // Figma
    thumbnail?: string; // YouTube
    channelName?: string; // YouTube
    duration?: string; // YouTube, Spotify, etc.
    views?: number; // YouTube, Loom
    likes?: number; // YouTube, Twitter
    publishedAt?: string; // YouTube, Twitter
    videoUrl?: string; // YouTube
    videoDuration?: string; // YouTube
    videoWidth?: string; // YouTube
    videoHeight?: string; // YouTube
    twitterCreator?: string; // Twitter
    twitterSite?: string; // Twitter
    username?: string; // Twitter
    avatar?: string; // Twitter
    retweets?: number; // Twitter
    replies?: number; // Twitter
    twitterType?: "tweet" | "profile" | "media"; // Twitter
    tweetId?: string; // Twitter
    workspace?: string; // Notion
    icon?: string; // Notion
    lastEdited?: string; // Notion
    pageType?: string; // Notion
    artist?: string; // Spotify, AppleMusic
    album?: string; // Spotify, AppleMusic
    spotifyType?: "track" | "album" | "playlist" | "artist"; // Spotify
    appleMusicType?: "song" | "album" | "playlist" | "artist"; // AppleMusic
    createdAt?: string; // Loom
    creator?: string; // Loom

    // Chat properties (for AI nodes)
    chatId?: string;
}

export default function PasteBin({ onCreateNode }: { user: UserResource, onCreateNode: (data: Omit<CreateNodeArgs, "channel">) => void }) {
    // State management with reducer
    const { state, actions } = usePasteBinState();
    const { isDragOver, isLoadingLinkMeta, imageLoaded } = state;

    // Component state
    const [mode, setMode] = useState<PasteBinMode>(PasteBinMode.IDLE);
    const [textContent, setTextContent] = useState("");
    const [drivenMessageIds, setDrivenMessageIds] = useState<Set<string>>(new Set())
    const [chatId, setChatId] = useState<string | null>(null);

    // Unified media state
    const [media, setMedia] = useState<Media | null>(null);
    const [isTextMode, setIsTextMode] = useState(false);
    const [isAiMode, setIsAiMode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const initialLoadRef = useRef(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const emptyResetTimerRef = useRef<NodeJS.Timeout | null>(null);
    const textContentDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const createChat = useMutation(api.chats.createChat);
    const sendMessage = useMutation(api.messages.sendMessage);
    const deleteChat = useMutation(api.chats.deleteChat);

    // Helper function to convert Media to LinkMetadata for card components
    const mediaToLinkMetadata = useCallback((media: Media): LinkMetadata => {
        return {
            type: media.type,
            title: media.title || media.fileName || 'Untitled',
            url: media.url || '',
            description: media.description,
            image: media.image,
            siteName: media.siteName,
            favicon: media.favicon,
            ogType: media.ogType,
            author: media.author,
            publishedTime: media.publishedTime,
            modifiedTime: media.modifiedTime,
            // Platform-specific fields
            stars: media.stars,
            forks: media.forks,
            language: media.language,
            topics: media.topics,
            team: media.team,
            thumbnail: media.thumbnail,
            channelName: media.channelName,
            duration: media.duration,
            views: media.views,
            likes: media.likes,
            publishedAt: media.publishedAt,
            videoUrl: media.videoUrl,
            videoDuration: media.videoDuration,
            videoWidth: media.videoWidth,
            videoHeight: media.videoHeight,
            twitterCreator: media.twitterCreator,
            twitterSite: media.twitterSite,
            username: media.username,
            avatar: media.avatar,
            retweets: media.retweets,
            replies: media.replies,
            twitterType: media.twitterType,
            tweetId: media.tweetId,
            workspace: media.workspace,
            icon: media.icon,
            lastEdited: media.lastEdited,
            pageType: media.pageType,
            artist: media.artist,
            album: media.album,
            spotifyType: media.spotifyType,
            appleMusicType: media.appleMusicType,
            createdAt: media.createdAt,
            creator: media.creator,
        } as LinkMetadata;
    }, []);

    // Load saved data from localStorage on mount
    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;

        const savedData = pasteBinStorage.load();

        setTextContent(savedData.textContent);

        // Restore mode
        if (savedData.mode && savedData.mode !== 'idle') {
            setMode(savedData.mode as PasteBinMode);
        }

        // Restore chat state
        if (savedData.chatId) {
            setChatId(savedData.chatId);
        }
        if (savedData.isAiMode) {
            setIsAiMode(savedData.isAiMode);
        }

        // Restore media if valid
        if (savedData.mediaItem) {
            const parsedMedia = savedData.mediaItem as StoredMediaItem;
            // Don't restore File objects as they can't be serialized
            if (parsedMedia.type !== NodeVariants.Link || parsedMedia.uploadedUrl) {
                // Convert stored media item to unified Media format
                const restoredMedia: Media = {
                    type: parsedMedia.type as NodeVariants,
                    url: parsedMedia.url,
                    chatId: parsedMedia.chatId,
                    uploadedUrl: parsedMedia.uploadedUrl,
                    fileName: parsedMedia.fileName,
                    fileSize: parsedMedia.fileSize,
                    fileType: parsedMedia.fileType,
                    customName: parsedMedia.customName,
                };
                setMedia(restoredMedia);
                // Set image as loaded during initial load without causing re-renders
                if (restoredMedia.type === NodeVariants.Image) {
                    setTimeout(() => actions.setImageLoaded(true), 0);
                }
                // Set mode for text/AI items
                switch (restoredMedia.type) {
                    case NodeVariants.Text:
                        setMode(PasteBinMode.TEXT);
                        setIsTextMode(true);
                    case NodeVariants.AI:
                        setMode(PasteBinMode.AI);
                        setIsAiMode(true);
                    default:
                        setMode(PasteBinMode.MEDIA);

                }
            }
        }

        // Restore link meta if valid
        if (savedData.linkMeta) {
            const storedMeta = savedData.linkMeta as StoredLinkMeta;
            // Convert StoredLinkMeta to unified Media format
            const restoredMedia: Media = {
                type: storedMeta.type as NodeVariants,
                title: storedMeta.title || 'Untitled Link',
                description: storedMeta.description,
                url: storedMeta.url,
                image: storedMeta.image,
                siteName: storedMeta.siteName,
            };
            setMedia(restoredMedia);
            setMode(PasteBinMode.EMBED);
        }
    }, [actions]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (emptyResetTimerRef.current) {
                clearTimeout(emptyResetTimerRef.current);
            }
            if (textContentDebounceRef.current) {
                clearTimeout(textContentDebounceRef.current);
            }
        };
    }, []);

    // Focus textarea when text mode is activated
    useEffect(() => {
        if ((mode === PasteBinMode.TEXT || mode === PasteBinMode.AI) && textareaRef.current) {
            // Small delay to ensure the component has rendered
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    }, [mode]);

    // Reset to original state if input is empty for 3 seconds
    useEffect(() => {
        if (mode === PasteBinMode.TEXT && !media) {
            // Clear existing timer
            if (emptyResetTimerRef.current) {
                clearTimeout(emptyResetTimerRef.current);
            }

            // If textContent is empty, start the 3-second timer
            if (!textContent.trim()) {
                emptyResetTimerRef.current = setTimeout(() => {
                    setMode(PasteBinMode.IDLE);
                    setIsTextMode(false);
                    setTextContent("");
                    pasteBinStorage.save.textContent("");
                }, 1500);
            }
        }

        // Cleanup timer if conditions change
        return () => {
            if (emptyResetTimerRef.current) {
                clearTimeout(emptyResetTimerRef.current);
                emptyResetTimerRef.current = null;
            }
        };
    }, [mode, media, textContent, actions]);

    const updateMedia = useCallback((mediaItem: Media | null) => {
        setMedia(mediaItem);
        pasteBinStorage.save.mediaItem(mediaItem);
    }, []);

    // Debounced text content update
    const updateTextContent = useCallback((content: string) => {
        setTextContent(content);

        // Clear existing debounce timer
        if (textContentDebounceRef.current) {
            clearTimeout(textContentDebounceRef.current);
        }

        // Set debounced localStorage save
        textContentDebounceRef.current = setTimeout(() => {
            pasteBinStorage.save.textContent(content);
        }, 300);
    }, []);

    const updateChatId = useCallback((chatIdValue: string | null) => {
        setChatId(chatIdValue);
        pasteBinStorage.save.chatId(chatIdValue);
    }, []);

    const newChat = useCallback(async (title: string) => {
        const chatId = await createChat({
            title
        });

        updateChatId(chatId);

        return chatId
    }, [createChat, updateChatId]);

    const updateIsAiMode = useCallback((aiModeValue: boolean) => {
        setIsAiMode(aiModeValue);
        pasteBinStorage.save.isAiMode(aiModeValue);
    }, []);

    const { startUpload, isUploading } = useUploadThing("mediaUploader", {
        onClientUploadComplete: (res) => {
            console.log("UPLOAD THING: ", res)
            if (res && res[0]) {
                setMedia(currentMedia => {
                    if (currentMedia) {
                        const updatedMedia = { ...currentMedia, uploadedUrl: res[0].ufsUrl };
                        pasteBinStorage.save.mediaItem(updatedMedia);
                        return updatedMedia;
                    }
                    return currentMedia;
                });
            }
        },
        onUploadError: (error: Error) => {
            console.error("Upload failed:", error);
            setMedia(currentMedia => {
                if (currentMedia) {
                    const updatedMedia = { ...currentMedia, isUploading: false };
                    pasteBinStorage.save.mediaItem(updatedMedia);
                    return updatedMedia;
                }
                return currentMedia;
            });
        },
    });

    const determineMediaType = (file: File): NodeVariants => {
        const type = file.type;
        if (type.startsWith("image/")) return NodeVariants.Image;
        if (type.startsWith("audio/")) return NodeVariants.Audio;
        if (type.startsWith("video/")) return NodeVariants.Video;
        return NodeVariants.Link; // Using Link as default for file types
    };

    const detectLinkType = useCallback((url: string): NodeVariants => {
        try {
            const hostname = new URL(url).hostname.toLowerCase();

            if (hostname.includes('github.com')) return NodeVariants.GitHub;
            if (hostname.includes('figma.com')) return NodeVariants.Figma;
            if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return NodeVariants.YouTube;
            if (hostname.includes('notion.so') || hostname.includes('notion.com')) return NodeVariants.Notion;
            if (hostname.includes('twitter.com') || hostname.includes('x.com')) return NodeVariants.Twitter;
            if (hostname.includes('loom.com')) return NodeVariants.Loom;
            if (hostname.includes('spotify.com')) return NodeVariants.Spotify;
            if (hostname.includes('music.apple.com')) return NodeVariants.AppleMusic;

            return NodeVariants.Link; // Default to generic website
        } catch (error) {
            console.error('Error parsing URL:', url, error);
            return NodeVariants.Link;
        }
    }, []);

    const fetchLinkMetadata = useCallback(async (url: string): Promise<any> => {
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

            // Map backend platform types to NodeVariants
            const typeMapping: Record<string, NodeVariants> = {
                github: NodeVariants.GitHub,
                youtube: NodeVariants.YouTube,
                twitter: NodeVariants.Twitter,
                figma: NodeVariants.Figma,
                notion: NodeVariants.Notion,
                loom: NodeVariants.Loom,
                spotify: NodeVariants.Spotify,
                applemusic: NodeVariants.AppleMusic,
                website: NodeVariants.Link
            };

            return {
                ...data.metadata,
                type: typeMapping[data.platformType] || NodeVariants.Link
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
    }, [detectLinkType]);

    // Core handlers in dependency order
    const handleFileSelect = useCallback((file: File) => {
        const mediaType = determineMediaType(file);
        const previewUrl = URL.createObjectURL(file);

        const newMedia: Media = {
            type: mediaType,
            file,
            url: previewUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
        };

        setMode(PasteBinMode.MEDIA);
        updateMedia(newMedia);
        pasteBinStorage.save.mode(PasteBinMode.MEDIA);
        actions.setImageLoaded(false);

        // Start upload immediately
        startUpload([file]);
    }, [actions, updateMedia, startUpload]);

    const handleLinkPaste = useCallback(async (url: string) => {
        setMode(PasteBinMode.EMBED);
        updateMedia(null);
        pasteBinStorage.save.mode(PasteBinMode.EMBED);
        actions.setLoadingLinkMeta(true);

        try {
            const meta = await fetchLinkMetadata(url);
            // Convert LinkMetadata to unified Media format

            updateMedia({
                type: meta.type as NodeVariants,
                title: meta.title,
                description: meta.description,
                url: meta.url,
                image: meta.image,
                siteName: meta.siteName,
            });
        } catch (error) {
            console.error('Failed to fetch link metadata:', error);
        } finally {
            actions.setLoadingLinkMeta(false);
        }
    }, [actions, updateMedia, fetchLinkMetadata]);

    // Input handlers that depend on handleLinkPaste and handleFileSelect
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const clipboardData = e.clipboardData;
        const files = Array.from(clipboardData.files);
        const text = clipboardData.getData("text");

        if (files.length > 0) {
            handleFileSelect(files[0]);
        } else if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
            handleLinkPaste(text);
            updateTextContent("");  // Clear input after pasting link
        }
    }, [handleFileSelect, handleLinkPaste, updateTextContent]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        updateTextContent(value);

        // Auto-detect and handle URLs when user types/pastes
        if (value && (value.startsWith("http://") || value.startsWith("https://"))) {
            handleLinkPaste(value);
            updateTextContent("");  // Clear input after processing link
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
                if (mode === PasteBinMode.IDLE) {
                    setMode(PasteBinMode.TEXT);
                    setIsTextMode(true);
                    pasteBinStorage.save.mode(PasteBinMode.TEXT);
                }
            }, 500);
        }
    }, [handleLinkPaste, updateTextContent, mode]);

    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && textContent) {
            if (textContent.startsWith("http://") || textContent.startsWith("https://")) {
                handleLinkPaste(textContent);
                updateTextContent("");
            }
        }
    }, [textContent, handleLinkPaste, updateTextContent]);

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

    const handleSendMessage = useCallback(async (chatId: string) => {
        const data = await sendMessage({ content: textContent, chatId: chatId as Id<"chats"> })
        setDrivenMessageIds((s) => s.add(data.messageId))
        setTextContent("")
    }, [sendMessage, textContent]);

    const handleToggleAiMode = useCallback(async () => {
        if (mode === PasteBinMode.TEXT) {
            if (textContent) {
                const content = textContent;
                const chatId = await newChat(content);
                handleSendMessage(chatId);
            }
            setTextContent("")
            setMode(PasteBinMode.AI);
            setIsAiMode(true);
            updateIsAiMode(true);
            pasteBinStorage.save.mode(PasteBinMode.AI);
        }
    }, [mode, textContent, newChat, handleSendMessage, updateIsAiMode]);

    const clearMedia = useCallback(async (deleteUnusedChat = true) => {
        // Delete any uploaded media files if not clearing after successful creation
        if (media && media.uploadedUrl && deleteUnusedChat) {
            try {
                const response = await fetch('/api/uploadthing/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fileUrl: media.uploadedUrl }),
                });

                if (!response.ok) {
                    console.error('Failed to delete uploaded file:', response.statusText);
                }
            } catch (error) {
                console.error('Error deleting uploaded file:', error);
            }
        }

        // Delete any chat that was created but not used (no messages sent)
        // Only delete if this is a cancellation, not after successful creation
        if (chatId && isAiMode && deleteUnusedChat) {
            try {
                await deleteChat({ chatId: chatId as Id<"chats"> });
            } catch (error) {
                console.error("Failed to delete unused chat:", error);
            }
        }

        updateMedia(null);
        setTextContent("");
        setMode(PasteBinMode.IDLE);
        setIsTextMode(false);
        updateIsAiMode(false);
        updateChatId(null);

        pasteBinStorage.save.textContent("");
        pasteBinStorage.save.mode(PasteBinMode.IDLE);

        // Clear timers
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (emptyResetTimerRef.current) {
            clearTimeout(emptyResetTimerRef.current);
            emptyResetTimerRef.current = null;
        }
        if (textContentDebounceRef.current) {
            clearTimeout(textContentDebounceRef.current);
            textContentDebounceRef.current = null;
        }

        // Reset state machine
        actions.resetState();

        // Clear all localStorage data
        pasteBinStorage.clear();

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [actions, updateMedia, updateChatId, updateIsAiMode, chatId, isAiMode, deleteChat, media]);

    const handleCreate = useCallback(async () => {
        const node = () => {
            if (media) {
                // Handle file uploads
                if (media.file || media.uploadedUrl) {
                    const finalName = media.fileName;

                    if (!finalName && media.type !== NodeVariants.Link) {
                        alert("Please provide a name for this media");
                        return;
                    }

                    // If still uploading, wait for upload to complete
                    if (isUploading) {
                        console.log("Upload in progress, please wait...");
                        return;
                    }

                    // Upload should already be completed at this point
                    const url = media.uploadedUrl;
                    if (!url && media.file) {
                        console.log("No uploaded URL available, upload may have failed");
                        return;
                    }

                    onCreateNode({
                        title: media.fileName || media.title || `A ${media.type} Node`,
                        variant: media.type,
                        value: url || media.url || '',
                        thought: textContent,
                    })
                    return;
                }

                // Handle links/embeds
                if (media.url) {
                    onCreateNode({
                        title: media.title || 'Unnamed link',
                        variant: media.type,
                        value: media.url,
                        thought: textContent,
                    })
                    return;
                }

                // Handle AI chat
                if (media.chatId) {
                    onCreateNode({
                        title: media.title || "AI Chat",
                        variant: NodeVariants.AI,
                        value: media.chatId,
                    })
                    return;
                }
            }

            // Handle text mode without media
            if (isTextMode || isAiMode) {
                let value;
                if (isAiMode && chatId) {
                    value = chatId
                } else {
                    value = textContent
                }

                onCreateNode({
                    title: "Node",
                    variant: isAiMode ? NodeVariants.AI : NodeVariants.Text,
                    value: value,
                })
            }
        }

        // Clear all data and localStorage after successful creation (don't delete chat)
        node();
        await clearMedia(false);
    }, [media, clearMedia, onCreateNode, textContent, isTextMode, isAiMode, chatId]);

    const isValidForCreation = useCallback(() => {
        if (media) {
            if (media.type === NodeVariants.Text || media.type === NodeVariants.AI) {
                return !!media.customName || !!media.title;
            } else if (media.file) {
                // For media files, upload must be completed and have an uploaded URL
                return !!media.fileName && !isUploading && !!media.uploadedUrl;
            } else if (media.url) {
                // For links/embeds
                return !isLoadingLinkMeta;
            }
        }
        return (isTextMode || isAiMode) && !!textContent.trim();
    }, [media, isLoadingLinkMeta, isTextMode, isAiMode, textContent]);

    const getDisplayName = useCallback(() => {
        if (media) {
            if (media.type === NodeVariants.Text) {
                return media.customName || media.title || "Text note";
            }
            if (media.type === NodeVariants.AI) {
                return "AI Assistant";
            }
            return media.fileName || media.title || "Unnamed item";
        }
        if (isLoadingLinkMeta) {
            return "Loading metadata...";
        }
        return "";
    }, [media, isLoadingLinkMeta]);

    return (
        <div
            className={`absolute inset-x-0 bottom-10 w-full max-w-lg mx-auto`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="relative">
                {/* Floating helper / metadata container */}
                <motion.div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 will-change-transform"
                    animate={{
                        width: mode !== PasteBinMode.IDLE || isDragOver ? "100%" : "10rem",
                        opacity: mode !== PasteBinMode.IDLE || isDragOver ? 1 : 0.8,
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
                            height: mode === PasteBinMode.AI ? "400px" :
                                mode !== PasteBinMode.IDLE ? "auto" :
                                    isDragOver ? "8rem" : "2rem",
                            padding: mode !== PasteBinMode.IDLE || isDragOver ? "0px" : "4px",
                            backgroundColor: isDragOver ? "hsl(var(--primary) / 0.05)" : "hsl(var(--background))",
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 280,
                            damping: 30,
                            mass: 1.0,
                        }}
                    >
                        <div className="relative flex flex-col items-center justify-center">
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

                                {mode === PasteBinMode.TEXT && (
                                    <motion.div
                                        key="text-mode"
                                        className="w-full overflow-hidden"
                                        initial={{ height: 0, opacity: 0 }}
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
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 25,
                                                delay: 0.1
                                            }}
                                        >
                                            <div className="w-full text-center">
                                                <div className="flex flex-col items-center gap-1 text-gray-500">
                                                    <FileText className="w-8 h-8 text-blue-500" />
                                                    <p className="text-sm font-medium">Note</p>
                                                    <p className="text-xs text-muted-foreground">Enter a note into the channel</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {mode === PasteBinMode.IDLE && !isDragOver && (
                                    <motion.div
                                        key="helper"
                                        className="mt-[2px] flex items-center justify-center"
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

                                {media && (media.file || media.uploadedUrl) && (
                                    <motion.div
                                        key="media"
                                        className="h-full w-full overflow-hidden"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{
                                            height: (media.type === NodeVariants.Image && !imageLoaded) ? 0 : "auto",
                                            opacity: (media.type === NodeVariants.Image && !imageLoaded) ? 0 : 1
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
                                            {isUploading && (
                                                <div className="text-center">
                                                    <div className="text-xs text-muted-foreground">
                                                        Uploading...
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-center items-center">
                                                {media.type === NodeVariants.Image && (
                                                    <div className="w-full max-w-sm mx-auto">
                                                        <Image
                                                            src={media.uploadedUrl || media.url!}
                                                            alt={media.fileName || "Pasted image"}
                                                            width={0}
                                                            height={0}
                                                            className="w-full h-full object-cover rounded-lg"
                                                            onLoad={() => actions.setImageLoaded(true)}
                                                            onError={() => actions.setImageLoaded(true)}
                                                        />
                                                    </div>
                                                )}

                                                {media.type === NodeVariants.Audio && (
                                                    <div className="w-full max-w-sm mx-auto">
                                                        <AudioPlayer
                                                            src={media.uploadedUrl || media.url!}
                                                            title={media.customName || media.fileName}
                                                        />
                                                    </div>
                                                )}

                                                {media.type === NodeVariants.Video && (
                                                    <div className="w-full max-w-sm mx-auto">
                                                        <VideoPlayer
                                                            src={media.uploadedUrl || media.url!}
                                                            title={media.customName || media.fileName}
                                                        />
                                                    </div>
                                                )}

                                                {media.type === NodeVariants.Link && (
                                                    <div className="w-full max-w-sm mx-auto">
                                                        <FilePreview
                                                            fileName={media.customName || media.fileName!}
                                                            fileSize={media.fileSize}
                                                            fileType={media.fileType}
                                                            downloadUrl={media.uploadedUrl}
                                                        />
                                                    </div>
                                                )}

                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {mode === PasteBinMode.AI && chatId && (
                                    <div className="h-[400px] w-full p-4 overflow-hidden">
                                        <ChatCard drivenIds={drivenMessageIds} onFocusInput={() => {
                                            textareaRef.current?.focus();
                                        }} chatId={chatId} />
                                    </div>
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

                                {media && media.url && !media.file && (
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
                                                {media.type === NodeVariants.GitHub && <GitHubCard metadata={mediaToLinkMetadata(media) as GitHubMetadata} />}
                                                {media.type === NodeVariants.Figma && <FigmaCard metadata={mediaToLinkMetadata(media) as FigmaMetadata} />}
                                                {media.type === NodeVariants.YouTube && <YouTubeCard metadata={mediaToLinkMetadata(media) as YouTubeMetadata} />}
                                                {media.type === NodeVariants.Twitter && <TwitterCard metadata={mediaToLinkMetadata(media) as TwitterMetadata} />}
                                                {media.type === NodeVariants.Notion && <NotionCard metadata={mediaToLinkMetadata(media) as NotionMetadata} />}
                                                {media.type === NodeVariants.Loom && <LoomCard metadata={mediaToLinkMetadata(media) as LoomMetadata} />}
                                                {media.type === NodeVariants.Spotify && <SpotifyCard metadata={mediaToLinkMetadata(media) as SpotifyMetadata} />}
                                                {media.type === NodeVariants.AppleMusic && <AppleMusicCard metadata={mediaToLinkMetadata(media) as AppleMusicMetadata} />}
                                                {media.type === NodeVariants.Link && <WebsiteCard metadata={mediaToLinkMetadata(media) as WebsiteMetadata} />}
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Unified Input/Textarea at bottom */}
                <motion.div
                    className="relative"
                    animate={{
                        height: mode !== PasteBinMode.IDLE ? "120px" : "44px"
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        mass: 0.8
                    }}
                >
                    <Input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        multiple={false}
                    />

                    <motion.div className="relative w-full h-full">
                        <Textarea
                            ref={textareaRef}
                            className={`w-full h-full resize-none transition-all duration-200 ${mode !== PasteBinMode.IDLE
                                ? "pr-24 rounded-xl shadow-sm hover:shadow-lg focus:shadow-lg py-3 px-4"
                                : "pr-16 rounded-2xl shadow-sm hover:shadow-lg focus:shadow-lg py-0 px-4 overflow-hidden"
                                }`}
                            style={{
                                lineHeight: mode !== PasteBinMode.IDLE ? "1.5" : "44px",
                                minHeight: "44px"
                            }}
                            placeholder={
                                mode !== PasteBinMode.IDLE
                                    ? mode === PasteBinMode.AI ? "Type you message here..." : `Enter a thought about: ${getDisplayName()}`
                                    : "Enter content to create a Node"
                            }
                            value={textContent}
                            onChange={(e) => {
                                if (mode === PasteBinMode.TEXT || mode === PasteBinMode.AI) {
                                    updateTextContent(e.target.value);
                                } else {
                                    handleInputChange(e);
                                }
                            }}
                            onKeyDown={async (e) => {
                                if (e.key === "Enter" && !e.shiftKey && textContent) {
                                    e.preventDefault();
                                    if (mode === PasteBinMode.AI && chatId) {
                                        handleSendMessage(chatId);
                                    } else if (mode === PasteBinMode.TEXT) {
                                        handleCreate();
                                    } else {
                                        handleInputKeyDown(e);
                                    }
                                }
                            }}
                            onPaste={mode === PasteBinMode.IDLE ? handlePaste : undefined}
                        />

                        <AnimatePresence>
                            {/* Compact mode buttons */}
                            {mode === PasteBinMode.IDLE && (
                                <motion.div
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    initial={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-xl px-2 text-xs border-border/50 hover:border-border transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <FileText size={12} />
                                    </Button>
                                </motion.div>
                            )}

                            {/* Expanded mode buttons */}
                            {mode !== PasteBinMode.IDLE && (
                                <motion.div
                                    className="absolute right-2 bottom-2 flex gap-2 bg-background p-1"
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 25
                                    }}
                                >

                                    {/* AI button for text mode */}
                                    {mode === PasteBinMode.TEXT && (
                                        <motion.div
                                            initial={{ x: 40, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: 40, opacity: 0 }}
                                            transition={{ delay: 0.08 }}
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

                                    {/* Close button */}
                                    <motion.div
                                        initial={{ x: 40, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: 40, opacity: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => { clearMedia() }}
                                            className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </motion.div>

                                    {/* Main action button */}
                                    <motion.div
                                        initial={{ x: 30, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: 30, opacity: 0 }}
                                        transition={{ delay: 0.15 }}
                                    >
                                        <Button
                                            size="sm"
                                            onClick={async () => {
                                                handleCreate();
                                            }}
                                            disabled={
                                                (isUploading) &&
                                                !isValidForCreation()
                                            }
                                            className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all duration-200"
                                        >
                                            <Send size={12} />
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
