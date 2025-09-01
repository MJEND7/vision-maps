import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import { BaseCard } from "./base-card";
import { LinkMetadata } from "./index";

interface TwitterCardProps {
    metadata: LinkMetadata;
}

export function TwitterCard({ metadata }: TwitterCardProps) {
    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const xIcon = (
        <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
        </svg>
    );

    const stats = (
        <div className="flex items-center gap-4">
            {metadata.replies && (
                <div className="flex items-center gap-1">
                    <MessageCircle size={14} />
                    <span>{formatNumber(metadata.replies)}</span>
                </div>
            )}
            {metadata.retweets && (
                <div className="flex items-center gap-1">
                    <Repeat2 size={14} />
                    <span>{formatNumber(metadata.retweets)}</span>
                </div>
            )}
            {metadata.likes && (
                <div className="flex items-center gap-1">
                    <Heart size={14} />
                    <span>{formatNumber(metadata.likes)}</span>
                </div>
            )}
        </div>
    );

    // Use portrait aspect for Twitter images since they're often vertical
    const imageAspect = metadata.twitterType === 'media' ? 'portrait' : 'landscape';
    const authorName = metadata.username ? `@${metadata.username}` : metadata.author;

    return (
        <BaseCard
            title={metadata.title || metadata.description || ''}
            description={metadata.twitterType === 'tweet' ? '' : metadata.description} // Don't duplicate content for tweets
            image={metadata.image}
            url={metadata.url}
            author={authorName}
            platform="twitter"
            platformIcon={xIcon}
            imageAspect={imageAspect}
            stats={stats}
            publishDate={metadata.publishedAt}
        />
    );
}