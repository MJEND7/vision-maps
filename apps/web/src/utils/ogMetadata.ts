import { useMutation, useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCallback } from "react";
import { NodeVariants } from "@convex/tables/nodes";

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
    tweetText?: string;
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
    fileType?: string;
}

export interface OGFetchResult {
    metadata: OGMetadata;
    platformType: string;
    isFallback?: boolean;
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
        // Validate URL at the start
        if (!url || typeof url !== 'string' || url.trim() === '') {
            throw new Error(`Invalid URL provided to fetchWithCache: ${url}`);
        }

        try {
            // First, check convex cache
            const cachedData = await convex.query(api.ogMetadata.getByUrl, { url });

            if (cachedData) {
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
            const result = await fetchOGMetadata(url);

            // Only cache in Convex if metadata fetch was successful (not fallback)
            // Check if the result indicates a fallback or incomplete metadata
            let hostname;
            try {
                hostname = url ? new URL(url).hostname : 'unknown';
            } catch (e) {
                hostname = 'unknown';
                console.error('Invalid URL in caching validation:', url, e);
            }

            // Special validation for Twitter - if we have tweet text, always cache
            const hasTweetText = result.platformType === 'twitter' && result.metadata?.tweetText;

            const isValidForCaching = hasTweetText || (
                result.metadata &&
                result.metadata.title &&
                result.metadata.title !== hostname &&
                !result.metadata.description?.includes('Unable to fetch metadata') &&
                !result.isFallback
            );

            console.log('Caching validation for', url, ':', {
                hasMetadata: !!result.metadata,
                hasTitle: !!result.metadata?.title,
                titleNotHostname: result.metadata?.title !== hostname,
                notErrorDescription: !result.metadata?.description?.includes('Unable to fetch metadata'),
                notFallback: !result.isFallback,
                hasTweetText,
                isValidForCaching,
                title: result.metadata?.title,
                hostname,
                tweetText: result.metadata?.tweetText,
                platformType: result.platformType
            });

            if (isValidForCaching) {
                try {
                    console.log('Storing metadata in og_metadata table for:', url);
                    await storeMutation({
                        url,
                        metadata: result.metadata,
                        platformType: result.platformType,
                    });
                    console.log('Successfully stored metadata for:', url);
                } catch (storeError) {
                    console.warn('Failed to cache metadata:', storeError);
                }
            } else {
                console.warn('Skipping cache for incomplete/fallback metadata:', url, 'Validation details:', {
                    hasMetadata: !!result.metadata,
                    title: result.metadata?.title,
                    hostname,
                    isFallback: result.isFallback
                });
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

            // Return fallback metadata with URL validation
            try {
                const fallbackUrl = new URL(url);
                return {
                    metadata: {
                        title: fallbackUrl.hostname,
                        description: "",
                        url
                    },
                    type: NodeVariants.Link,
                    fromCache: false
                };
            } catch (urlError) {
                console.error('Invalid URL in fallback:', urlError);
                return {
                    metadata: {
                        title: "Invalid URL",
                        description: "",
                        url: ""
                    },
                    type: NodeVariants.Link,
                    fromCache: false
                };
            }
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
            platformType: data.platformType || 'website',
            isFallback: data.fallback || false
        };
    } catch (error) {
        console.error('Error fetching OG metadata:', error);

        // Return fallback metadata with URL validation
        try {
            const fallbackUrl = new URL(url);
            return {
                metadata: {
                    title: fallbackUrl.hostname,
                    description: "",
                    url
                },
                platformType: 'website',
                isFallback: true
            };
        } catch (urlError) {
            console.error('Invalid URL in fetchOGMetadata fallback:', urlError);
            return {
                metadata: {
                    title: "Invalid URL",
                    description: "",
                    url: ""
                },
                platformType: 'website',
                isFallback: true
            };
        }
    }
}

// Helper function to detect if URL needs OG metadata
const isMediaUrl = (url: string): boolean => {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return hostname.includes('twitter.com') || 
               hostname.includes('x.com') ||
               hostname.includes('youtube.com') ||
               hostname.includes('youtu.be') ||
               hostname.includes('github.com') ||
               hostname.includes('figma.com') ||
               hostname.includes('notion.so') ||
               hostname.includes('notion.com') ||
               hostname.includes('spotify.com') ||
               hostname.includes('loom.com');
    } catch {
        return false;
    }
};

// Custom hook for caching metadata for URLs (used by frame and channel components)
export function useMetadataCache() {
    const { fetchWithCache } = useOGMetadataWithCache();
    const storeOGMetadata = useMutation(api.ogMetadata.store);

    const cacheMetadataForUrl = useCallback(async (url: string): Promise<void> => {
        if (!url || !url.startsWith('http') || !isMediaUrl(url)) {
            return;
        }

        try {
            console.log('Fetching OG metadata for:', url);
            await fetchWithCache(url);
            console.log('OG metadata fetched and cached for:', url);
        } catch (error) {
            console.error('Failed to fetch OG metadata via fetchWithCache:', error);
            
            // Fallback: try direct API call and manual storage for Twitter URLs
            if (url.includes('twitter.com') || url.includes('x.com')) {
                try {
                    console.log('Attempting direct metadata fetch and storage for Twitter URL');
                    const result = await fetchOGMetadata(url);
                    if (result.metadata) {
                        await storeOGMetadata({
                            url: url,
                            metadata: result.metadata,
                            platformType: result.platformType,
                        });
                        console.log('Successfully stored Twitter metadata directly');
                    }
                } catch (directError) {
                    console.error('Direct metadata storage also failed:', directError);
                }
            }
        }
    }, [fetchWithCache, storeOGMetadata]);

    return { cacheMetadataForUrl };
}

