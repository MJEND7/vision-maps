import { useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback } from "react";
import { NodeVariants } from "../../convex/tables/nodes";

export interface OGMetadata {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
    ogType?: string;
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    jsonLD?: any[];
    type?: string;
    url?: string;
    // Platform-specific fields
    stars?: number;
    forks?: number;
    language?: string;
    topics?: string[];
    team?: string;
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
    twitterCreator?: string;
    twitterSite?: string;
    username?: string;
    avatar?: string;
    retweets?: number;
    replies?: number;
    twitterType?: string;
    tweetId?: string;
    workspace?: string;
    icon?: string;
    lastEdited?: string;
    pageType?: string;
    artist?: string;
    album?: string;
    spotifyType?: string;
    appleMusicType?: string;
    createdAt?: string;
    creator?: string;
    figmaFileType?: string;
}

export interface OGFetchResult {
    metadata: OGMetadata;
    platformType: string;
}

// Reusable hook for cache-first OG metadata fetching
export function useOGMetadataWithCache() {
    const convex = useConvex();
    const storeMutation = useMutation(api.ogMetadata.store);

    const fetchWithCache = useCallback(async (url: string): Promise<{
        metadata: any;
        type: NodeVariants;
        fromCache: boolean;
    }> => {
        try {
            // First, check convex cache
            console.log('Checking cache for URL:', url);
            const cachedData = await convex.query(api.ogMetadata.getByUrl, { url });

            if (cachedData) {
                console.log('Found cached data:', cachedData);
                // Map platform type to NodeVariant
                const typeMapping: Record<string, NodeVariants> = {
                    github: NodeVariants.GitHub,
                    youtube: NodeVariants.YouTube,
                    twitter: NodeVariants.Twitter,
                    figma: NodeVariants.Figma,
                    notion: NodeVariants.Notion,
                    loom: NodeVariants.Loom,
                    spotify: NodeVariants.Spotify,
                    applemusic: NodeVariants.AppleMusic,
                    website: NodeVariants.Link
                };

                return {
                    metadata: {
                        ...cachedData.metadata,
                        url: cachedData.metadata.url || url
                    },
                    type: typeMapping[cachedData.platformType] || NodeVariants.Link,
                    fromCache: true
                };
            }

            // If not in cache, fetch from API
            console.log('Not in cache, fetching from API for URL:', url);
            const result = await fetchOGMetadata(url);

            // Store in convex for caching
            try {
                await storeMutation({
                    url,
                    metadata: result.metadata,
                    platformType: result.platformType,
                });
                console.log('Cached metadata for URL:', url);
            } catch (storeError) {
                console.warn('Failed to cache metadata:', storeError);
            }

            // Map backend platform types to NodeVariants
            const typeMapping: Record<string, NodeVariants> = {
                github: NodeVariants.GitHub,
                youtube: NodeVariants.YouTube,
                twitter: NodeVariants.Twitter,
                figma: NodeVariants.Figma,
                notion: NodeVariants.Notion,
                loom: NodeVariants.Loom,
                spotify: NodeVariants.Spotify,
                applemusic: NodeVariants.AppleMusic,
                website: NodeVariants.Link
            };

            return {
                metadata: {
                    ...result.metadata,
                    url: result.metadata.url || url
                },
                type: typeMapping[result.platformType] || NodeVariants.Link,
                fromCache: false
            };
        } catch (error) {
            console.error('Error fetching metadata:', error);

            // Return fallback metadata
            return {
                metadata: {
                    title: new URL(url).hostname,
                    description: "",
                    url
                },
                type: NodeVariants.Link,
                fromCache: false
            };
        }
    }, [convex, storeMutation]);

    return {
        fetchWithCache
    };
}

// Standalone function for one-off metadata fetching
export async function fetchOGMetadata(url: string): Promise<OGFetchResult> {
    try {
        const response = await fetch('/api/og', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to fetch metadata');
        }

        return {
            metadata: data.metadata,
            platformType: data.platformType || 'website'
        };
    } catch (error) {
        console.error('Error fetching OG metadata:', error);

        return {
            metadata: {
                title: new URL(url).hostname,
                description: "",
            },
            platformType: 'website'
        };
    }
}
