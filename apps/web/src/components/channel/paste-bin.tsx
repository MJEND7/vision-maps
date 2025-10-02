"use client"

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AudioPlayer } from "./audio-player";
import { VideoPlayer } from "./video-player";
import { FilePreview } from "./file-preview";
import { useUploadThing } from "@/utils/uploadthing";
import { X, FileText, Send, Brain, Mic, Square } from "lucide-react";
import Image from "next/image";
import { GitHubCard, FigmaCard, YouTubeCard, TwitterCard, NotionCard, WebsiteCard, LoomCard, SpotifyCard, AppleMusicCard, SkeletonCard, ChatCard, LinkMetadata, GitHubMetadata, FigmaMetadata, YouTubeMetadata, TwitterMetadata, NotionMetadata, LoomMetadata, SpotifyMetadata, AppleMusicMetadata, WebsiteMetadata } from "./metadata";
import { Textarea } from "../ui/textarea";
import { usePasteBinState } from "@/lib/paste-bin-state";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { CreateNodeArgs } from "@convex/nodes";
import { NodeVariants } from "@convex/tables/nodes";
import { useOGMetadataWithCache } from "@/utils/ogMetadata";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Permission } from "@/lib/permissions";
import { UpgradeDialog } from "../ui/upgrade-dialog";
import { useRealtimeTranscription, getAvailableAudioDevices } from "@/hooks/useRealtimeTranscription";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Paste-bin mode enum
export enum PasteBinMode {
    IDLE = 'idle',
    TEXT = 'text',
    AI = 'ai',
    MEDIA = 'media',
    EMBED = 'embed',
    TRANSCRIPTION = 'transcription'
}

// Helper function to stitch multiple audio blobs together
async function stitchAudioBlobs(blobs: Blob[]): Promise<Blob> {
    if (blobs.length === 0) {
        throw new Error('No audio blobs to stitch');
    }

    if (blobs.length === 1) {
        return blobs[0];
    }

    console.log('[Audio Stitching] Stitching', blobs.length, 'audio blobs');

    // Decode all audio blobs
    const audioContext = new AudioContext();
    const audioBuffers: AudioBuffer[] = [];

    for (const blob of blobs) {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.push(audioBuffer);
    }

    // Calculate total length
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const numberOfChannels = audioBuffers[0].numberOfChannels;
    const sampleRate = audioBuffers[0].sampleRate;

    // Create a new buffer to hold all audio
    const stitchedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

    // Copy all audio data into the stitched buffer
    let offset = 0;
    for (const buffer of audioBuffers) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            stitchedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
        }
        offset += buffer.length;
    }

    // Convert to WebM blob using MediaRecorder
    const mediaStream = audioContext.createMediaStreamDestination();
    const source = audioContext.createBufferSource();
    source.buffer = stitchedBuffer;
    source.connect(mediaStream);

    const mediaRecorder = new MediaRecorder(mediaStream.stream, {
        mimeType: 'audio/webm;codecs=opus'
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    const stitchedBlob = await new Promise<Blob>((resolve, reject) => {
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            resolve(blob);
        };
        mediaRecorder.onerror = reject;

        mediaRecorder.start();
        source.start();

        // Stop after the audio finishes playing
        setTimeout(() => {
            mediaRecorder.stop();
            source.stop();
        }, (totalLength / sampleRate) * 1000 + 100);
    });

    await audioContext.close();
    console.log('[Audio Stitching] Stitched blob size:', stitchedBlob.size, 'bytes');

    return stitchedBlob;
}

// Helper function to convert audio blob to WAV with timestamp metadata
async function convertToWav(
    audioBlob: Blob,
): Promise<Blob> {
    // Decode audio data - use high sample rate for better quality
    const audioContext = new AudioContext({ sampleRate: 48000 });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get audio data
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    console.log('[WAV Conversion] Channels:', numberOfChannels, 'Sample Rate:', sampleRate, 'Length:', length);

    // For mono recordings, use single channel. For stereo, interleave properly
    let pcmData: Int16Array;

    if (numberOfChannels === 1) {
        // Mono - simpler and clearer
        const channelData = audioBuffer.getChannelData(0);
        pcmData = new Int16Array(length);
        for (let i = 0; i < length; i++) {
            const s = Math.max(-1, Math.min(1, channelData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
    } else {
        // Stereo - interleave channels
        const interleaved = new Float32Array(length * numberOfChannels);
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                interleaved[i * numberOfChannels + channel] = channelData[i];
            }
        }

        // Convert Float32 to Int16 with proper scaling
        pcmData = new Int16Array(interleaved.length);
        for (let i = 0; i < interleaved.length; i++) {
            const s = Math.max(-1, Math.min(1, interleaved[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
    }

    // Create WAV file with proper headers
    const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(wavBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const byteRate = sampleRate * numberOfChannels * 2;
    const blockAlign = numberOfChannels * 2;
    const dataSize = pcmData.length * 2;

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // ChunkSize
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, numberOfChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true); // Subchunk2Size

    // Write PCM data with proper byte order (little endian)
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(offset, pcmData[i], true); // true = little endian
        offset += 2;
    }

    await audioContext.close();

    console.log('[WAV Conversion] Created WAV file:', dataSize, 'bytes');
    return new Blob([wavBuffer], { type: 'audio/wav' });
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

function PasteBin({ onCreateNode, channelId, visionId }: {
    onCreateNode: (data: Omit<CreateNodeArgs, "channel">) => void,
    channelId: string,
    visionId: string
}) {
    // State management with reducer
    const { state, actions } = usePasteBinState();
    const { isDragOver, isLoadingLinkMeta, imageLoaded } = state;

    // Component state
    const [mode, setMode] = useState<PasteBinMode>(PasteBinMode.IDLE);
    const [textContent, setTextContent] = useState("");
    const [drivenMessageIds, setDrivenMessageIds] = useState<Set<string>>(new Set())
    const [chatId, setChatId] = useState<string | null>(null);
    const [transcriptChunks, setTranscriptChunks] = useState<{ text: string; timestamp: number }[]>([]);

    // Unified media state
    const [media, setMedia] = useState<Media | null>(null);
    const [isTextMode, setIsTextMode] = useState(false);
    const [isAiMode, setIsAiMode] = useState(false);
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const emptyResetTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { hasPermission } = usePermissions();
    const canUseAI = hasPermission(Permission.AI_NODES);

    const createChat = useMutation(api.chats.createChat);
    const sendMessage = useMutation((api as any)["messages/functions"].sendMessage);
    const deleteChat = useMutation(api.chats.deleteChat);

    // Convex mutations for paste bin persistence
    const upsertPasteBin = useMutation(api.userPasteBin.upsert);
    const clearPasteBin = useMutation(api.userPasteBin.clear);
    const updateTranscriptArrayMutation = useMutation(api.userPasteBin.updateTranscriptArray);
    const pasteBinData = useQuery(api.userPasteBin.get, { visionId: visionId as Id<"visions"> });
    const pasteBinLoadedRef = useRef(false);

    // Debounced save to database
    const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const savePasteBinToDb = useCallback((data: {
        mode: string;
        type?: string;
        value?: string;
        valueArray?: { text: string; timestamp: number }[];
        textContent?: string;
        chatId?: Id<"chats">;
    }) => {
        if (saveDebounceRef.current) {
            clearTimeout(saveDebounceRef.current);
        }
        saveDebounceRef.current = setTimeout(() => {
            upsertPasteBin({
                visionId: visionId as Id<"visions">,
                ...data,
            });
        }, 500);
    }, [upsertPasteBin, visionId]);

    // Real-time transcription hook
    const {
        isRecording,
        isConnecting,
        startRecording,
        stopRecording,
        clearTranscript,
    } = useRealtimeTranscription({
        onTranscript: (text, timestamp) => {
            // Add new chunk with accurate timestamp from recording start
            const newChunk = { text, timestamp };
            setTranscriptChunks(prev => [...prev, newChunk]);
        },
        onError: (error) => {
            console.error('Transcription error:', error);
        },
    });

    // Use the reusable OG metadata hook
    const { fetchWithCache } = useOGMetadataWithCache();

    // Memoize animation values to prevent unnecessary re-renders
    const animationValues = useMemo(() => ({
        containerWidth: mode !== PasteBinMode.IDLE || isDragOver ? "100%" : "10rem",
        containerHeight: mode === PasteBinMode.AI ? "400px" :
            mode === PasteBinMode.TRANSCRIPTION ? "300px" :
                mode !== PasteBinMode.IDLE ? "auto" :
                    isDragOver ? "8rem" : "2rem",
        containerPadding: mode !== PasteBinMode.IDLE || isDragOver ? "0px" : "4px",
        inputHeight: mode !== PasteBinMode.IDLE ? "120px" : "44px"
    }), [mode, isDragOver]);

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

    // Load saved data from database on mount or when data changes
    useEffect(() => {
        if (!pasteBinData) {
            pasteBinLoadedRef.current = false;
            return;
        }

        // Restore text content
        if (pasteBinData.textContent) {
            setTextContent(pasteBinData.textContent);
        }

        // Restore mode
        if (pasteBinData.mode && pasteBinData.mode !== 'idle') {
            setMode(pasteBinData.mode as PasteBinMode);
        }

        // Restore chat state
        if (pasteBinData.chatId) {
            setChatId(pasteBinData.chatId);
        }

        // Transcription will be restored by displaying valueArray directly in the UI

        // Restore media if valid
        if (pasteBinData.type && pasteBinData.value) {
            const restoredMedia: Media = {
                type: pasteBinData.type as NodeVariants,
                url: pasteBinData.value,
                chatId: pasteBinData.chatId,
            };
            setMedia(restoredMedia);
            // Set image as loaded during initial load without causing re-renders
            if (restoredMedia.type === NodeVariants.Image) {
                setTimeout(() => actions.setImageLoaded(true), 0);
            }
        }

        // Set mode flags based on mode
        if (pasteBinData.mode === 'text') {
            setIsTextMode(true);
        } else if (pasteBinData.mode === 'ai') {
            setIsAiMode(true);
        }

        pasteBinLoadedRef.current = true;
    }, [pasteBinData, actions]);

    // Save transcription updates to database in real-time
    useEffect(() => {
        if (mode === PasteBinMode.TRANSCRIPTION && transcriptChunks.length > 0) {
            updateTranscriptArrayMutation({
                visionId: visionId as Id<"visions">,
                valueArray: transcriptChunks,
            });
        }
    }, [transcriptChunks, mode, visionId, updateTranscriptArrayMutation]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (emptyResetTimerRef.current) {
                clearTimeout(emptyResetTimerRef.current);
            }
            if (saveDebounceRef.current) {
                clearTimeout(saveDebounceRef.current);
            }
        };
    }, []);

    // Focus textarea when text mode is activated
    useEffect(() => {
        if ((mode === PasteBinMode.TEXT || mode === PasteBinMode.AI) && textareaRef.current) {
            // Use requestAnimationFrame instead of setTimeout for better performance
            const focusTimeout = requestAnimationFrame(() => {
                textareaRef.current?.focus();
            });
            return () => cancelAnimationFrame(focusTimeout);
        }
    }, [mode]);

    const setIdle = async () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setMode(PasteBinMode.IDLE);
        setIsTextMode(false);
        setTextContent("");
        await clearPasteBin({ visionId: visionId as Id<"visions"> });
    }

    const updateMedia = useCallback((mediaItem: Media | null) => {
        setMedia(mediaItem);
        // Save to database
        if (mediaItem) {
            savePasteBinToDb({
                mode: mode,
                type: mediaItem.type,
                value: mediaItem.uploadedUrl || mediaItem.url,
                chatId: mediaItem.chatId ? (mediaItem.chatId as Id<"chats">) : undefined,
            });
        }
    }, [mode, savePasteBinToDb]);

    // Debounced text content update
    const updateTextContent = useCallback((content: string) => {
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setTextContent(content);

        // Set debounce timer to create text media item
        debounceTimerRef.current = setTimeout(() => {
            // Set debounced database save
            savePasteBinToDb({
                mode: mode,
                textContent: content,
            });
        }, 2000);
    }, [mode, savePasteBinToDb]);

    const updateChatId = useCallback((chatIdValue: string | null) => {
        setChatId(chatIdValue);
        savePasteBinToDb({
            mode: mode,
            chatId: chatIdValue ? (chatIdValue as Id<"chats">) : undefined,
        });
    }, [mode, savePasteBinToDb]);

    const newChat = useCallback(async (title: string) => {
        const chatId = await createChat({
            title,
            visionId: visionId as Id<"visions">,
            channelId: channelId as Id<"channels">
        });

        updateChatId(chatId);

        return chatId
    }, [createChat, updateChatId, visionId, channelId]);

    const updateIsAiMode = useCallback((aiModeValue: boolean) => {
        setIsAiMode(aiModeValue);
        savePasteBinToDb({
            mode: aiModeValue ? 'ai' : mode,
        });
    }, [mode, savePasteBinToDb]);

    const { startUpload, isUploading } = useUploadThing("mediaUploader", {
        onClientUploadComplete: (res) => {
            console.log("UPLOAD THING: ", res)
            if (res && res[0]) {
                setMedia(currentMedia => {
                    if (currentMedia) {
                        // Clear the preview URL and use the uploaded URL
                        if (currentMedia.url && currentMedia.url.startsWith('blob:')) {
                            URL.revokeObjectURL(currentMedia.url);
                        }
                        const updatedMedia = {
                            ...currentMedia,
                            uploadedUrl: res[0].ufsUrl,
                            url: res[0].ufsUrl, // Update the url to the uploaded version
                            isUploading: false
                        };
                        // Save to database
                        savePasteBinToDb({
                            mode: mode,
                            type: updatedMedia.type,
                            value: updatedMedia.uploadedUrl,
                        });
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
                    // Save to database
                    savePasteBinToDb({
                        mode: mode,
                        type: updatedMedia.type,
                        value: updatedMedia.url,
                    });
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
            // Validate URL exists and is a string
            if (!url || typeof url !== 'string' || url.trim() === '') {
                console.error('Invalid URL provided to detectLinkType:', url);
                return NodeVariants.Link;
            }

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
            console.error('Error parsing YouTube URL:', error);
            console.error('URL value that caused error:', url, 'type:', typeof url);
            return NodeVariants.Link;
        }
    }, []);

    const fetchLinkMetadata = useCallback(async (url: string): Promise<any> => {
        console.log('fetchLinkMetadata called with:', url, 'type:', typeof url);
        try {
            // Validate URL before processing
            if (!url || typeof url !== 'string' || url.trim() === '') {
                throw new Error('Invalid URL provided to fetchLinkMetadata');
            }

            console.log('About to call fetchWithCache with:', url);
            const result = await fetchWithCache(url);
            console.log('fetchWithCache result:', result);
            return {
                ...result.metadata,
                type: result.type
            };
        } catch (error) {
            console.error('Error fetching metadata:', error);
            console.log('About to call detectLinkType with:', url);
            const fallbackType = detectLinkType(url);

            // Safe fallback with URL validation
            try {
                const hostname = url ? new URL(url).hostname : 'Invalid URL';
                return {
                    type: fallbackType,
                    title: hostname,
                    description: "",
                    url: url || ""
                };
            } catch (urlError) {
                console.error(urlError)
                return {
                    type: fallbackType,
                    title: 'Invalid URL',
                    description: "",
                    url: ""
                };
            }
        }
    }, [detectLinkType, fetchWithCache]);

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
        actions.setImageLoaded(false);

        // Start upload immediately
        startUpload([file]);
    }, [actions, updateMedia, startUpload]);

    const handleLinkPaste = useCallback(async (url: string) => {
        // Validate URL before processing
        if (!url || typeof url !== 'string' || url.trim() === '') {
            console.error('Invalid URL provided to handleLinkPaste:', url);
            return;
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (urlError) {
            console.error('Invalid URL format:', url, urlError);
            return;
        }

        setMode(PasteBinMode.EMBED);
        actions.setLoadingLinkMeta(true);

        try {
            const meta = await fetchLinkMetadata(url);
            // Convert LinkMetadata to unified Media format and save to localStorage only when complete
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

        // Try multiple ways to get text data
        const text = clipboardData.getData("text/plain") || clipboardData.getData("text") || clipboardData.getData("text/uri-list");

        if (files.length > 0) {
            handleFileSelect(files[0]);
        } else if (text && typeof text === 'string' && text.trim() && (text.trim().startsWith("http://") || text.trim().startsWith("https://"))) {
            const cleanUrl = text.trim();
            console.log('Processing URL:', cleanUrl);
            handleLinkPaste(cleanUrl);
            updateTextContent("");  // Clear input after pasting link
        }
    }, [handleFileSelect, handleLinkPaste, updateTextContent]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        updateTextContent(value);

        // Auto-detect and handle URLs when user types/pastes
        if (value && typeof value === 'string' && value.trim() && (value.startsWith("http://") || value.startsWith("https://"))) {
            handleLinkPaste(value.trim());
            updateTextContent("");  // Clear input after processing link
            return;
        }

        // Handle text mode with debounce
        if (value && !value.startsWith("http://") && !value.startsWith("https://")) {
            // Clear existing timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            if (mode === PasteBinMode.IDLE) {
                setMode(PasteBinMode.TEXT);
                setIsTextMode(true);
            }
            // Set debounce timer to create text media item
            debounceTimerRef.current = setTimeout(() => {
                if (mode === PasteBinMode.IDLE) {
                    savePasteBinToDb({ mode: PasteBinMode.TEXT });
                }
            }, 2000);
        }
    }, [handleLinkPaste, updateTextContent, mode, savePasteBinToDb]);

    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && textContent && typeof textContent === 'string' && textContent.trim()) {
            if (textContent.startsWith("http://") || textContent.startsWith("https://")) {
                handleLinkPaste(textContent.trim());
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
        // Check if user has permission to use AI features
        if (!canUseAI) {
            setShowUpgradeDialog(true);
            return;
        }

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
        }
    }, [mode, textContent, newChat, handleSendMessage, updateIsAiMode, canUseAI]);

    const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [isLoadingDevices, setIsLoadingDevices] = useState(false);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
    const [previousAudioBlobs, setPreviousAudioBlobs] = useState<Blob[]>([]);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);

    const loadAudioDevices = useCallback(async () => {
        setIsLoadingDevices(true);
        try {
            const devices = await getAvailableAudioDevices();
            // Filter to only show monitor/virtual audio devices
            // Common patterns: "monitor", "blackhole", "soundflower", "vb-cable", "virtual", "loopback"
            const monitorDevices = devices.filter(device => {
                const label = device.label.toLowerCase();
                return label.includes('monitor') ||
                    label.includes('blackhole') ||
                    label.includes('soundflower') ||
                    label.includes('vb-cable') ||
                    label.includes('vb-audio') ||
                    label.includes('virtual') ||
                    label.includes('loopback') ||
                    label.includes('stereo mix');
            });
            setAudioDevices(monitorDevices);
        } catch (error) {
            console.error('Failed to load audio devices:', error);
            toast.error('Failed to load audio devices');
        } finally {
            setIsLoadingDevices(false);
        }
    }, []);

    // Auto-scroll to bottom when new transcript chunks arrive
    useEffect(() => {
        if (transcriptContainerRef.current && isRecording && transcriptChunks.length > 0) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [transcriptChunks, isRecording]);

    const handleStopRecording = useCallback(async () => {
        setIsStopping(true);
        try {
            const audioBlob = await stopRecording();
            if (audioBlob) {
                // Add to previous blobs for stitching
                setPreviousAudioBlobs(prev => [...prev, audioBlob]);
                setRecordedAudioBlob(audioBlob);
                console.log('[PasteBin] Audio blob captured:', audioBlob.size, 'bytes');
            }
            // Keep the transcription mode to show the final transcript
            // User can then create node or clear
        } finally {
            setIsStopping(false);
        }
    }, [stopRecording]);

    const clearMedia = useCallback(async (deleteUnusedChat = true) => {
        // Stop recording if active (but continue to clear everything)
        if (isRecording) {
            await stopRecording();
        }

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

        // Clear database
        await clearPasteBin({ visionId: visionId as Id<"visions"> });

        // Clear transcription
        clearTranscript();
        setTranscriptChunks([]);
        setRecordedAudioBlob(null);
        setPreviousAudioBlobs([]);
        setSelectedDeviceId(undefined);

        updateMedia(null);
        setTextContent("");
        setMode(PasteBinMode.IDLE);
        setIsTextMode(false);
        updateIsAiMode(false);
        updateChatId(null);

        // Clear timers
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (emptyResetTimerRef.current) {
            clearTimeout(emptyResetTimerRef.current);
            emptyResetTimerRef.current = null;
        }
        if (saveDebounceRef.current) {
            clearTimeout(saveDebounceRef.current);
            saveDebounceRef.current = null;
        }

        // Reset state machine
        actions.resetState();

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [actions, updateMedia, updateChatId, updateIsAiMode, chatId, isAiMode, deleteChat, media, isRecording, stopRecording, clearTranscript, clearPasteBin, visionId]);

    const handleCreate = useCallback(async () => {
        const node = async () => {
            if (media) {
                // Handle file uploads
                if (media.file || media.uploadedUrl) {
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
                        title: media.title || 'Untitled',
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

            // Handle transcription mode
            if (mode === PasteBinMode.TRANSCRIPTION) {
                // Use either live transcriptChunks or restored valueArray from database
                const chunks = transcriptChunks.length > 0 ? transcriptChunks : (pasteBinData?.valueArray || []);
                const transcriptValue = chunks.map(c => c.text).join(' ');
                if (transcriptValue) {
                    // Upload audio if available
                    let audioUrl: string | undefined;

                    if (recordedAudioBlob) {
                        const toastId = toast.loading('Converting and uploading recording...');
                        setIsUploadingAudio(true);
                        try {
                            // Stitch all audio blobs together if there are multiple recordings
                            let finalAudioBlob: Blob;
                            if (previousAudioBlobs.length > 1) {
                                console.log('[PasteBin] Stitching', previousAudioBlobs.length, 'audio recordings...');
                                toast.loading('Stitching audio recordings...', { id: toastId });
                                finalAudioBlob = await stitchAudioBlobs(previousAudioBlobs);
                            } else {
                                finalAudioBlob = recordedAudioBlob;
                            }

                            console.log('[PasteBin] Starting audio processing, WebM size:', finalAudioBlob.size, 'bytes');

                            // Convert to WAV format with timestamp metadata
                            toast.loading('Converting to WAV format...', { id: toastId });
                            const wavBlob = await convertToWav(finalAudioBlob);
                            console.log('[PasteBin] Converted to WAV, size:', wavBlob.size, 'bytes', `(${(wavBlob.size / 1024 / 1024).toFixed(2)}MB)`);

                            // Check file size (16MB limit)
                            const maxSize = 16 * 1024 * 1024;
                            if (wavBlob.size > maxSize) {
                                throw new Error(`Audio file is too large (${(wavBlob.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 16MB. Try recording for a shorter duration.`);
                            }

                            // Convert blob to File
                            const audioFile = new File(
                                [wavBlob],
                                `transcription-${Date.now()}.wav`,
                                { type: 'audio/wav' }
                            );

                            // Upload to UploadThing with timeout
                            toast.loading('Uploading recording...', { id: toastId });
                            const uploadResult = await Promise.race([
                                startUpload([audioFile]),
                                new Promise<null>((_, reject) =>
                                    setTimeout(() => reject(new Error('Upload timeout after 60s')), 60000)
                                )
                            ]);

                            if (uploadResult && uploadResult[0]) {
                                audioUrl = uploadResult[0].ufsUrl;
                                console.log('[PasteBin] Audio uploaded successfully:', audioUrl);
                                toast.success('Recording uploaded successfully!', { id: toastId, duration: 2000 });
                            } else {
                                throw new Error('Upload completed but no URL returned');
                            }
                        } catch (error) {
                            console.error('[PasteBin] Failed to upload audio:', error);
                            const errorMessage = error instanceof Error ? error.message : 'Failed to upload audio';
                            toast.error(errorMessage, { id: toastId, duration: 5000 });

                            // Don't create node if upload failed - keep paste bin state
                            setIsUploadingAudio(false);
                            return;
                        } finally {
                            setIsUploadingAudio(false);
                        }
                    }

                    // Create the node - serialize chunks as JSON in value
                    onCreateNode({
                        title: "Transcription",
                        variant: NodeVariants.Transcription,
                        value: JSON.stringify(chunks),
                        thought: "",
                        audioUrl,
                    });

                    // Note: clearMedia(false) will be called after this function returns
                    // to fully clear the paste bin state
                    return;
                }
            }

            // Handle text mode without media (but not transcription mode)
            if ((isTextMode || isAiMode) && mode !== PasteBinMode.TRANSCRIPTION) {
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

        // Clear all data after successful creation (don't delete chat)
        await node();
        await clearMedia(false);
    }, [media, clearMedia, onCreateNode, textContent, isTextMode, isAiMode, chatId, isUploading, mode, transcriptChunks, pasteBinData]);

    const isValidForCreation = useCallback(() => {
        // Transcription mode validation
        if (mode === PasteBinMode.TRANSCRIPTION) {
            const chunks = transcriptChunks.length > 0 ? transcriptChunks : (pasteBinData?.valueArray || []);
            const transcriptValue = chunks.map(c => c.text).join(' ');
            return !isRecording && !!transcriptValue && transcriptValue.trim().length > 0;
        }

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
    }, [media, isLoadingLinkMeta, isTextMode, isAiMode, textContent, isUploading, mode, isRecording, transcriptChunks, pasteBinData]);

    return (
        <div
            className={`absolute z-[10] inset-x-0 bottom-10 w-full max-w-xs sm:max-w-lg mx-auto`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="relative">
                {/* Floating helper / metadata container */}
                <motion.div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 will-change-transform"
                    animate={{
                        width: animationValues.containerWidth,
                    }}
                    transition={{
                        type: "tween",
                        duration: 0.2,
                        ease: "easeOut"
                    }}
                >
                    <motion.div
                        className="w-full overflow-hidden rounded-2xl shadow-md border border-accent bg-background"
                        animate={{
                            height: animationValues.containerHeight,
                            padding: animationValues.containerPadding,
                        }}
                        transition={{
                            type: "tween",
                            duration: 0.15,
                            ease: "easeOut"
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
                                        className="w-full overflow-hidden p-4 flex justify-center"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{
                                            type: "tween",
                                            duration: 0.15,
                                            ease: "easeOut"
                                        }}
                                    >
                                        <div className="w-full text-center">
                                            <div className="flex flex-col items-center gap-1 text-gray-500">
                                                <Button
                                                    size="sm"
                                                    onClick={handleToggleAiMode}
                                                    className="px-3 py-2 text-xs rounded-lg bg-primary group hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all duration-200"
                                                >
                                                    <Brain className="dark:group-hover:text-blue-500 group-hover:text-purple-400" size={14} /> Start a Prompt
                                                </Button>
                                            </div>
                                        </div>
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
                                        <span className="hidden sm:flex text-[10px] text-muted-foreground font-medium items-center justify-center">
                                            Press{" "}
                                            <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">Ctrl</kbd> +{" "}
                                            <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">V</kbd> to
                                            paste
                                        </span>
                                        <span className="sm:hidden flex text-[10px] text-muted-foreground font-medium items-center justify-center">
                                            Paste your
                                            <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">media</kbd>
                                            here
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

                                            {!isUploading && media.uploadedUrl && (
                                                <div className="text-center">
                                                    <div className="text-xs text-green-600 dark:text-green-400">
                                                        ✓ Upload complete - High quality version ready
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-center items-center">
                                                {media.type === NodeVariants.Image && (
                                                    <div className="w-full max-w-sm mx-auto">
                                                        <Image
                                                            src={media.uploadedUrl || media.url!}
                                                            alt={media.fileName || "Pasted image"}
                                                            width={400}
                                                            height={300}
                                                            className="w-full h-auto object-cover rounded-lg"
                                                            onLoad={() => actions.setImageLoaded(true)}
                                                            onError={() => actions.setImageLoaded(true)}
                                                            priority={!!media.uploadedUrl}
                                                            quality={95}
                                                            unoptimized={media.url?.startsWith('blob:') || false}
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

                                {mode === PasteBinMode.TRANSCRIPTION && (
                                    <motion.div
                                        key="transcription"
                                        className="w-full h-[300px] overflow-hidden"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "300px", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 280,
                                            damping: 30,
                                            mass: 1.0,
                                        }}
                                    >
                                        <div className="h-full w-full p-4 flex flex-col gap-3">
                                            <div className="flex items-center gap-2 justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}`}></div>
                                                    <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                                                        {isConnecting ? 'Connecting...' : isRecording ? 'Recording' : 'Transcription Complete'}
                                                    </span>
                                                </div>
                                                {!isRecording && !isConnecting && (transcriptChunks.length > 0 || (pasteBinData?.valueArray && pasteBinData.valueArray.length > 0)) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={async () => {
                                                            try {
                                                                // Use the same device that was previously selected
                                                                if (selectedDeviceId) {
                                                                    await startRecording('device', selectedDeviceId);
                                                                } else {
                                                                    await startRecording('microphone');
                                                                }
                                                            } catch (error) {
                                                                console.error('Failed to restart recording:', error);
                                                                const errorMessage = error instanceof Error ? error.message : 'Failed to continue recording';
                                                                toast.error(errorMessage, { duration: 5000 });
                                                            }
                                                        }}
                                                        className="h-6 px-2 text-xs"
                                                    >
                                                        <Mic size={12} className="mr-1" />
                                                        Continue
                                                    </Button>
                                                )}
                                            </div>

                                            <div
                                                ref={transcriptContainerRef}
                                                className="flex-1 overflow-y-auto overscroll-contain bg-background/50 rounded-lg p-3 border border-purple-500/20 space-y-2"
                                            >
                                                {(() => {
                                                    const chunks = transcriptChunks.length > 0 ? transcriptChunks : (pasteBinData?.valueArray || []);
                                                    return chunks.length > 0 ? (
                                                        chunks.map((chunk, index) => {
                                                            const date = new Date(chunk.timestamp);
                                                            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                                                            return (
                                                                <div key={index} className="flex gap-2 items-start">
                                                                    <div className="flex-shrink-0 text-[10px] text-muted-foreground/60 font-mono mt-0.5 min-w-[60px]">
                                                                        {timeString}
                                                                    </div>
                                                                    <div className="flex-1 text-sm bg-accent/30 rounded-lg px-3 py-2 border border-accent/50">
                                                                        {chunk.text}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">
                                                            {isConnecting ? 'Connecting to transcription service...' : 'Start speaking...'}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
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
                        height: animationValues.inputHeight
                    }}
                    transition={{
                        type: "tween",
                        duration: 0.2,
                        ease: "easeOut"
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
                            className={`w-full dark:bg-background bg-background h-full resize-none transition-all duration-200 ${mode !== PasteBinMode.IDLE
                                ? "pr-24 rounded-xl shadow-sm hover:shadow-lg focus:shadow-lg py-3 px-4"
                                : "pr-24 rounded-3xl shadow-sm hover:shadow-lg focus:shadow-lg py-0 px-4 overflow-hidden"
                                }`}
                            style={{
                                lineHeight: mode !== PasteBinMode.IDLE ? "1.5" : "44px",
                                minHeight: "44px"
                            }}
                            placeholder={
                                mode !== PasteBinMode.IDLE
                                    ? mode === PasteBinMode.AI ? "Type you message here..." : `Type your thought here...`
                                    : "Enter media..."
                            }
                            value={textContent}
                            onChange={(e) => {
                                if (e.target.value == "") {
                                    setIdle()
                                } else if (mode === PasteBinMode.TEXT || mode === PasteBinMode.AI) {
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
                                    className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2"
                                    initial={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <DropdownMenu onOpenChange={(open) => {
                                        if (open) {
                                            loadAudioDevices();
                                        }
                                    }}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-xl px-2 text-xs border-border/50 hover:border-border transition-colors"
                                            >
                                                <Mic size={12} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-64">
                                            <DropdownMenuItem onClick={async () => {
                                                try {
                                                    setSelectedDeviceId(undefined);
                                                    await startRecording('microphone');
                                                    setMode(PasteBinMode.TRANSCRIPTION);
                                                    savePasteBinToDb({ mode: PasteBinMode.TRANSCRIPTION });
                                                } catch (error) {
                                                    console.error('Failed to start recording:', error);
                                                    const errorMessage = error instanceof Error ? error.message : 'Failed to start microphone recording';
                                                    toast.error(errorMessage, { duration: 5000 });
                                                }
                                            }}>
                                                <Mic className="mr-2 h-4 w-4" />
                                                Default Microphone
                                            </DropdownMenuItem>

                                            {isLoadingDevices ? (
                                                <DropdownMenuItem disabled>
                                                    <div className="w-3 h-3 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    Loading devices...
                                                </DropdownMenuItem>
                                            ) : audioDevices.length > 0 ? (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuLabel className="text-xs text-muted-foreground">Virtual Audio Devices</DropdownMenuLabel>
                                                    {audioDevices.map((device) => (
                                                        <DropdownMenuItem
                                                            key={device.deviceId}
                                                            onClick={async () => {
                                                                try {
                                                                    setSelectedDeviceId(device.deviceId);
                                                                    await startRecording('device', device.deviceId);
                                                                    setMode(PasteBinMode.TRANSCRIPTION);
                                                                    savePasteBinToDb({ mode: PasteBinMode.TRANSCRIPTION });
                                                                } catch (error) {
                                                                    console.error('Failed to start recording:', error);
                                                                    const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
                                                                    toast.error(errorMessage, { duration: 5000 });
                                                                }
                                                            }}
                                                            className="text-xs"
                                                        >
                                                            <Mic className="mr-2 h-3 w-3" />
                                                            <span className="truncate">{device.label || `Device ${device.deviceId.slice(0, 8)}`}</span>
                                                        </DropdownMenuItem>
                                                    ))}
                                                </>
                                            ) : !isLoadingDevices ? (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                                                        No virtual audio devices found
                                                    </DropdownMenuItem>
                                                </>
                                            ) : null}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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
                                    className="absolute right-2 bottom-2 flex gap-2"
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 25
                                    }}
                                >


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
                                            onClick={async () => { await clearMedia() }}
                                            className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </motion.div>


                                    {/* Main action button */}
                                    <motion.div
                                        key="send-button"
                                        initial={{ x: 30, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: 30, opacity: 0 }}
                                        transition={{ delay: 0.15 }}
                                    >
                                        {mode === PasteBinMode.TRANSCRIPTION && (isRecording || isConnecting || isStopping) ? (
                                            <Button
                                                size="sm"
                                                onClick={handleStopRecording}
                                                disabled={isConnecting || isStopping}
                                                className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all duration-200"
                                            >
                                                {isStopping ? (
                                                    <>
                                                        <div className="w-3 h-3 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        Stopping...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Square size={12} className="mr-1" />
                                                        Stop
                                                    </>
                                                )}
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={handleCreate}
                                                disabled={
                                                    (isUploading || isUploadingAudio) ||
                                                    !isValidForCreation()
                                                }
                                                className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all duration-200"
                                            >
                                                {isUploadingAudio ? (
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Send size={12} />
                                                )}
                                            </Button>
                                        )}
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            </div>

            {/* Upgrade Dialog */}
            <UpgradeDialog
                open={showUpgradeDialog}
                onOpenChange={setShowUpgradeDialog}
                reason="ai"
            />
        </div>
    );
}

export default memo(PasteBin);
