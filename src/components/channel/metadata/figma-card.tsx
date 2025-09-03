import { useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Loader2 } from "lucide-react";
import { FigmaMetadata } from "./index";

interface FigmaCardProps {
    metadata: FigmaMetadata;
}

// Utility function to convert Figma URLs to embed URLs
const getFigmaEmbedUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        
        // Handle different Figma URL formats:
        // https://www.figma.com/file/[FILE_ID]/[FILE_NAME]
        // https://www.figma.com/design/[FILE_ID]/[FILE_NAME]
        // https://www.figma.com/proto/[FILE_ID]/[FILE_NAME]
        
        const pathMatch = urlObj.pathname.match(/\/(file|design|proto)\/([a-zA-Z0-9]+)/);
        if (pathMatch) {
            return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
        }
        
        return null;
    } catch (error) {
        console.error('Error parsing Figma URL:', error);
        return null;
    }
};

export function FigmaCard({ metadata }: FigmaCardProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    const embedUrl = getFigmaEmbedUrl(metadata.url);
    
    // If we can't create an embed URL, show a fallback card
    if (!embedUrl || hasError) {
        return (
            <motion.div
                className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 rounded-lg overflow-hidden border"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M7.5 0.5h4.5v4.5h-4.5z" fill="#F24E1E"/>
                            <path d="M12 0.5h4.5v4.5h-4.5z" fill="#FF7262"/>
                            <path d="M12 5h4.5v4.5h-4.5z" fill="#1ABCFE"/>
                            <path d="M7.5 5h4.5v4.5h-4.5z" fill="#0ACF83"/>
                            <path d="M7.5 9.5h4.5v4.5h-4.5z" fill="#A259FF"/>
                        </svg>
                        <span className="text-sm font-medium text-gray-900">Figma</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                        {metadata.title || 'Figma Design'}
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
                        Open in Figma
                        <ExternalLink size={12} />
                    </a>
                </div>
            </motion.div>
        );
    }
    
    return (
        <motion.div
            className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <path d="M7.5 0.5h4.5v4.5h-4.5z" fill="#F24E1E"/>
                        <path d="M12 0.5h4.5v4.5h-4.5z" fill="#FF7262"/>
                        <path d="M12 5h4.5v4.5h-4.5z" fill="#1ABCFE"/>
                        <path d="M7.5 5h4.5v4.5h-4.5z" fill="#0ACF83"/>
                        <path d="M7.5 9.5h4.5v4.5h-4.5z" fill="#A259FF"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700 truncate max-w-48">
                        {metadata.title || 'Figma Design'}
                    </span>
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
            <div className="relative bg-gray-100" style={{ aspectRatio: '16/9' }}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            <span className="text-xs text-gray-500">Loading Figma design...</span>
                        </div>
                    </div>
                )}
                
                <iframe
                    src={embedUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    title={metadata.title || 'Figma Design'}
                />
            </div>
        </motion.div>
    );
}