import { useMutation, useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCallback } from "react";
import { NodeVariants } from "@convex/tables/nodes";
import { ApiRoutes } from "@/constants/apiRoutes";
import type {
    BaseMetadata,
    OGFetchResult,
    FetchWithCacheResult,
} from "@/types/metadata";
import { mapApiMetadataByVariant } from "@/types/metadata";

// --------------------------------------------------------------------------
// useOGMetadataWithCache Hook
// --------------------------------------------------------------------------

export function useOGMetadataWithCache() {
    const convex = useConvex();
    const storeMutation = useMutation(api.ogMetadata.store);

    const fetchWithCache = useCallback(
        async (url: string): Promise<FetchWithCacheResult> => {
            if (!url || typeof url !== "string" || url.trim() === "") {
                throw new Error(`Invalid URL provided to fetchWithCache: ${url}`);
            }

            try {
                const cachedData = await convex.query(api.ogMetadata.getByUrl, { url });

                if (cachedData) {
                    const selectedType = cachedData.platformType as NodeVariants;
                    // For Twitter/Tweet data, don't spread/modify - keep the Tweet object intact
                    const metadata = selectedType === NodeVariants.Twitter
                        ? cachedData.metadata
                        : { ...cachedData.metadata, url };
                    return {
                        metadata,
                        type: selectedType,
                        fromCache: true,
                    };
                }

                const result = await fetchOGMetadata(url);

                const hostname = (() => {
                    try {
                        return new URL(url).hostname;
                    } catch {
                        return "unknown";
                    }
                })();

                const isTweet = result.platformType === NodeVariants.Twitter;

                const isValidForCaching =
                    isTweet ||
                    (!!(result.metadata as BaseMetadata)?.title &&
                        (result.metadata as BaseMetadata).title !== hostname &&
                        !(
                            (result.metadata as BaseMetadata).description?.includes(
                                "Unable to fetch metadata"
                            ) ?? false
                        ) &&
                        !result.isFallback);

                if (isValidForCaching) {
                    try {
                        await storeMutation({
                            url,
                            metadata: result.metadata,
                            platformType: result.platformType,
                        });
                    } catch (storeError) {
                        console.warn("Failed to cache metadata:", storeError);
                    }
                }

                // For Twitter/Tweet data, don't spread/modify - keep the Tweet object intact
                const metadata = result.platformType === NodeVariants.Twitter
                    ? result.metadata
                    : { ...result.metadata, url };
                return {
                    metadata,
                    type: result.platformType ?? NodeVariants.Link,
                    fromCache: false,
                };
            } catch (error) {
                console.error("Error fetching metadata:", error);
                try {
                    const fallbackUrl = new URL(url);
                    return {
                        metadata: { title: fallbackUrl.hostname, description: "", url },
                        type: NodeVariants.Link,
                        fromCache: false,
                    };
                } catch {
                    return {
                        metadata: { title: "Invalid URL", description: "", url: "" },
                        type: NodeVariants.Link,
                        fromCache: false,
                    };
                }
            }
        },
        [convex, storeMutation]
    );

    return { fetchWithCache };
}

// --------------------------------------------------------------------------
// fetchOGMetadata (typed by platformType)
// --------------------------------------------------------------------------

export async function fetchOGMetadata(url: string): Promise<OGFetchResult> {
    try {
        const response = await fetch(ApiRoutes.OG_METADATA, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!data.success) {
            return {
                platformType: NodeVariants.Link,
                metadata: { title: "Unable to fetch metadata", description: "", url },
                isFallback: true,
            };
        }

        // Normalize platformType from string to enum
        const nodeVariant = Object.values(NodeVariants).includes(data.nodeVariant)
            ? (data.nodeVariant as NodeVariants)
            : NodeVariants.Link;

        // Map metadata using centralized function
        const typedMetadata = mapApiMetadataByVariant(data.metadata, nodeVariant);

        return {
            platformType: nodeVariant,
            metadata: typedMetadata,
            isFallback: data.fallback ?? false,
        } as OGFetchResult;
    } catch (error) {
        console.error("Error fetching OG metadata:", error);
        return {
            platformType: NodeVariants.Link,
            metadata: { title: "Invalid URL", description: "", url: "" },
            isFallback: true,
        };
    }
}

// --------------------------------------------------------------------------
// Media URL detector (unchanged)
// --------------------------------------------------------------------------

const isMediaUrl = (url: string): boolean => {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return (
            hostname.includes("twitter.com") ||
            hostname.includes("x.com") ||
            hostname.includes("youtube.com") ||
            hostname.includes("youtu.be") ||
            hostname.includes("github.com") ||
            hostname.includes("figma.com") ||
            hostname.includes("notion.so") ||
            hostname.includes("notion.com") ||
            hostname.includes("spotify.com") ||
            hostname.includes("loom.com")
        );
    } catch {
        return false;
    }
};

// --------------------------------------------------------------------------
// useMetadataCache Hook
// --------------------------------------------------------------------------

export function useMetadataCache() {
    const { fetchWithCache } = useOGMetadataWithCache();
    const storeOGMetadata = useMutation(api.ogMetadata.store);

    const cacheMetadataForUrl = useCallback(
        async (url: string): Promise<void> => {
            if (!url || !url.startsWith("http") || !isMediaUrl(url)) return;

            try {
                await fetchWithCache(url);
            } catch (error) {
                console.error("Failed via fetchWithCache:", error);
                if (url.includes("twitter.com") || url.includes("x.com")) {
                    try {
                        const result = await fetchOGMetadata(url);
                        await storeOGMetadata({
                            url,
                            metadata: result.metadata,
                            platformType: result.platformType,
                        });
                    } catch (err2) {
                        console.error("Direct tweet cache failed:", err2);
                    }
                }
            }
        },
        [fetchWithCache, storeOGMetadata]
    );

    return { cacheMetadataForUrl };
}
