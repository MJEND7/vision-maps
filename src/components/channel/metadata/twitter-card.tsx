import { motion } from "motion/react";
import { TwitterMetadata } from "./index";
import { Tweet } from "@/components/socials/tweet";

interface TwitterCardProps {
    metadata: TwitterMetadata;
}

export function TwitterCard({ metadata }: TwitterCardProps) {
    // Extract tweet ID from various Twitter URL formats
    const extractTweetId = (url: string): string | null => {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;

            // Handle different Twitter URL formats:
            // https://twitter.com/user/status/1234567890
            // https://x.com/user/status/1234567890
            // https://twitter.com/i/web/status/1234567890
            const tweetMatch = pathname.match(/\/status\/(\d+)/);
            if (tweetMatch) {
                return tweetMatch[1];
            }

            return null;
        } catch (error) {
            console.error('Error extracting tweet ID:', error);
            return null;
        }
    };


    const tweetId = extractTweetId(metadata.url);

    if (!tweetId) {
        // Fallback to original card if we can't extract tweet ID
        return (
            <motion.div
                className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 rounded-lg overflow-hidden border"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">Twitter/X</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                        {metadata.title || metadata.description || 'Twitter Post'}
                    </h3>
                    <a
                        href={metadata.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                    >
                        View on X →
                    </a>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            <Tweet id={tweetId} />
        </motion.div>
    );
}
