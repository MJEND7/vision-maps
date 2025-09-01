import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AudioPlayer } from "./audio-player";
import { VideoPlayer } from "./video-player";
import { FilePreview } from "./file-preview";
import { useUploadThing } from "@/utils/uploadthing";
import { X, FileText, Send } from "lucide-react";
import Image from "next/image";

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

interface LinkMeta {
    title?: string;
    description?: string;
    image?: string;
    url: string;
}

export default function PasteBin() {
    const [mediaItem, setMediaItem] = useState<MediaItem | null>(null);
    const [linkMeta, setLinkMeta] = useState<LinkMeta | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [customName, setCustomName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const fetchLinkMetadata = async (url: string): Promise<LinkMeta> => {
        try {
            const response = await fetch(`https://api.linkpreview.net/?key=YOUR_API_KEY&q=${encodeURIComponent(url)}`);
            const data = await response.json();
            return {
                title: data.title || new URL(url).hostname,
                description: data.description || "",
                image: data.image || "",
                url
            };
        } catch {
            return {
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
    };

    const handleLinkPaste = async (url: string) => {
        setMediaItem(null);
        setLinkMeta({ url, title: "Loading..." });

        const meta = await fetchLinkMetadata(url);
        setLinkMeta(meta);
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
        setCustomName("");
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

        clearMedia();
    };

    const isValidForCreation = () => {
        if (mediaItem && mediaItem.type !== "link") {
            const finalName = customName.trim() || mediaItem.fileName;
            return !!finalName && !mediaItem.isUploading;
        }
        return !!linkMeta;
    };

    const getDisplayName = () => {
        if (mediaItem) {
            return customName.trim() || mediaItem.fileName || "Unnamed file";
        }
        if (linkMeta) {
            return linkMeta.title || "Unnamed link";
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
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-end justify-center"
                    animate={{
                        width: linkMeta || mediaItem ? "100%" : isDragOver ? "100%" : "10rem",
                        height: linkMeta || mediaItem ? "20rem" : isDragOver ? "8rem" : "2rem",
                        opacity: linkMeta || mediaItem ? 1 : isDragOver ? 1 : 0.8,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        mass: 0.8,
                    }}
                >
                    <motion.div
                        className="w-full h-full overflow-hidden rounded-xl shadow-md border border-accent bg-background flex flex-col"
                        animate={{
                            padding: linkMeta || mediaItem || isDragOver ? "0px" : "4px",
                            alignItems: linkMeta || mediaItem || isDragOver ? "stretch" : "center",
                            justifyContent: linkMeta || mediaItem || isDragOver ? "flex-start" : "center",
                            backgroundColor: isDragOver ? "hsl(var(--primary) / 0.05)" : "hsl(var(--background))",
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {isDragOver ? (
                                <motion.div
                                    key="dragover"
                                    className="p-8 text-center"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <span className="text-sm text-muted-foreground">
                                        Drop here to upload
                                    </span>
                                </motion.div>
                            ) : !linkMeta && !mediaItem ? (
                                <motion.span
                                    key="helper"
                                    className="text-[10px] text-muted-foreground font-medium flex items-center justify-center"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    Press{" "}
                                    <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">Ctrl</kbd> +{" "}
                                    <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">V</kbd> to
                                    paste
                                </motion.span>
                            ) : mediaItem ? (
                                <motion.div
                                    key="media"
                                    className="p-3"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
                                >
                                    {mediaItem.isUploading && (
                                        <div className="mb-2 text-xs text-muted-foreground">
                                            Uploading...
                                        </div>
                                    )}

                                    {mediaItem.type === "image" && (
                                        <div className="relative mb-3">
                                            <Image
                                                src={mediaItem.uploadedUrl || mediaItem.url!}
                                                alt={mediaItem.fileName || "Pasted image"}
                                                width={400}
                                                height={200}
                                                className="w-full h-48 object-cover rounded"
                                            />
                                        </div>
                                    )}

                                    {mediaItem.type === "audio" && (
                                        <div className="mb-3">
                                            <AudioPlayer
                                                src={mediaItem.uploadedUrl || mediaItem.url!}
                                                title={mediaItem.customName || mediaItem.fileName}
                                            />
                                        </div>
                                    )}

                                    {mediaItem.type === "video" && (
                                        <div className="mb-3">
                                            <VideoPlayer
                                                src={mediaItem.uploadedUrl || mediaItem.url!}
                                                title={mediaItem.customName || mediaItem.fileName}
                                            />
                                        </div>
                                    )}

                                    {mediaItem.type === "file" && (
                                        <div className="mb-3">
                                            <FilePreview
                                                fileName={mediaItem.customName || mediaItem.fileName!}
                                                fileSize={mediaItem.fileSize}
                                                fileType={mediaItem.fileType}
                                                downloadUrl={mediaItem.uploadedUrl}
                                            />
                                        </div>
                                    )}

                                    {shouldShowNameInput() && (
                                        <div className="mb-3">
                                            <Input
                                                placeholder="Enter a name for this media..."
                                                value={customName}
                                                onChange={(e) => setCustomName(e.target.value)}
                                                className="text-sm"
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            ) : linkMeta ? (
                                <motion.div
                                    key="link"
                                    className="p-3"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
                                >
                                    {linkMeta.image && (
                                        <div className="mb-3">
                                            <img
                                                src={linkMeta.image}
                                                alt={linkMeta.title}
                                                className="w-full h-32 object-cover rounded"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-foreground">{linkMeta.title}</h3>
                                        {linkMeta.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                {linkMeta.description}
                                            </p>
                                        )}
                                        <a
                                            href={linkMeta.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-500 hover:underline mt-2 inline-block"
                                        >
                                            {linkMeta.url}
                                        </a>
                                    </div>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>

                {/* Input/Controls at bottom */}
                <div className="relative h-11">
                    <AnimatePresence mode="wait">
                        {mediaItem || linkMeta ? (
                            <motion.div
                                key="controls"
                                className="h-11 flex items-center justify-between bg-background border rounded-full px-3 py-2"
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
