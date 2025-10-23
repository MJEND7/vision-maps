import { useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { FigmaMetadata } from "@/types/metadata";
import Image from "next/image";

interface FigmaCardProps {
    metadata: FigmaMetadata;
}

// Utility function to convert Figma URLs to embed URLs
const getFigmaEmbedUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/(file|design|proto)\/([a-zA-Z0-9]+)/);
        if (pathMatch) {
            return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(
                url
            )}`;
        }
        return null;
    } catch (error) {
        console.error("Error parsing Figma URL:", error);
        return null;
    }
};

export function FigmaCard({ metadata }: FigmaCardProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const embedUrl = getFigmaEmbedUrl(metadata.url);

    // fallback card if no embed
    if (!embedUrl || hasError) {
        return (
            <motion.div
                className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        {/* Clean Figma logo */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 256 384"
                            className="w-5 h-5"
                        >
                            <path fill="#0ACF83" d="M128 192a64 64 0 1 0 0 128 64 64 0 0 0 0-128Z" />
                            <path fill="#A259FF" d="M64 128a64 64 0 1 1 128 0H64Z" />
                            <path fill="#F24E1E" d="M64 0h64a64 64 0 0 1 0 128H64V0Z" />
                            <path fill="#FF7262" d="M64 128h64a64 64 0 0 1 0 128H64V128Z" />
                            <path fill="#1ABCFE" d="M128 0h64a64 64 0 0 1 0 128h-64V0Z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">Figma</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                        {metadata.title || "Figma Design"}
                    </h3>
                    {metadata.description && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                            {metadata.description}
                        </p>
                    )}
                    <a
                        href={metadata.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 text-xs font-medium"
                    >
                        Open in Figma <ExternalLink size={12} />
                    </a>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white">
                <div className="flex items-center ">
                    {/* Compact Figma logo */}
                    <svg width="25" height="25" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M97.5 302.5C97.5 274.195 120.445 251.25 148.75 251.25H200V302.5C200 330.805 177.055 353.75 148.75 353.75C120.445 353.75 97.5 330.805 97.5 302.5Z" fill="#0ACF83" />
                        <path d="M200 200C200 171.696 222.945 148.75 251.25 148.75C279.554 148.75 302.5 171.695 302.5 200C302.5 228.305 279.554 251.25 251.25 251.25C222.945 251.25 200 228.304 200 200Z" fill="#1ABCFE" />
                        <path d="M97.5 200C97.5 228.305 120.445 251.25 148.75 251.25H200V148.75H148.75C120.445 148.75 97.5 171.695 97.5 200Z" fill="#A259FF" />
                        <path d="M200 46.25V148.75H251.25C279.555 148.75 302.5 125.805 302.5 97.5C302.5 69.1954 279.555 46.25 251.25 46.25H200Z" fill="#FF7262" />
                        <path d="M97.5 97.5C97.5 125.805 120.445 148.75 148.75 148.75H200V46.25L148.75 46.25C120.445 46.25 97.5 69.1954 97.5 97.5Z" fill="#F24E1E" />
                    </svg>

                    <span className="text-sm font-medium text-gray-700">Figma</span>
                </div>
                <a
                    href={metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    title="Open in Figma"
                >
                    <ExternalLink size={16} />
                </a>
            </div>

            {/* Embed Container */}
            <div className="relative bg-accent aspect-[16/9] overflow-hidden rounded-b-lg">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            <span className="text-xs text-gray-500">
                                Loading Figma design...
                            </span>
                        </div>
                    </div>
                )}

                <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    title={metadata.title || "Figma Design"}
                />
            </div>
        </motion.div>
    );
}

export function FigmaCardWithImage() {
    return (
        <motion.div
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white">
                <div className="flex items-center ">
                    {/* Compact Figma logo */}
                    <svg width="25" height="25" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M97.5 302.5C97.5 274.195 120.445 251.25 148.75 251.25H200V302.5C200 330.805 177.055 353.75 148.75 353.75C120.445 353.75 97.5 330.805 97.5 302.5Z" fill="#0ACF83" />
                        <path d="M200 200C200 171.696 222.945 148.75 251.25 148.75C279.554 148.75 302.5 171.695 302.5 200C302.5 228.305 279.554 251.25 251.25 251.25C222.945 251.25 200 228.304 200 200Z" fill="#1ABCFE" />
                        <path d="M97.5 200C97.5 228.305 120.445 251.25 148.75 251.25H200V148.75H148.75C120.445 148.75 97.5 171.695 97.5 200Z" fill="#A259FF" />
                        <path d="M200 46.25V148.75H251.25C279.555 148.75 302.5 125.805 302.5 97.5C302.5 69.1954 279.555 46.25 251.25 46.25H200Z" fill="#FF7262" />
                        <path d="M97.5 97.5C97.5 125.805 120.445 148.75 148.75 148.75H200V46.25L148.75 46.25C120.445 46.25 97.5 69.1954 97.5 97.5Z" fill="#F24E1E" />
                    </svg>

                    <span className="text-sm font-medium text-gray-700">Figma</span>
                </div>
                <p
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <ExternalLink size={16} />
                </p>
            </div>

            {/* Embed Container */}
            <div className="relative bg-accent aspect-[16/9] overflow-hidden rounded-b-lg">
                <Image
                    width={500}
                    height={300}
                    src={"/landing/Figma.png"}
                    quality={100}
                    className="absolute inset-0 w-full h-full"
                    alt=""
                />
            </div>
        </motion.div>
    );
}
