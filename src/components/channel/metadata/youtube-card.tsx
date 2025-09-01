import { Eye, ThumbsUp } from "lucide-react";
import { BaseCard } from "./base-card";
import { LinkMetadata } from "./index";

interface YouTubeCardProps {
    metadata: LinkMetadata;
}

export function YouTubeCard({ metadata }: YouTubeCardProps) {
    const formatViews = (views: number) => {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
        return views.toString();
    };

    const youtubeIcon = (
        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
    );

    const stats = (
        <div className="flex items-center gap-4">
            {metadata.views && (
                <div className="flex items-center gap-1">
                    <Eye size={14} />
                    <span>{formatViews(metadata.views)} views</span>
                </div>
            )}
            {metadata.likes && (
                <div className="flex items-center gap-1">
                    <ThumbsUp size={14} />
                    <span>{formatViews(metadata.likes)}</span>
                </div>
            )}
        </div>
    );

    console.log(metadata)

    return (
        <BaseCard
            title={metadata.title}
            description={metadata.description}
            image={metadata.image}
            url={metadata.url}
            author={metadata.channelName}
            platform="youtube"
            platformIcon={youtubeIcon}
            imageAspect="landscape"
            stats={stats}
            publishDate={metadata.publishedAt}
        />
    );
}
