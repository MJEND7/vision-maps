import { useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Loader2 } from "lucide-react";
import { LinkMetadata } from "./index";

interface AppleMusicCardProps {
    metadata: LinkMetadata;
}

// Utility function to convert Apple Music URLs to embed URLs
const getAppleMusicEmbedUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        
        // Handle different Apple Music URL formats:
        // https://music.apple.com/us/album/album-name/id
        // https://music.apple.com/us/song/song-name/id
        // https://music.apple.com/us/playlist/playlist-name/pl.id
        // https://music.apple.com/us/artist/artist-name/id
        
        // Apple Music embeds use the same URL structure but with embed.music.apple.com
        const embedUrl = url.replace('music.apple.com', 'embed.music.apple.com');
        return embedUrl;
    } catch (error) {
        console.error('Error parsing Apple Music URL:', error);
        return null;
    }
};

// Get the content type from URL for better UI
const getAppleMusicContentType = (url: string): string => {
    try {
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/');
        
        if (pathSegments.includes('album')) return 'Album';
        if (pathSegments.includes('song')) return 'Song';
        if (pathSegments.includes('playlist')) return 'Playlist';
        if (pathSegments.includes('artist')) return 'Artist';
        if (pathSegments.includes('station')) return 'Radio';
        
        return 'Content';
    } catch {
        return 'Content';
    }
};

export function AppleMusicCard({ metadata }: AppleMusicCardProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    const embedUrl = getAppleMusicEmbedUrl(metadata.url);
    const contentType = getAppleMusicContentType(metadata.url);
    
    // If we can't create an embed URL, show a fallback card
    if (!embedUrl || hasError) {
        return (
            <motion.div
                className="bg-gradient-to-br from-pink-50 to-red-50 border-pink-200 rounded-lg overflow-hidden border"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#FA243C"/>
                            <path d="M16.5 8.5c-1.4 0-2.5 1.1-2.5 2.5v6h1v-6c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v6h1v-6c0-1.4-1.1-2.5-2.5-2.5z" fill="white"/>
                            <path d="M10.5 10.5v6h1v-4.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v4.5h1v-4.5c0-1.4-1.1-2.5-2.5-2.5s-2.5 1.1-2.5 2.5z" fill="white"/>
                        </svg>
                        <span className="text-sm font-medium text-gray-900">Apple Music</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                        {metadata.title || `Apple Music ${contentType}`}
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
                        className="inline-flex items-center gap-1 text-pink-600 hover:text-pink-700 text-xs font-medium"
                    >
                        Play on Apple Music
                        <ExternalLink size={12} />
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
            <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#FA243C"/>
                        <path d="M16.5 8.5c-1.4 0-2.5 1.1-2.5 2.5v6h1v-6c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v6h1v-6c0-1.4-1.1-2.5-2.5-2.5z" fill="white"/>
                        <path d="M10.5 10.5v6h1v-4.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v4.5h1v-4.5c0-1.4-1.1-2.5-2.5-2.5s-2.5 1.1-2.5 2.5z" fill="white"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700 truncate max-w-48">
                        {metadata.title || `Apple Music ${contentType}`}
                    </span>
                </div>
                <a
                    href={metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    title="Play on Apple Music"
                >
                    <ExternalLink size={16} />
                </a>
            </div>
            
            {/* Embed Container */}
            <div className="relative bg-gray-100" style={{ height: contentType === 'Song' ? '175px' : '450px' }}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            <span className="text-xs text-gray-500">Loading Apple Music {contentType.toLowerCase()}...</span>
                        </div>
                    </div>
                )}
                
                <iframe
                    src={embedUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="autoplay *; encrypted-media *; fullscreen *"
                    sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    title={metadata.title || `Apple Music ${contentType}`}
                />
            </div>
        </motion.div>
    );
}