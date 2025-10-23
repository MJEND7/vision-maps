import { motion } from "motion/react";
import { Tweet as TweetType } from "@/components/socials/tweet";
import { Tweet } from "@/components/socials/tweet";

interface TwitterCardProps {
    metadata: TweetType;
}

export function TwitterCard({ metadata }: TwitterCardProps) {
    // Fallback card if metadata is missing or invalid
    if (!metadata || !metadata.id_str) {
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
                        {metadata?.text || 'Twitter Post'}
                    </h3>
                    <a
                        href={`https://x.com/${metadata?.user?.screen_name}/status/${metadata?.id_str}`}
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
            <Tweet tweet={metadata} />
        </motion.div>
    );
}
