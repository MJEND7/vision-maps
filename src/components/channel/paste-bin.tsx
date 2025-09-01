import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AudioPlayer } from "./audio-player";
import { VideoPlayer } from "./video-player";
import { FilePreview } from "./file-preview";
import { useUploadThing } from "@/utils/uploadthing";
import { X, FileText, Send } from "lucide-react";
import Image from "next/image";
import { GitHubCard, FigmaCard, YouTubeCard, TwitterCard, NotionCard, WebsiteCard, SkeletonCard, LinkMetadata } from "./metadata";

type MediaType = "image" | "audio" | "video" | "file" | "link";

interface MediaItem {
    type: MediaType;
    file?: File;
    url?: string;
    isUploading?: boolean;
    uploadedUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    customName?: string;
}

interface LinkMeta extends LinkMetadata { }

export default function PasteBin() {
    const [mediaItem, setMediaItem] = useState<MediaItem | null>(null);
    const [linkMeta, setLinkMeta] = useState<LinkMeta | null>(null);
    const [isLoadingLinkMeta, setIsLoadingLinkMeta] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [customName, setCustomName] = useState("");
    const [imageLoaded, setImageLoaded] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load saved data from localStorage on mount
    useEffect(() => {
        const savedInputValue = localStorage.getItem('paste-bin-input');
        if (savedInputValue) {
            setInputValue(savedInputValue);
        }

        // Load saved media/link data
        const savedMediaItem = localStorage.getItem('paste-bin-media');
        const savedLinkMeta = localStorage.getItem('paste-bin-link-meta');
        const savedCustomName = localStorage.getItem('paste-bin-custom-name');

        if (savedMediaItem) {
            try {
                const parsedMedia = JSON.parse(savedMediaItem);
                // Don't restore File objects as they can't be serialized
                if (parsedMedia.type !== 'file' || parsedMedia.uploadedUrl) {
                    setMediaItem(parsedMedia);
                    if (parsedMedia.type === 'image') {
                        setImageLoaded(true); // Assume previously loaded images are ready
                    }
                }
            } catch (error) {
                console.error('Error parsing saved media:', error);
                localStorage.removeItem('paste-bin-media');
            }
        }

        if (savedLinkMeta) {
            try {
                const parsedLinkMeta = JSON.parse(savedLinkMeta);
                setLinkMeta(parsedLinkMeta);
            } catch (error) {
                console.error('Error parsing saved link meta:', error);
                localStorage.removeItem('paste-bin-link-meta');
            }
        }

        if (savedCustomName) {
            setCustomName(savedCustomName);
        }
    }, []);

    // Save input value to localStorage when it changes
    useEffect(() => {
        if (inputValue) {
            localStorage.setItem('paste-bin-input', inputValue);
        } else {
            localStorage.removeItem('paste-bin-input');
        }
    }, [inputValue]);

    // Save media item to localStorage when it changes
    useEffect(() => {
        if (mediaItem) {
            // Create a serializable version without File object
            const serializableMediaItem = {
                ...mediaItem,
                file: undefined, // Remove File object as it can't be serialized
            };
            localStorage.setItem('paste-bin-media', JSON.stringify(serializableMediaItem));
        } else {
            localStorage.removeItem('paste-bin-media');
        }
    }, [mediaItem]);

    // Save link meta to localStorage when it changes
    useEffect(() => {
        if (linkMeta) {
            localStorage.setItem('paste-bin-link-meta', JSON.stringify(linkMeta));
        } else {
            localStorage.removeItem('paste-bin-link-meta');
        }
    }, [linkMeta]);

    // Save custom name to localStorage when it changes
    useEffect(() => {
        if (customName) {
            localStorage.setItem('paste-bin-custom-name', customName);
        } else {
            localStorage.removeItem('paste-bin-custom-name');
        }
    }, [customName]);

    const { startUpload, isUploading } = useUploadThing("mediaUploader", {
        onClientUploadComplete: (res) => {
            if (res && res[0]) {
                setMediaItem(prev => prev ? { ...prev, uploadedUrl: res[0].ufsUrl, isUploading: false } : null);
            }
        },
        onUploadError: (error: Error) => {
            console.error("Upload failed:", error);
            setMediaItem(prev => prev ? { ...prev, isUploading: false } : null);
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
            if (hostname.includes('instagram.com')) return 'Instagram';
            if (hostname.includes('tiktok.com')) return 'TikTok';
            if (hostname.includes('spotify.com')) return 'Spotify';

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



    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const clipboardData = e.clipboardData;
        const files = Array.from(clipboardData.files);
        const text = clipboardData.getData("text");

        if (files.length > 0) {
            handleFileSelect(files[0]);
        } else if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
            handleLinkPaste(text);
            setInputValue("");  // Clear input after pasting link
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        
        // Auto-detect and handle URLs when user types/pastes
        if (value && (value.startsWith("http://") || value.startsWith("https://"))) {
            handleLinkPaste(value);
            setInputValue("");  // Clear input after processing link
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue) {
            if (inputValue.startsWith("http://") || inputValue.startsWith("https://")) {
                handleLinkPaste(inputValue);
                setInputValue("");
            }
        }
    };

    const handleFileSelect = (file: File) => {
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

        setMediaItem(newMediaItem);
        setLinkMeta(null);
        setCustomName("");
        setImageLoaded(false);
    };

    const handleLinkPaste = async (url: string) => {
        setMediaItem(null);
        setLinkMeta(null);
        setIsLoadingLinkMeta(true);

        try {
            const meta = await fetchLinkMetadata(url);
            setLinkMeta(meta);
        } catch (error) {
            console.error('Failed to fetch link metadata:', error);
        } finally {
            setIsLoadingLinkMeta(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const clearMedia = () => {
        setMediaItem(null);
        setLinkMeta(null);
        setIsLoadingLinkMeta(false);
        setCustomName("");
        setImageLoaded(false);
        setInputValue("");
        
        // Clear all localStorage data
        localStorage.removeItem('paste-bin-media');
        localStorage.removeItem('paste-bin-link-meta');
        localStorage.removeItem('paste-bin-custom-name');
        localStorage.removeItem('paste-bin-input');
        
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCreate = async () => {
        if (mediaItem) {
            const finalName = customName.trim() || mediaItem.fileName;

            if (!finalName && mediaItem.type !== "link") {
                alert("Please provide a name for this media");
                return;
            }

            if (mediaItem.file) {
                setMediaItem(prev => prev ? { ...prev, isUploading: true, customName: finalName } : null);
                await startUpload([mediaItem.file]);
            }
        }

        if (linkMeta) {
            console.log("Creating link:", linkMeta);
        }

        // Clear all data and localStorage after successful creation
        clearMedia();
    };

    const isValidForCreation = () => {
        if (mediaItem && mediaItem.type !== "link") {
            const finalName = customName.trim() || mediaItem.fileName;
            return !!finalName && !mediaItem.isUploading;
        }
        return !!linkMeta && !isLoadingLinkMeta;
    };

    const getDisplayName = () => {
        if (mediaItem) {
            return customName.trim() || mediaItem.fileName || "Unnamed file";
        }
        if (linkMeta) {
            return linkMeta.title || "Unnamed link";
        }
        if (isLoadingLinkMeta) {
            return "Loading metadata...";
        }
        return "";
    };

    const shouldShowNameInput = () => {
        return mediaItem && (!mediaItem.fileName || customName !== "");
    };

    return (
        <div
            className="absolute bottom-0 w-full max-w-lg mx-auto"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="relative">
                {/* Floating helper / metadata container */}
                <motion.div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 will-change-transform"
                    animate={{
                        width: linkMeta || mediaItem || isLoadingLinkMeta ? "100%" : isDragOver ? "100%" : "10rem",
                        opacity: linkMeta || mediaItem || isLoadingLinkMeta ? 1 : isDragOver ? 1 : 0.8,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 35,
                        mass: 0.9,
                    }}
                >
                    <motion.div
                        className="w-full overflow-hidden rounded-2xl shadow-md border border-accent bg-background backdrop-blur-sm"
                        animate={{
                            height: linkMeta || mediaItem || isLoadingLinkMeta ? "auto" : isDragOver ? "8rem" : "2rem",
                            padding: linkMeta || mediaItem || isLoadingLinkMeta || isDragOver ? "0px" : "4px",
                            backgroundColor: isDragOver ? "hsl(var(--primary) / 0.05)" : "hsl(var(--background))",
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 280,
                            damping: 30,
                            mass: 1.0,
                        }}
                        style={{ minHeight: linkMeta || mediaItem || isLoadingLinkMeta ? "auto" : isDragOver ? "8rem" : "2rem" }}
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

                                {!linkMeta && !mediaItem && !isLoadingLinkMeta && !isDragOver && (
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
                                            className="p-4 space-y-4"
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
                                                        onLoad={() => setImageLoaded(true)}
                                                        onError={() => setImageLoaded(true)}
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
                                        </div>

                                        {shouldShowNameInput() && (
                                            <div className="w-full max-w-sm mx-auto">
                                                <Input
                                                    placeholder="Enter a name for this media..."
                                                    value={customName}
                                                    onChange={(e) => setCustomName(e.target.value)}
                                                    className="text-sm"
                                                />
                                            </div>
                                        )}
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
                                                {(linkMeta.type === 'Link' || !['GitHub', 'Figma', 'YouTube', 'Twitter', 'Notion'].includes(linkMeta.type)) &&
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
                <div className="relative h-11">
                    <AnimatePresence mode="wait">
                        {mediaItem || linkMeta || isLoadingLinkMeta ? (
                            <motion.div
                                key="controls"
                                className="h-11 flex items-center justify-between bg-background border shadow-sm hover:shadow-lg transition-all ease-in-out rounded-full px-3 py-2"
                            >
                                <motion.span
                                    className="text-sm text-muted-foreground truncate flex-1 mr-3"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    {getDisplayName()}
                                </motion.span>
                                <motion.div
                                    className="flex items-center gap-2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearMedia}
                                        className="h-7 w-7 p-0"
                                    >
                                        <X size={14} />
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleCreate}
                                        disabled={!isValidForCreation()}
                                        className="h-7 px-3 rounded-xl"
                                    >
                                        <Send size={12} />
                                    </Button>
                                </motion.div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="input"
                            >
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                    multiple={false}
                                />
                                <div className="relative">
                                    <Input
                                        className="h-11 pr-16 rounded-full shadow-sm hover:shadow-lg transition-all duration-200"
                                        placeholder="Paste Media / Ctrl + V"
                                        value={inputValue}
                                        onChange={handleInputChange}
                                        onKeyDown={handleInputKeyDown}
                                        onPaste={handlePaste}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 h-7 rounded-xl px-2 text-xs"
                                    >
                                        <FileText size={12} />
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
