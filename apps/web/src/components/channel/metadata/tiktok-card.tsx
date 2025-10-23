import { motion } from "motion/react";
import type { BaseMetadata } from "@/types/metadata";

interface TikTokMetadata extends BaseMetadata {
    author?: string;
    authorUrl?: string;
    videoId?: string;
    thumbnailUrl?: string;
    thumbnailWidth?: number;
    thumbnailHeight?: number;
}

interface TikTokCardProps {
    metadata: TikTokMetadata;
}

// TikTok logo as SVG
const TikTokLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" viewBox="0 0 256 290" className="w-5 h-5">
        <path fill="#FF004F" d="M189.72 104.421c18.678 13.345 41.56 21.197 66.273 21.197v-47.53a67.115 67.115 0 0 1-13.918-1.456v37.413c-24.711 0-47.59-7.851-66.272-21.195v96.996c0 48.523-39.356 87.855-87.9 87.855c-18.113 0-34.949-5.473-48.934-14.86c15.962 16.313 38.222 26.432 62.848 26.432c48.548 0 87.905-39.332 87.905-87.857v-96.995zm17.17-47.952c-9.546-10.423-15.814-23.893-17.17-38.785v-6.113h-13.189c3.32 18.927 14.644 35.097 30.358 44.898M69.673 225.607a40.008 40.008 0 0 1-8.203-24.33c0-22.192 18.001-40.186 40.21-40.186a40.313 40.313 0 0 1 12.197 1.883v-48.593c-4.61-.631-9.262-.9-13.912-.801v37.822a40.268 40.268 0 0 0-12.203-1.882c-22.208 0-40.208 17.992-40.208 40.187c0 15.694 8.997 29.281 22.119 35.9"></path>
        <path fill="currentColor" d="M175.803 92.849c18.683 13.344 41.56 21.195 66.272 21.195V76.631c-13.794-2.937-26.005-10.141-35.186-20.162c-15.715-9.802-27.038-25.972-30.358-44.898h-34.643v189.843c-.079 22.132-18.049 40.052-40.21 40.052c-13.058 0-24.66-6.221-32.007-15.86c-13.12-6.618-22.118-20.206-22.118-35.898c0-22.193 18-40.187 40.208-40.187c4.255 0 8.356.662 12.203 1.882v-37.822c-47.692.985-86.047 39.933-86.047 87.834c0 23.912 9.551 45.589 25.053 61.428c13.985 9.385 30.82 14.86 48.934 14.86c48.545 0 87.9-39.335 87.9-87.857z"></path>
        <path fill="#00F2EA" d="M242.075 76.63V66.516a66.285 66.285 0 0 1-35.186-10.047a66.47 66.47 0 0 0 35.186 20.163M176.53 11.57a67.788 67.788 0 0 1-.728-5.457V0h-47.834v189.845c-.076 22.13-18.046 40.05-40.208 40.05a40.06 40.06 0 0 1-18.09-4.287c7.347 9.637 18.949 15.857 32.007 15.857c22.16 0 40.132-17.918 40.21-40.05V11.571zM99.966 113.58v-10.769a88.787 88.787 0 0 0-12.061-.818C39.355 101.993 0 141.327 0 189.845c0 30.419 15.467 57.227 38.971 72.996c-15.502-15.838-25.053-37.516-25.053-61.427c0-47.9 38.354-86.848 86.048-87.833"></path>
    </svg>
);

// Wrapper component similar to TweetWrapper
const TikTokWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="relative border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 bg-white dark:bg-zinc-900 max-w-lg w-full shadow-sm">
        {children}
    </div>
);

// Header component similar to TweetHeader
const TikTokHeader = ({ authorUrl, author, url }: { authorUrl?: string; author?: string; url: string }) => (
    <div className="flex items-center gap-3 mb-3 justify-between">
        <div className="flex items-center gap-3">
            <div className="flex flex-col -space-y-0.5">
                {author && (
                    <a
                        href={authorUrl || url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-gray-900 dark:text-gray-100"
                    >
                        @{author.replace('@', '')}
                    </a>
                )}
            </div>
        </div>
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors flex-shrink-0"
            aria-label="View on TikTok"
        >
            <TikTokLogo />
        </a>
    </div>
);

// Title component
const TikTokTitle = ({ title }: { title?: string }) => (
    <p className="text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed mb-3 line-clamp-3">
        {title || "TikTok Video"}
    </p>
);

// Media component with thumbnail and play button
const TikTokMedia = ({ thumbnailUrl, title, url }: { thumbnailUrl?: string; title?: string; url: string }) => {
    if (!thumbnailUrl) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 w-full h-52 bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
            >
                <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                </svg>
            </a>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 relative cursor-pointer inline-block w-full"
        >
            <img
                src={thumbnailUrl}
                alt={title || "TikTok Video"}
                className="w-full h-auto max-h-[500px] rounded-lg border border-gray-300 dark:border-gray-700 object-cover transition-opacity"
            />
            {/* Play button overlay */}
            <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                <div className="bg-white/80  rounded-full p-2 transition-all">
                    <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </div>
        </a>
    );
};

export function TikTokCard({ metadata }: TikTokCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            <TikTokWrapper>
                <TikTokHeader
                    author={metadata.author}
                    authorUrl={metadata.authorUrl}
                    url={metadata.url}
                />
                <TikTokTitle title={metadata.title} />
                <TikTokMedia
                    thumbnailUrl={metadata.thumbnailUrl}
                    title={metadata.title}
                    url={metadata.url}
                />
            </TikTokWrapper>
        </motion.div>
    );
}
