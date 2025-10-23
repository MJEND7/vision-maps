import { useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { SpotifyMetadata } from "@/types/metadata";

interface SpotifyCardProps {
    metadata: SpotifyMetadata;
}

// Utility function to convert Spotify URLs to embed URLs
const getSpotifyEmbedUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        
        // Handle different Spotify URL formats:
        // https://open.spotify.com/track/[TRACK_ID]
        // https://open.spotify.com/album/[ALBUM_ID]
        // https://open.spotify.com/playlist/[PLAYLIST_ID]
        // https://open.spotify.com/artist/[ARTIST_ID]
        // https://open.spotify.com/episode/[EPISODE_ID]
        // https://open.spotify.com/show/[SHOW_ID]
        
        const pathMatch = urlObj.pathname.match(/\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/);
        if (pathMatch) {
            const [, type, id] = pathMatch;
            return `https://open.spotify.com/embed/${type}/${id}`;
        }
        
        return null;
    } catch (error) {
        console.error('Error parsing Spotify URL:', error);
        return null;
    }
};

// Get the content type from URL for better UI
const getSpotifyContentType = (url: string): string => {
    try {
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/(track|album|playlist|artist|episode|show)\//);
        if (pathMatch) {
            const type = pathMatch[1];
            switch (type) {
                case 'track': return 'Track';
                case 'album': return 'Album';
                case 'playlist': return 'Playlist';
                case 'artist': return 'Artist';
                case 'episode': return 'Episode';
                case 'show': return 'Podcast';
                default: return 'Content';
            }
        }
        return 'Content';
    } catch {
        return 'Content';
    }
};

export function SpotifyCard({ metadata }: SpotifyCardProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    const embedUrl = getSpotifyEmbedUrl(metadata.url);
    const contentType = getSpotifyContentType(metadata.url);
    
    // If we can't create an embed URL, show a fallback card
    if (!embedUrl || hasError) {
        return (
            <motion.div
                className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 rounded-lg overflow-hidden border"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                        <span className="text-sm font-medium text-gray-900">Spotify</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                        {metadata.title || `Spotify ${contentType}`}
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
                        className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-xs font-medium"
                    >
                        Play on Spotify
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
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700 truncate max-w-48">
                        {metadata.title || `Spotify ${contentType}`}
                    </span>
                </div>
                <a
                    href={metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    title="Play on Spotify"
                >
                    <ExternalLink size={16} />
                </a>
            </div>
            
            {/* Embed Container */}
            <div className="relative bg-gray-100" style={{ height: contentType === 'Track' ? '152px' : '352px' }}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            <span className="text-xs text-gray-500">Loading Spotify {contentType.toLowerCase()}...</span>
                        </div>
                    </div>
                )}
                
                <iframe
                    src={embedUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    title={metadata.title || `Spotify ${contentType}`}
                />
            </div>
        </motion.div>
    );
}
