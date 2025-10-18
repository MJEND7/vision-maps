import React, { useState, useMemo, memo } from "react";
import { motion } from "motion/react";
import { ExternalLink, Loader2, Eye, ThumbsUp } from "lucide-react";
import { YouTubeMetadata } from "./index";

interface YouTubeCardProps {
  metadata: YouTubeMetadata;
}

// Utility function to convert YouTube URLs to embed URLs
const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    let videoId = null;

    if (urlObj.hostname.includes("youtu.be")) {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes("youtube.com")) {
      if (urlObj.pathname.includes("/watch")) {
        videoId = urlObj.searchParams.get("v");
      } else if (urlObj.pathname.includes("/embed/")) {
        videoId = urlObj.pathname.split("/embed/")[1];
      }
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch (error) {
    console.error("Error parsing YouTube URL:", error);
    return null;
  }
};

function YouTubeCardBase({ metadata }: YouTubeCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Memoize the embed URL so it doesn't change between renders
  const embedUrl = useMemo(
    () => (metadata ? getYouTubeEmbedUrl(metadata.url) : null),
    [metadata]
  );

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  // Handle null metadata gracefully
  if (!metadata) {
    return (
      <motion.div
        className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-red-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">YouTube</span>
          </div>
          <p className="text-sm text-gray-500">Unable to load video metadata</p>
        </div>
      </motion.div>
    );
  }

  // Fallback for errors or invalid embed URLs
  if (!embedUrl || hasError) {
    return (
      <motion.div
        className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 rounded-lg overflow-hidden border"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-red-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">YouTube</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
            {metadata.title || "YouTube Video"}
          </h3>
          {metadata.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {metadata.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {metadata.views && (
                <div className="flex items-center gap-1">
                  <Eye size={12} />
                  <span>{formatViews(metadata.views)} views</span>
                </div>
              )}
              {metadata.likes && (
                <div className="flex items-center gap-1">
                  <ThumbsUp size={12} />
                  <span>{formatViews(metadata.likes)}</span>
                </div>
              )}
            </div>
            <a
              href={metadata.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium"
            >
              Watch on YouTube
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  // ✅ Main embed version - stays mounted between renders
  return (
    <motion.div
      className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-red-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <span className="text-sm font-medium text-gray-700 truncate max-w-48">
            {metadata.title || "YouTube Video"}
          </span>
        </div>
        <a
          href={metadata.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Watch on YouTube"
        >
          <ExternalLink size={16} />
        </a>
      </div>

      {/* Embed Container */}
      <div className="relative bg-gray-100" style={{ aspectRatio: "16/9" }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="text-xs text-gray-500">
                Loading YouTube video...
              </span>
            </div>
          </div>
        )}

        {/* Key ensures iframe only remounts when URL changes */}
        <iframe
          key={embedUrl}
          src={embedUrl}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          title={metadata.title || "YouTube Video"}
        />
      </div>

      {/* Footer */}
      {(metadata.views || metadata.likes || metadata.channelName) && (
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-3">
              {metadata.views && (
                <div className="flex items-center gap-1">
                  <Eye size={12} />
                  <span>{formatViews(metadata.views)} views</span>
                </div>
              )}
              {metadata.likes && (
                <div className="flex items-center gap-1">
                  <ThumbsUp size={12} />
                  <span>{formatViews(metadata.likes)}</span>
                </div>
              )}
            </div>
            {metadata.channelName && (
              <span className="font-medium">{metadata.channelName}</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// 🧠 Memoized wrapper – prevents rerender unless URL changes
export const YouTubeCard = memo(
  YouTubeCardBase,
  (prev, next) => prev.metadata.url === next.metadata.url
);
