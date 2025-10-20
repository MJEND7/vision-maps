import { NodeVariants } from "@convex/tables/nodes";

export enum PasteBinMode {
    IDLE = 'idle',
    TEXT = 'text',
    AI = 'ai',
    MEDIA = 'media',
    EMBED = 'embed',
    TRANSCRIPTION = 'transcription'
}

// Data interfaces
export interface MediaData {
    file: File;
    url: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    uploadedUrl?: string;
    isUploading?: boolean;
    customName?: string;
}

export interface EmbedData {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    type: string;
}

export interface Media {
    type: NodeVariants;
    // File properties (for uploaded media)
    file?: File;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    uploadedUrl?: string;
    customName?: string;

    // Link/Embed properties (for external content) - matching LinkMetadata structure
    url?: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
    ogType?: string;
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;

    // Platform-specific fields from LinkMetadata
    stars?: number; // GitHub
    forks?: number; // GitHub
    language?: string; // GitHub
    topics?: string[]; // GitHub
    team?: string; // Figma
    figmaFileType?: string; // Figma
    thumbnail?: string; // YouTube
    channelName?: string; // YouTube
    duration?: string; // YouTube, Spotify, etc.
    views?: number; // YouTube, Loom
    likes?: number; // YouTube, Twitter
    publishedAt?: string; // YouTube, Twitter
    videoUrl?: string; // YouTube
    videoDuration?: string; // YouTube
    videoWidth?: string; // YouTube
    videoHeight?: string; // YouTube
    twitterCreator?: string; // Twitter
    twitterSite?: string; // Twitter
    username?: string; // Twitter
    avatar?: string; // Twitter
    retweets?: number; // Twitter
    replies?: number; // Twitter
    twitterType?: "tweet" | "profile" | "media"; // Twitter
    tweetId?: string; // Twitter
    workspace?: string; // Notion
    icon?: string; // Notion
    lastEdited?: string; // Notion
    pageType?: string; // Notion
    artist?: string; // Spotify, AppleMusic
    album?: string; // Spotify, AppleMusic
    spotifyType?: "track" | "album" | "playlist" | "artist"; // Spotify
    appleMusicType?: "song" | "album" | "playlist" | "artist"; // AppleMusic
    createdAt?: string; // Loom
    creator?: string; // Loom

    // Chat properties (for AI nodes)
    chatId?: string;
}

export type PasteBin = {
    type?: string; // The type of media (this is diffarent to the mode as it is more spesific)
    value?: string,
    transcription?: {
        text: string;
        timestamp: number;
    }[];
}
