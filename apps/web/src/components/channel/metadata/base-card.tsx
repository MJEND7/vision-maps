import { motion } from "motion/react";
import { ExternalLink } from "lucide-react";
import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/utils/date";

// Memoize animation objects to prevent motion.div re-renders
const CARD_INITIAL = { opacity: 0, scale: 0.95 };
const CARD_ANIMATE = { opacity: 1, scale: 1 };
const CARD_TRANSITION = { type: "spring" as const, stiffness: 300, damping: 25 };

type ImageAspect = 'landscape' | 'portrait' | 'square' | 'none';

interface BaseCardProps {
    title: string;
    description?: string;
    image?: string;
    url: string;
    author?: string;
    platform: 'github' | 'youtube' | 'twitter' | 'figma' | 'notion' | 'website';
    platformIcon?: ReactNode;
    imageAspect?: ImageAspect;
    stats?: ReactNode;
    publishDate?: string;
}

const platformConfigs = {
    github: {
        colors: 'bg-gradient-to-br from-gray-900 to-black border-gray-700',
        accent: 'text-blue-400 hover:text-blue-300',
        text: 'text-gray-100',
        muted: 'text-gray-400',
        linkText: 'View on GitHub'
    },
    youtube: {
        colors: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
        accent: 'text-red-600 hover:text-red-700',
        text: 'text-gray-900',
        muted: 'text-gray-600',
        linkText: 'Watch on YouTube'
    },
    twitter: {
        colors: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300',
        accent: 'text-gray-900 hover:text-black',
        text: 'text-gray-900',
        muted: 'text-gray-600',
        linkText: 'View on X'
    },
    figma: {
        colors: 'bg-gradient-to-br from-purple-50 to-pink-100 border-purple-200',
        accent: 'text-purple-600 hover:text-purple-700',
        text: 'text-gray-900',
        muted: 'text-gray-600',
        linkText: 'Open in Figma'
    },
    notion: {
        colors: 'bg-gradient-to-br from-gray-50 to-blue-100 border-gray-200',
        accent: 'text-blue-600 hover:text-blue-700',
        text: 'text-gray-900',
        muted: 'text-gray-600',
        linkText: 'Open in Notion'
    },
    website: {
        colors: 'bg-white border-gray-200',
        accent: 'text-blue-600 hover:text-blue-700',
        text: 'text-gray-900',
        muted: 'text-gray-600',
        linkText: 'Visit site'
    }
};

const getImageClasses = (aspect: ImageAspect) => {
    switch (aspect) {
        case 'landscape':
            return 'h-40 w-full';
        case 'portrait':
            return 'h-40 w-24 mx-auto';
        case 'square':
            return 'h-24 w-24 mx-auto';
        case 'none':
        default:
            return 'h-32 w-full';
    }
};

export function BaseCard({
    title,
    description,
    image,
    url,
    author,
    platform,
    platformIcon,
    imageAspect = 'landscape',
    stats,
    publishDate,
}: BaseCardProps) {
    const config = platformConfigs[platform];
    const imageClasses = getImageClasses(imageAspect);

    return (
        <motion.div
            className={`${config.colors} rounded-lg overflow-hidden border`}
            initial={CARD_INITIAL}
            animate={CARD_ANIMATE}
            transition={CARD_TRANSITION}
        >
            {/* Image Section */}
            {image && (
                <div className={`${imageClasses} bg-gray-100 overflow-hidden`}>
                    <Image
                        src={image}
                        alt={title}
                        width={400}
                        height={300}
                        className={`w-full h-full object-cover ${imageAspect === 'portrait' ? 'rounded-lg' : ''}`}
                    />
                </div>
            )}

            {/* Content Section */}
            <div className="p-4 space-y-2">
                {/* Header with Platform Icon & Title */}
                <div className="flex items-center gap-3">
                    {platformIcon && (
                        <div className="flex-shrink-0">
                            {platformIcon}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className={`${config.text} font-semibold text-sm line-clamp-2 leading-tight`}>
                            {title}
                        </h3>
                        {author && (
                            <p className={`${config.muted} text-xs mt-1`}>
                                {author}
                            </p>
                        )}
                    </div>
                </div>

                {/* Description */}
                {description && (
                    <p className={`${config.text} text-xs line-clamp-2 leading-relaxed`}>
                        {description}
                    </p>
                )}

                {/* Stats Section */}
                {stats && (
                    <div className={`${config.muted} text-sm`}>
                        {stats}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                    {publishDate && (
                        <span className={`${config.muted} text-xs`}>
                            {formatDate(publishDate)}
                        </span>
                    )}
                    <Link
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${config.accent} hover:underline flex items-center gap-1 text-xs font-medium transition-colors ml-auto`}
                    >
                        <ExternalLink size={12} />
                        {config.linkText}
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
