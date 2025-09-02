export { BaseCard } from './base-card';
export { GitHubCard } from './github-card';
export { FigmaCard } from './figma-card';
export { YouTubeCard } from './youtube-card';
export { TwitterCard } from './twitter-card';
export { NotionCard } from './notion-card';
export { WebsiteCard } from './website-card';
export { LoomCard } from './loom-card';
export { SpotifyCard } from './spotify-card';
export { AppleMusicCard } from './applemusic-card';
export { SkeletonCard } from './skeleton-card';
export { ChatCard } from './ai/card';

// Define the unified metadata type
export interface LinkMetadata {
    type: string;
    title: string;
    description?: string;
    image?: string;
    url: string;
    chat?: { id: string, streamId: string }
    // Platform-specific fields
    stars?: number; // GitHub
    forks?: number; // GitHub
    language?: string; // GitHub
    author?: string; // GitHub, Figma
    team?: string; // Figma
    channelName?: string; // YouTube
    duration?: string; // YouTube
    views?: number; // YouTube
    publishedAt?: string; // YouTube, Twitter
    workspace?: string; // Notion
    icon?: string; // Notion
    lastEdited?: string; // Notion
    siteName?: string; // Website
    favicon?: string; // Website
    // Twitter-specific fields
    username?: string; // Twitter
    avatar?: string; // Twitter
    likes?: number; // Twitter, YouTube
    retweets?: number; // Twitter
    replies?: number; // Twitter
    twitterType?: "tweet" | "profile" | "media"; // Twitter content type
}
