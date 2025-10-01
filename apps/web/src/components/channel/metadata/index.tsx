import { NodeVariants } from "@convex/nodes/table";

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

// Base metadata interface matching API route structure
interface BaseMetadata {
  type: NodeVariants;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  url: string;
  ogType?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  jsonLD?: any[];
}

// Platform-specific metadata interfaces
export interface GitHubMetadata extends BaseMetadata {
  type: NodeVariants.GitHub;
  stars?: number;
  forks?: number;
  language?: string;
  topics?: string[];
}

export interface YouTubeMetadata extends BaseMetadata {
  type: NodeVariants.YouTube;
  thumbnail?: string; 
  channelName?: string;
  duration?: string;
  views?: number;
  likes?: number;
  publishedAt?: string;
  videoUrl?: string;
  videoDuration?: string;
  videoWidth?: string;
  videoHeight?: string;
}

export interface TwitterMetadata extends BaseMetadata {
  type: NodeVariants.Twitter;
  twitterCreator?: string;
  twitterSite?: string;
  username?: string;
  avatar?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  twitterType?: "tweet" | "profile" | "media";
  tweetId?: string;
}

export interface FigmaMetadata extends BaseMetadata {
  type: NodeVariants.Figma;
  team?: string;
  fileType?: string;
}

export interface NotionMetadata extends BaseMetadata {
  type: NodeVariants.Notion;
  workspace?: string;
  icon?: string;
  lastEdited?: string;
  pageType?: string;
}

export interface SpotifyMetadata extends BaseMetadata {
  type: NodeVariants.Spotify;
  artist?: string;
  album?: string;
  duration?: string;
  spotifyType?: "track" | "album" | "playlist" | "artist";
}

export interface AppleMusicMetadata extends BaseMetadata {
  type: NodeVariants.AppleMusic;
  artist?: string;
  album?: string;
  duration?: string;
  appleMusicType?: "song" | "album" | "playlist" | "artist";
}

export interface LoomMetadata extends BaseMetadata {
  type: NodeVariants.Loom;
  duration?: string;
  views?: number;
  createdAt?: string;
  creator?: string;
}

export interface WebsiteMetadata extends BaseMetadata {
  type: NodeVariants.Link;
}

// Union type for all metadata types
export type LinkMetadata = 
  | GitHubMetadata 
  | YouTubeMetadata 
  | TwitterMetadata 
  | FigmaMetadata 
  | NotionMetadata 
  | SpotifyMetadata 
  | AppleMusicMetadata 
  | LoomMetadata 
  | WebsiteMetadata 
  | BaseMetadata;
