/**
 * METADATA TYPES - Centralized type definitions for all node metadata
 * Aligned with backend API responses and frontend component requirements
 */

import { NodeVariants } from "@convex/tables/nodes";
import type { Tweet } from "@/components/socials/tweet";

// ============================================================================
// BASE METADATA INTERFACE
// ============================================================================

export interface BaseMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  url?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  jsonLD?: any[];
}

// ============================================================================
// PLATFORM-SPECIFIC METADATA TYPES
// ============================================================================

export interface GitHubMetadata extends BaseMetadata {
  stars?: number;
  forks?: number;
  language?: string;
  topics?: string[];
}

export interface YouTubeMetadata extends BaseMetadata {
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

export interface FigmaMetadata extends BaseMetadata {
  team?: string;
  fileType?: string;
}

export interface NotionMetadata extends BaseMetadata {
  workspace?: string;
  icon?: string;
  lastEdited?: string;
  pageType?: string;
}

export interface SpotifyMetadata extends BaseMetadata {
  artist?: string;
  album?: string;
  duration?: string;
  spotifyType?: "track" | "album" | "playlist" | "artist";
}

export interface AppleMusicMetadata extends BaseMetadata {
  artist?: string;
  album?: string;
  duration?: string;
  appleMusicType?: "song" | "album" | "playlist" | "artist";
}

export interface LoomMetadata extends BaseMetadata {
  duration?: string;
  views?: number;
  createdAt?: string;
  creator?: string;
}

export interface InstagramMetadata extends BaseMetadata {
  creator?: string;
  likes?: number;
  comments?: number;
}

export interface TikTokMetadata extends BaseMetadata {
  creator?: string;
  likes?: number;
  comments?: number;
}

export interface WebsiteMetadata extends BaseMetadata {}

// ============================================================================
// TYPED METADATA UNION (for metadata-specific operations)
// ============================================================================

export type OGMetadata =
  | BaseMetadata
  | GitHubMetadata
  | YouTubeMetadata
  | FigmaMetadata
  | NotionMetadata
  | SpotifyMetadata
  | AppleMusicMetadata
  | LoomMetadata
  | InstagramMetadata
  | TikTokMetadata
  | WebsiteMetadata
  | Tweet;

// ============================================================================
// DISCRIMINATED UNION FOR API RESPONSES (platform-specific fetch results)
// ============================================================================

export type OGFetchResult =
  | {
      platformType: NodeVariants.YouTube;
      metadata: YouTubeMetadata;
      isFallback?: boolean;
    }
  | {
      platformType: NodeVariants.GitHub;
      metadata: GitHubMetadata;
      isFallback?: boolean;
    }
  | {
      platformType: NodeVariants.Figma;
      metadata: FigmaMetadata;
      isFallback?: boolean;
    }
  | {
      platformType: NodeVariants.Notion;
      metadata: NotionMetadata;
      isFallback?: boolean;
    }
  | {
      platformType: NodeVariants.Twitter;
      metadata: Tweet;
      isFallback?: boolean;
    }
  | {
      platformType: NodeVariants.Spotify;
      metadata: SpotifyMetadata;
      isFallback?: boolean;
    }
  | {
      platformType: NodeVariants.AppleMusic;
      metadata: AppleMusicMetadata;
      isFallback?: boolean;
    }
  | {
      platformType: NodeVariants.Loom;
      metadata: LoomMetadata;
      isFallback?: boolean;
    }
  | {
      platformType: NodeVariants.Instagram;
      metadata: InstagramMetadata;
      isFallback?: boolean;
    }
  | {
      platformType: NodeVariants.TikTok;
      metadata: TikTokMetadata;
      isFallback?: boolean;
    }
  | {
      platformType:
        | NodeVariants.Link
        | NodeVariants.Image
        | NodeVariants.Video
        | NodeVariants.Audio
        | NodeVariants.Text
        | NodeVariants.AI
        | NodeVariants.Transcription
        | NodeVariants.Excalidraw;
      metadata: BaseMetadata;
      isFallback?: boolean;
    };

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

export interface FetchWithCacheResult {
  metadata: OGMetadata;
  type: NodeVariants;
  fromCache: boolean;
}

// ============================================================================
// TYPE GUARDS FOR VARIANT-SPECIFIC METADATA
// ============================================================================

export function isGitHubMetadata(metadata: OGMetadata): metadata is GitHubMetadata {
  return "stars" in metadata || "forks" in metadata;
}

export function isYouTubeMetadata(metadata: OGMetadata): metadata is YouTubeMetadata {
  return "videoUrl" in metadata || "channelName" in metadata;
}

export function isFigmaMetadata(metadata: OGMetadata): metadata is FigmaMetadata {
  return "fileType" in metadata;
}

export function isNotionMetadata(metadata: OGMetadata): metadata is NotionMetadata {
  return "workspace" in metadata || "pageType" in metadata;
}

export function isSpotifyMetadata(metadata: OGMetadata): metadata is SpotifyMetadata {
  return "spotifyType" in metadata;
}

export function isAppleMusicMetadata(metadata: OGMetadata): metadata is AppleMusicMetadata {
  return "appleMusicType" in metadata;
}

export function isLoomMetadata(metadata: OGMetadata): metadata is LoomMetadata {
  return "creator" in metadata && "duration" in metadata;
}

export function isTweet(metadata: any): metadata is Tweet {
  // Check for proper Tweet object structure from react-tweet/api
  return (
    metadata &&
    typeof metadata === "object" &&
    "id_str" in metadata &&
    "text" in metadata &&
    "user" in metadata &&
    "created_at" in metadata &&
    typeof metadata.user === "object" &&
    "screen_name" in metadata.user
  );
}

// ============================================================================
// METADATA MAPPER FOR API RESPONSES
// ============================================================================

/**
 * Maps API response metadata to typed OGMetadata based on variant
 */
export function mapApiMetadataByVariant(
  metadata: any,
  variant: NodeVariants
): OGMetadata {
  switch (variant) {
    case NodeVariants.YouTube:
      return metadata as YouTubeMetadata;
    case NodeVariants.GitHub:
      return metadata as GitHubMetadata;
    case NodeVariants.Figma:
      return metadata as FigmaMetadata;
    case NodeVariants.Notion:
      return metadata as NotionMetadata;
    case NodeVariants.Twitter:
      return metadata as Tweet;
    case NodeVariants.Spotify:
      return metadata as SpotifyMetadata;
    case NodeVariants.AppleMusic:
      return metadata as AppleMusicMetadata;
    case NodeVariants.Loom:
      return metadata as LoomMetadata;
    case NodeVariants.Instagram:
      return metadata as InstagramMetadata;
    case NodeVariants.TikTok:
      return metadata as TikTokMetadata;
    default:
      return metadata as BaseMetadata;
  }
}
