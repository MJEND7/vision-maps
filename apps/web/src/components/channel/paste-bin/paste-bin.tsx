"use client"

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "../../ui/input";
import { useUploadThing } from "@/utils/uploadthing";
import { ChatCard, LinkMetadata } from "../metadata";
import { usePasteBinState } from "@/lib/paste-bin-state";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { CreateNodeArgs } from "@convex/nodes";
import { NodeVariants } from "@convex/tables/nodes";
import { useOGMetadataWithCache } from "@/utils/ogMetadata";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Permission } from "@/lib/permissions";
import { useRealtimeTranscription } from "@/hooks/pastebin/useRealtimeTranscription";
import { toast } from "sonner";
import { convertToWav, stitchAudioBlobs } from "@/utils/audio";
import { ApiRoutes } from "@/constants/apiRoutes";
import usePasteBin from "@/hooks/pastebin/usePasteBin";
import { PasteBinMode, Media } from "@/types/pastebin-component";
import { useTranscriptionState } from "@/hooks/pastebin/useTranscriptionState";
// UI Sub-components
import { IdleStateHelper } from "./idle-state-helper";
import { DragOverHint } from "./drag-over-hint";
import { MediaPreview } from "./media-preview";
import { EmbedPreview } from "./embed-preview";
import { TranscriptionPanel } from "./transcription-panel";
import { LoadingSkeleton } from "./loading-skeleton";
import { InputControls } from "./input-controls";
import { ActionButtons } from "./action-buttons";

function PasteBin({ onCreateNode, onShowUpgradeDialog, channelId, visionId }: {
    onCreateNode: (data: CreateNodeArgs) => void,
    onShowUpgradeDialog: (show: boolean) => void,
    channelId: string,
    visionId: string
}) {
    // State management with reducer
    const { state, actions } = usePasteBinState();
    const { isDragOver, isLoadingLinkMeta, imageLoaded } = state;

    // Transcription state hook
    const {
        transcriptChunks,
        recordedAudioBlob,
        previousAudioBlobs,
        selectedDeviceId,
        addChunk,
        setRecordedAudioBlob,
        addPreviousAudioBlob,
        setSelectedDeviceId,
        clearAll: clearTranscriptionState
    } = useTranscriptionState();

    // Component state
    const [drivenMessageIds, setDrivenMessageIds] = useState<Set<string>>(new Set())
    const transcriptDebounce = useRef<NodeJS.Timeout | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { hasPermission } = usePermissions();
    const canUseAI = hasPermission(Permission.AI_NODES);

    const createChat = useMutation(api.chats.createChat);
    const sendMessage = useMutation(api.messages.sendMessage);
    const deleteChat = useMutation(api.chats.deleteChat);

    const {
        save: savePasteBinToDb,
        clear: clearPasteBin,
        mode,
        setMode,
        saveDebounce,
        pasteBin: pasteBinData
    } = usePasteBin(visionId);

    // Use the reusable OG metadata hook
    const { fetchWithCache } = useOGMetadataWithCache();

    // Real-time transcription hook
    const {
        isRecording,
        isConnecting,
        startRecording,
        stopRecording,
        clearTranscript,
    } = useRealtimeTranscription({
        onTranscript: (text, timestamp) => {
            const newChunk = { text, timestamp };
            addChunk(newChunk);
            if (transcriptDebounce.current) {
                clearTimeout(transcriptDebounce.current)
            }

            if (transcriptContainerRef.current) {
                transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
            }

            transcriptDebounce.current = setTimeout(() => {
                savePasteBinToDb(NodeVariants.Transcription, { transcription: transcriptChunks })
            }, 1000)
        },
        onError: (error) => {
            console.error('Transcription error:', error);
        },
    });

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

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (transcriptDebounce.current) {
                clearTimeout(transcriptDebounce.current);
            }
        };
    }, []);

    const updateMedia = (mediaItem: Media | null) => {
        if (!mediaItem) {
            toast.error("Failed to get any media")
            return
        }

        savePasteBinToDb(mediaItem.type, {
            media: mediaItem,
            thought: pasteBinData.thought,
        });
    };

    const updateTextContent = (content: string) => {
        savePasteBinToDb(NodeVariants.Text, {
            text: content,
        });
    };

    const updateChatId = (chatIdValue: string) => {
        savePasteBinToDb(NodeVariants.AI, {
            chatId: chatIdValue,
            thought: pasteBinData.thought,
        });
    };

    const newChat = useCallback(async (title: string) => {
        const chatId = await createChat({
            title,
            visionId: visionId as Id<"visions">,
            channelId: channelId as Id<"channels">
        });

        if (!chatId) {
            toast.error("Failed to get the chat")
            return
        }

        updateChatId(chatId);

        return chatId
    }, [createChat, updateChatId, visionId, channelId]);

    const { startUpload, isUploading } = useUploadThing("mediaUploader", {
        onClientUploadComplete: (res) => {
            console.log("UPLOAD THING: ", res)
            if (res && res[0]) {
                const currentMedia = pasteBinData.media;
                if (currentMedia) {
                    if (currentMedia.url && currentMedia.url.startsWith('blob:')) {
                        URL.revokeObjectURL(currentMedia.url);
                    }
                    const updatedMedia = {
                        ...currentMedia,
                        uploadedUrl: res[0].ufsUrl,
                        url: res[0].ufsUrl, // Update the url to the uploaded version
                    };
                    updateMedia(updatedMedia);
                }
            }
        },
        onUploadError: (error: Error) => {
            console.error("Upload failed:", error);
            const currentMedia = pasteBinData.media;
            if (currentMedia) {
                const updatedMedia = { ...currentMedia };
                updateMedia(updatedMedia);
            }
        },
    });

    const determineMediaType = (file: File): NodeVariants => {
        const type = file.type;
        if (type.startsWith("image/")) return NodeVariants.Image;
        if (type.startsWith("audio/")) return NodeVariants.Audio;
        if (type.startsWith("video/")) return NodeVariants.Video;
        return NodeVariants.Link;
    };

    const detectLinkType = useCallback((url: string): NodeVariants => {
        try {
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
        try {
            if (!url || typeof url !== 'string' || url.trim() === '') {
                throw new Error('Invalid URL provided to fetchLinkMetadata');
            }

            const result = await fetchWithCache(url);
            return {
                ...result.metadata,
                type: result.type
            };
        } catch (error) {
            console.error('Error fetching metadata:', error);
            const fallbackType = detectLinkType(url);

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

        startUpload([file]);
    }, [actions, startUpload, setMode, updateMedia]);

    const handleLinkPaste = useCallback(async (url: string) => {
        if (!url || typeof url !== 'string' || url.trim() === '') {
            console.error('Invalid URL provided to handleLinkPaste:', url);
            return;
        }

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
            updateMedia({
                type: meta.type as NodeVariants,
                title: meta.title,
                description: meta.description,
                url: url,  // Use the original URL, not meta.url
                image: meta.image,
                siteName: meta.siteName,
            });
        } catch (error) {
            console.error('Failed to fetch link metadata:', error);
        } finally {
            actions.setLoadingLinkMeta(false);
        }
    }, [actions, updateMedia, fetchLinkMetadata]);

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const clipboardData = e.clipboardData;
        const files = Array.from(clipboardData.files);

        const text = clipboardData.getData("text/plain") || clipboardData.getData("text") || clipboardData.getData("text/uri-list");

        if (files.length > 0) {
            e.preventDefault();
            handleFileSelect(files[0]);
        } else if (text && typeof text === 'string' && text.trim() && (text.trim().startsWith("http://") || text.trim().startsWith("https://"))) {
            e.preventDefault();
            const cleanUrl = text.trim();
            console.log('Processing URL:', cleanUrl);
            handleLinkPaste(cleanUrl);
        }
    }, [handleFileSelect, handleLinkPaste, updateTextContent]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        updateTextContent(value);
        if (mode === PasteBinMode.IDLE) {
            setMode(PasteBinMode.TEXT)
        }
    }, [updateTextContent, mode, setMode]);

    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && pasteBinData.text) {
            updateTextContent("\n")
        }
    }, [pasteBinData.text, updateTextContent]);

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
        if (!pasteBinData.text) return;
        const data = await sendMessage({ content: pasteBinData.text, chatId: chatId as Id<"chats"> })
        setDrivenMessageIds((s) => s.add(data.messageId))
        updateTextContent("")
    }, [sendMessage, pasteBinData.text, updateTextContent]);

    const handleToggleAiMode = useCallback(async () => {
        if (!canUseAI) {
            onShowUpgradeDialog(true);
            return;
        }

        if (mode !== PasteBinMode.IDLE) return

        await newChat("New Chat");
        setMode(PasteBinMode.AI);
    }, [mode, pasteBinData.text, newChat, handleSendMessage, updateTextContent, setMode, updateChatId, canUseAI, onShowUpgradeDialog]);

    const [isUploadingAudio, setIsUploadingAudio] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);


    const handleStopRecording = useCallback(async () => {
        setIsStopping(true);
        try {
            const audioBlob = await stopRecording();
            if (audioBlob) {
                addPreviousAudioBlob(audioBlob);
                setRecordedAudioBlob(audioBlob);
                console.log('[PasteBin] Audio blob captured:', audioBlob.size, 'bytes');
            }
        } finally {
            setIsStopping(false);
        }
    }, [stopRecording, addPreviousAudioBlob, setRecordedAudioBlob]);

    const clearMedia = useCallback(async (deleteUnusedChat = true) => {
        if (isRecording) {
            await stopRecording();
        }

        if (pasteBinData.media && pasteBinData.media.uploadedUrl && deleteUnusedChat) {
            try {
                const response = await fetch(ApiRoutes.UPLOADTHING_DELETE, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fileUrl: pasteBinData.media.uploadedUrl }),
                });

                if (!response.ok) {
                    console.error('Failed to delete uploaded file:', response.statusText);
                }
            } catch (error) {
                console.error('Error deleting uploaded file:', error);
            }
        }

        console.log(pasteBinData)
        if (pasteBinData.chatId && deleteUnusedChat) {
            try {
                console.log("Deleting chat:", pasteBinData.chatId);
                await deleteChat({ chatId: pasteBinData.chatId as Id<"chats"> });
                console.log("Chat deleted successfully");
            } catch (error) {
                console.error("Failed to delete unused chat:", error);
                toast.error("Failed to delete chat");
            }
        }

        clearPasteBin();
        clearTranscript();
        clearTranscriptionState();

        // Clear timers
        if (saveDebounce.current) {
            clearTimeout(saveDebounce.current);
            saveDebounce.current = null;
        }

        if (transcriptDebounce.current) {
            clearTimeout(transcriptDebounce.current);
            transcriptDebounce.current = null;
        }

        actions.resetState();

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [pasteBinData, actions, clearTranscriptionState, deleteChat, isRecording, stopRecording, clearTranscript, clearPasteBin, saveDebounce, transcriptDebounce]);

    const handleCreate = useCallback(async () => {
        if (saveDebounce.current) {
            clearTimeout(saveDebounce.current);
        }

        const node = async () => {
            const media = pasteBinData.media
            switch (mode) {
                case PasteBinMode.MEDIA:
                    if (!media || !media.file || !media.uploadedUrl) {
                        toast.error("No media found")
                        break;
                    }
                    if (isUploading) {
                        toast.loading("Uploading your media")
                        console.log("Upload in progress, please wait...");
                        break;
                    }

                    const url = media.uploadedUrl;
                    if (!url && media.file) {
                        console.log("No uploaded URL available, upload may have failed");
                        return;
                    }

                    onCreateNode({
                        title: media.fileName || media.title || `A ${media.type} Node`,
                        variant: media.type,
                        value: url || media.url || '',
                        thought: pasteBinData.text,
                        channel: channelId as Id<"channels">,
                    })
                    break;
                case PasteBinMode.EMBED:
                    if (!media || !media.url) {
                        toast.error("No media found")
                        break;
                    }
                    onCreateNode({
                        title: media.title || 'Untitled',
                        variant: media.type,
                        value: media.url,
                        thought: pasteBinData.text,
                        channel: channelId as Id<"channels">,
                    })
                    return;

                case PasteBinMode.TRANSCRIPTION:
                    const chunks = transcriptChunks.length > 0 ? transcriptChunks : (pasteBinData?.transcription || []);
                    const transcriptValue = chunks.map(c => c.text).join(' ');
                    if (!transcriptValue) {
                        toast.error("Failed to find any transcriptions")
                        break;
                    };
                    let audioUrl: string | undefined;

                    if (recordedAudioBlob) {
                        const toastId = toast.loading('Converting and uploading recording...');
                        setIsUploadingAudio(true);
                        try {
                            let finalAudioBlob: Blob;
                            if (previousAudioBlobs.length > 1) {
                                toast.loading('Stitching audio recordings...', { id: toastId });
                                finalAudioBlob = await stitchAudioBlobs(previousAudioBlobs);
                            } else {
                                finalAudioBlob = recordedAudioBlob;
                            }

                            const wavBlob = await convertToWav(finalAudioBlob);

                            const maxSize = 16 * 1024 * 1024;
                            if (wavBlob.size > maxSize) {
                                throw new Error(`Audio file is too large (${(wavBlob.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 16MB. Try recording for a shorter duration.`);
                            }

                            const audioFile = new File(
                                [wavBlob],
                                `transcription-${Date.now()}.wav`,
                                { type: 'audio/wav' }
                            );

                            toast.loading('Uploading recording...', { id: toastId });
                            const uploadResult = await Promise.race([
                                startUpload([audioFile]),
                                new Promise<null>((_, reject) =>
                                    setTimeout(() => reject(new Error('Upload timeout after 60s')), 60000)
                                )
                            ]);

                            if (uploadResult && uploadResult[0]) {
                                audioUrl = uploadResult[0].ufsUrl;
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

                    onCreateNode({
                        title: "Transcription",
                        variant: NodeVariants.Transcription,
                        value: JSON.stringify(chunks),
                        thought: "",
                        audioUrl,
                        channel: channelId as Id<"channels">,
                    });
                    break;

                case PasteBinMode.TEXT:
                    if (!pasteBinData.text) {
                        toast.error("Failed to find any text")
                        break;
                    };
                    onCreateNode({
                        title: "",
                        variant: NodeVariants.Text,
                        value: pasteBinData.text,
                        channel: channelId as Id<"channels">,
                    })
                    break;
                case PasteBinMode.AI:
                    if (!pasteBinData.chatId) {
                        toast.error("Failed to find any chat")
                        break;
                    };
                    onCreateNode({
                        title: "",
                        variant: NodeVariants.AI,
                        value: pasteBinData.chatId,
                        channel: channelId as Id<"channels">,
                    })
                    break;
            }
        }

        await node();
        await clearMedia(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pasteBinData, clearMedia, onCreateNode, isUploading, mode, transcriptChunks, pasteBinData]);

    const isValidForCreation = useCallback(() => {
        if (mode === PasteBinMode.TRANSCRIPTION) {
            const chunks = transcriptChunks.length > 0 ? transcriptChunks : (pasteBinData?.transcription || []);
            const transcriptValue = chunks.map(c => c.text).join(' ');
            return !isRecording && !!transcriptValue && transcriptValue.trim().length > 0;
        }

        if (pasteBinData.media) {
            if (pasteBinData.media.type === NodeVariants.Text || pasteBinData.media.type === NodeVariants.AI) {
                return !!pasteBinData.media.customName || !!pasteBinData.media.title;
            } else if (pasteBinData.media.file) {
                return !!pasteBinData.media.fileName && !isUploading && !!pasteBinData.media.uploadedUrl;
            } else if (pasteBinData.media.url) {
                return !isLoadingLinkMeta;
            }
        }
        return (mode === PasteBinMode.TEXT || mode === PasteBinMode.AI);
    }, [pasteBinData.media, isLoadingLinkMeta, pasteBinData.text, isUploading, mode, isRecording, transcriptChunks, pasteBinData]);

    return (
        <div
            className={`absolute z-[10] inset-x-0 bottom-10 w-full max-w-xs sm:max-w-lg mx-auto`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="relative">
                {/* Floating helper / metadata container - hide in TEXT mode */}
                {mode !== PasteBinMode.TEXT && (
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
                                    {isDragOver && <DragOverHint key="dragover-hint" />}

                                    {mode === PasteBinMode.IDLE && !isDragOver && (
                                        <IdleStateHelper key="idle-helper" isDragOver={isDragOver} />
                                    )}

                                    {pasteBinData.media && (pasteBinData.media.file || pasteBinData.media.uploadedUrl) && (
                                        <MediaPreview
                                            key="media-preview"
                                            media={pasteBinData.media}
                                            isUploading={isUploading}
                                            imageLoaded={imageLoaded}
                                            onImageLoad={() => actions.setImageLoaded(true)}
                                            onImageError={() => actions.setImageLoaded(true)}
                                        />
                                    )}

                                    {mode === PasteBinMode.AI && pasteBinData.chatId && (
                                        <div key="ai-chat" className="h-[400px] w-full p-4 overflow-hidden">
                                            <ChatCard drivenIds={drivenMessageIds} onFocusInput={() => {
                                                textareaRef.current?.focus();
                                            }} chatId={pasteBinData.chatId} />
                                        </div>
                                    )}

                                    {mode === PasteBinMode.TRANSCRIPTION && (
                                        <TranscriptionPanel
                                            key="transcription-panel"
                                            isRecording={isRecording}
                                            isConnecting={isConnecting}
                                            transcriptChunks={transcriptChunks}
                                            transcriptContainerRef={transcriptContainerRef}
                                            onContinueRecording={async () => {
                                                if (selectedDeviceId) {
                                                    await startRecording('device', selectedDeviceId);
                                                } else {
                                                    await startRecording('microphone');
                                                }
                                            }}
                                        />
                                    )}

                                    {isLoadingLinkMeta && <LoadingSkeleton key="loading-skeleton" />}

                                    {pasteBinData.media && pasteBinData.media.url && !pasteBinData.media.file && (
                                        <EmbedPreview
                                            key="embed-preview"
                                            media={pasteBinData.media}
                                            mediaToLinkMetadata={mediaToLinkMetadata}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        multiple={false}
                    />

                    <InputControls
                        ref={textareaRef}
                        fileInputRef={fileInputRef}
                        mode={mode}
                        value={pasteBinData.text}
                        placeholder={
                            mode !== PasteBinMode.IDLE
                                ? mode === PasteBinMode.AI ? "Type you message here..." : `Type your thought here...`
                                : "Enter media..."
                        }
                        onChange={(e) => {
                            if (e.target.value === "") {
                                clearPasteBin()
                            } else {
                                handleInputChange(e);
                            }
                        }}
                        onKeyDown={async (e) => {
                            if (!pasteBinData.text) return
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (mode === PasteBinMode.AI && pasteBinData.chatId) {
                                    handleSendMessage(pasteBinData.chatId);
                                } else if (mode === PasteBinMode.TEXT) {
                                    handleCreate();
                                }
                            } else if (e.key === "Enter" && e.shiftKey) {
                                e.preventDefault();
                                handleInputKeyDown(e)
                            }
                        }}
                        onPaste={mode === PasteBinMode.IDLE ? handlePaste : undefined}
                        onMicrophoneSelect={async () => {
                            try {
                                setSelectedDeviceId(undefined);
                                await startRecording('microphone');
                                setMode(PasteBinMode.TRANSCRIPTION);
                            } catch (error) {
                                console.error('Failed to start recording:', error);
                                const errorMessage = error instanceof Error ? error.message : 'Failed to start microphone recording';
                                toast.error(errorMessage, { duration: 5000 });
                            }
                        }}
                        onDeviceSelect={async (deviceId: string) => {
                            try {
                                setSelectedDeviceId(deviceId);
                                await startRecording('device', deviceId);
                                setMode(PasteBinMode.TRANSCRIPTION);
                            } catch (error) {
                                console.error('Failed to start recording:', error);
                                const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
                                toast.error(errorMessage, { duration: 5000 });
                            }
                        }}
                        onFileSelect={() => fileInputRef.current?.click()}
                        onStartPrompt={handleToggleAiMode}
                    />

                    <ActionButtons
                        mode={mode}
                        isRecording={isRecording}
                        isConnecting={isConnecting}
                        isStopping={isStopping}
                        isUploading={isUploading}
                        isUploadingAudio={isUploadingAudio}
                        isValidForCreation={isValidForCreation()}
                        onClose={async () => { await clearMedia() }}
                        onCreate={handleCreate}
                        onStopRecording={handleStopRecording}
                    />
                </motion.div>
            </div>
        </div>
    );
}

export default memo(PasteBin);
