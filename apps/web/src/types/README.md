# Centralized Types Structure

This folder contains all centralized type definitions for the application, particularly for metadata handling across backend and frontend.

## Files

### `metadata.ts` - Core Metadata Types
The main file containing all metadata type definitions and type guards.

**Includes:**
- `BaseMetadata` - Base interface for all metadata
- Platform-specific metadata interfaces:
  - `GitHubMetadata` - GitHub repository metadata
  - `YouTubeMetadata` - YouTube video metadata
  - `FigmaMetadata` - Figma design file metadata
  - `NotionMetadata` - Notion page metadata
  - `SpotifyMetadata` - Spotify track/album metadata
  - `AppleMusicMetadata` - Apple Music content metadata
  - `LoomMetadata` - Loom video metadata
  - `InstagramMetadata` - Instagram post metadata
  - `TikTokMetadata` - TikTok video metadata
  - `WebsiteMetadata` - Generic website metadata

**Union Types:**
- `OGMetadata` - Union of all metadata types
- `OGFetchResult` - Discriminated union for API responses
- `FetchWithCacheResult` - Return type for fetch hook

**Type Guards:**
- `isGitHubMetadata()` - Check if metadata is GitHub
- `isYouTubeMetadata()` - Check if metadata is YouTube
- `isFigmaMetadata()` - Check if metadata is Figma
- `isNotionMetadata()` - Check if metadata is Notion
- `isSpotifyMetadata()` - Check if metadata is Spotify
- `isAppleMusicMetadata()` - Check if metadata is Apple Music
- `isLoomMetadata()` - Check if metadata is Loom
- `isTweet()` - Check if metadata is a Tweet

**Utility Functions:**
- `mapApiMetadataByVariant()` - Maps API response to typed metadata based on variant

### Usage Patterns

#### In Card Components
```typescript
import type { YouTubeMetadata } from "@/types/metadata";

interface YouTubeCardProps {
  metadata: YouTubeMetadata;
}

export function YouTubeCard({ metadata }: YouTubeCardProps) {
  // metadata is properly typed with YouTube-specific fields
  return <div>{metadata.channelName}</div>;
}
```

#### In Utility Hooks
```typescript
import type { OGMetadata, OGFetchResult } from "@/types/metadata";
import { mapApiMetadataByVariant } from "@/types/metadata";

async function fetchOGMetadata(url: string): Promise<OGFetchResult> {
  const data = await fetch(ApiRoutes.OG_METADATA).then(r => r.json());

  // Properly map API response to typed metadata
  const typedMetadata = mapApiMetadataByVariant(data.metadata, data.nodeVariant);

  return {
    platformType: data.nodeVariant,
    metadata: typedMetadata,
  };
}
```

#### Using Type Guards
```typescript
import { isTweet, isYouTubeMetadata } from "@/types/metadata";

if (isTweet(metadata)) {
  // metadata is now typed as Tweet
  const tweetId = metadata.id_str;
}

if (isYouTubeMetadata(metadata)) {
  // metadata is now typed as YouTubeMetadata
  const duration = metadata.videoDuration;
}
```

## Type Imports

### From Card Components
Components in `/src/components/channel/metadata/` re-export types from this folder:
- `GitHubCard` expects `GitHubMetadata`
- `YouTubeCard` expects `YouTubeMetadata`
- `TwitterCard` expects `Tweet` (from react-tweet)
- `FigmaCard` expects `FigmaMetadata`
- etc.

### From Utilities
- `useOGMetadataWithCache` returns `FetchWithCacheResult`
- `fetchOGMetadata` returns `OGFetchResult`

### From Components
- `NodeContentRenderer` receives `OGMetadata` union type
- Platform-specific card components receive their respective metadata types

## API Response Mapping

The backend API (`/api/og/route.ts`) returns:
```json
{
  "success": boolean,
  "metadata": { /* variant-specific metadata */ },
  "nodeVariant": "YouTube" | "GitHub" | "Twitter" | /* ... */,
  "fallback": boolean
}
```

This is mapped to `OGFetchResult` discriminated union for type safety:
- API `nodeVariant` string is normalized to `NodeVariants` enum
- `metadata` object is typed based on the variant using `mapApiMetadataByVariant()`

## Benefits

1. **Type Safety** - All metadata access is type-checked
2. **Autocomplete** - IDEs provide property suggestions based on metadata type
3. **Centralization** - Single source of truth for all metadata types
4. **Maintainability** - Easy to add new metadata types or platforms
5. **Documentation** - Type definitions serve as documentation
6. **Discrimination** - Discriminated unions enable exhaustive type checking

## Future Enhancements

- Add more platform types (Pinterest, LinkedIn, etc.)
- Add validation schemas (Zod, io-ts) aligned with types
- Create API client types matching backend responses
- Add runtime type checking for metadata parsing
