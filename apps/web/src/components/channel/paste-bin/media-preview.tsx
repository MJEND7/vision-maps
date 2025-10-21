import { motion } from "motion/react";
import Image from "next/image";
import { Media } from "@/types/pastebin-component";
import { NodeVariants } from "@convex/tables/nodes";
import { AudioPlayer } from "../audio-player";
import { VideoPlayer } from "../video-player";
import { FilePreview } from "../file-preview";

interface MediaPreviewProps {
    media: Media;
    isUploading: boolean;
    imageLoaded: boolean;
    onImageLoad: () => void;
    onImageError: () => void;
}

export function MediaPreview({
    media,
    isUploading,
    imageLoaded,
    onImageLoad,
    onImageError,
}: MediaPreviewProps) {
    return (
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
                                onLoad={onImageLoad}
                                onError={onImageError}
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
    );
}
