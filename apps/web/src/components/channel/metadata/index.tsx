// Re-export all central metadata types from the types folder
export type {
  BaseMetadata,
  GitHubMetadata,
  YouTubeMetadata,
  FigmaMetadata,
  NotionMetadata,
  SpotifyMetadata,
  AppleMusicMetadata,
  LoomMetadata,
  InstagramMetadata,
  TikTokMetadata,
  WebsiteMetadata,
  OGMetadata,
  OGFetchResult,
  FetchWithCacheResult,
} from '@/types/metadata';

// Re-export Tweet type from socials component
export type { Tweet as TwitterMetadata } from '@/components/socials/tweet';

// Type alias for compatibility with existing code
import type { OGMetadata } from '@/types/metadata';
export type LinkMetadata = OGMetadata;

export {
  isGitHubMetadata,
  isYouTubeMetadata,
  isFigmaMetadata,
  isNotionMetadata,
  isSpotifyMetadata,
  isAppleMusicMetadata,
  isLoomMetadata,
  isTweet,
  mapApiMetadataByVariant,
} from '@/types/metadata';

// Re-export components
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
export { TranscriptionCard } from './transcription-card';
