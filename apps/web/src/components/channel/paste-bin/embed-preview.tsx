import { motion } from "motion/react";
import { Media } from "@/types/pastebin-component";
import { NodeVariants } from "@convex/tables/nodes";
import { GitHubCard, FigmaCard, YouTubeCard, TwitterCard, NotionCard, WebsiteCard, LoomCard, SpotifyCard, AppleMusicCard, ExcalidrawCard, TikTokCard, LinkMetadata, GitHubMetadata, FigmaMetadata, YouTubeMetadata, TwitterMetadata, NotionMetadata, LoomMetadata, SpotifyMetadata, AppleMusicMetadata, WebsiteMetadata, BaseMetadata } from "../metadata";

interface EmbedPreviewProps {
    media: Media;
    mediaToLinkMetadata: (media: Media) => LinkMetadata;
}

export function EmbedPreview({ media, mediaToLinkMetadata }: EmbedPreviewProps) {
    return (
        <motion.div
            key="link"
            className="w-full overflow-hidden"
            initial={{ height: "auto", opacity: 1 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
                type: "spring",
                stiffness: 280,
                damping: 30,
                mass: 1.0,
            }}
        >
            <motion.div
                className="p-4 flex justify-center"
                initial={{ y: 20, scale: 0.95 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: -20, scale: 0.95 }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                }}
            >
                <div className="w-full">
                    {media.type === NodeVariants.GitHub && <GitHubCard metadata={mediaToLinkMetadata(media) as GitHubMetadata} />}
                    {media.type === NodeVariants.Figma && <FigmaCard metadata={mediaToLinkMetadata(media) as FigmaMetadata} />}
                    {media.type === NodeVariants.YouTube && <YouTubeCard metadata={mediaToLinkMetadata(media) as YouTubeMetadata} />}
                    {media.type === NodeVariants.Twitter && <TwitterCard metadata={mediaToLinkMetadata(media) as TwitterMetadata} />}
                    {media.type === NodeVariants.Notion && <NotionCard metadata={mediaToLinkMetadata(media) as NotionMetadata} />}
                    {media.type === NodeVariants.Loom && <LoomCard metadata={mediaToLinkMetadata(media) as LoomMetadata} />}
                    {media.type === NodeVariants.Spotify && <SpotifyCard metadata={mediaToLinkMetadata(media) as SpotifyMetadata} />}
                    {media.type === NodeVariants.AppleMusic && <AppleMusicCard metadata={mediaToLinkMetadata(media) as AppleMusicMetadata} />}
                    {media.type === NodeVariants.Excalidraw && <ExcalidrawCard metadata={mediaToLinkMetadata(media) as BaseMetadata} />}
                    {media.type === NodeVariants.TikTok && <TikTokCard metadata={mediaToLinkMetadata(media) as BaseMetadata} />}
                    {media.type === NodeVariants.Link && <WebsiteCard metadata={mediaToLinkMetadata(media) as WebsiteMetadata} />}
                </div>
            </motion.div>
        </motion.div>
    );
}
