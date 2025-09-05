import React from "react";
import { NodeUser } from "@/hooks/useUserCache";
import { NodeWithFrame } from "../../../convex/channels";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { timeSinceFromDateString } from "@/utils/date";
import { NodeVariants } from "../../../convex/tables/nodes";
import Image from "next/image";
import { AudioPlayer } from "./audio-player";
import { VideoPlayer } from "./video-player";
import { GitHubCard, FigmaCard, YouTubeCard, TwitterCard, NotionCard, WebsiteCard, LoomCard, SpotifyCard, AppleMusicCard } from "./metadata";
import { useOGMetadataWithCache } from "@/utils/ogMetadata";
import { Brain, ExternalLink } from "lucide-react";

// Component for nodes that need metadata fetching
function NodeWithMetadata({ node, variant }: { node: NodeWithFrame, variant: NodeVariants }) {
    const { fetchWithCache } = useOGMetadataWithCache();
    const [metadata, setMetadata] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    // Fetch metadata when component mounts
    React.useEffect(() => {
        const fetchMetadata = async () => {
            try {
                // If no rich metadata, fetch from cache/API
                const result = await fetchWithCache(node.value);
                setMetadata({
                    ...result.metadata,
                    type: variant
                });
            } catch (error) {
                console.error('Error fetching metadata:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetadata();
    }, [node.value, variant, fetchWithCache, node]);

    // Show loading state while fetching
    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="bg-gray-200 h-32 w-full rounded-lg"></div>
            </div>
        );
    }

    // Render appropriate card based on variant
    switch (variant) {
        case NodeVariants.GitHub:
            return <GitHubCard metadata={metadata} />;
        case NodeVariants.Figma:
            return <FigmaCard metadata={metadata} />;
        case NodeVariants.YouTube:
            return <YouTubeCard metadata={metadata} />;
        case NodeVariants.Twitter:
            return <TwitterCard metadata={metadata} />;
        case NodeVariants.Notion:
            return <NotionCard metadata={metadata} />;
        case NodeVariants.Loom:
            return <LoomCard metadata={metadata} />;
        case NodeVariants.Spotify:
            return <SpotifyCard metadata={metadata} />;
        case NodeVariants.AppleMusic:
            return <AppleMusicCard metadata={metadata} />;
        case NodeVariants.Link:
        default:
            return <WebsiteCard metadata={metadata} />;
    }
}

// Render node content based on variant
function renderNodeContent(node: NodeWithFrame) {
    const variant = node.variant as NodeVariants;

    switch (variant) {
        case NodeVariants.Image:
            return (
                <div className="rounded-lg overflow-hidden border">
                    <Image
                        src={node.value}
                        alt={node.title}
                        width={300}
                        height={200}
                        className="w-full h-auto object-cover"
                    />
                </div>
            );

        case NodeVariants.Audio:
            return (
                <AudioPlayer
                    src={node.value}
                    title={node.title}
                />
            );

        case NodeVariants.Video:
            return (
                <VideoPlayer
                    src={node.value}
                    title={node.title}
                />
            );

        case NodeVariants.GitHub:
        case NodeVariants.Figma:
        case NodeVariants.YouTube:
        case NodeVariants.Twitter:
        case NodeVariants.Notion:
        case NodeVariants.Loom:
        case NodeVariants.Spotify:
        case NodeVariants.AppleMusic:
        case NodeVariants.Link:
            return <NodeWithMetadata node={node} variant={variant} />;

        case NodeVariants.AI:
            return (
                <div className="overflow-hidden w-full h-48 border border-accent rounded-lg flex flex-col justify-between">
                    <div className="flex text-xs items-center justify-between gap-2 font-semibold p-3">
                        <div className="flex items-center gap-2">
                            LLM Node
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2">
                            <Brain size={20} />
                    </div>
                    <div className="bg-accent flex items-center justify-between border-t border-accent p-3">
                        <p className="text-sm font-semibold ">{node.title}</p>
                        <button className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                            <ExternalLink size={12} />
                            Open Chat
                        </button>
                    </div>
                </div>
            )
        //<ChatCard drivenIds={new Set()} onFocusInput={() => { }} chatId={node.value} />;

        case NodeVariants.Text:
            return (
                <div>
                    <p className="text-sm whitespace-pre-wrap">{node.value}</p>
                </div>
            );

        default:
            // For unknown types, try to detect if it's a file
            if (node.value.startsWith('http') && !node.value.includes('youtube.com') && !node.value.includes('github.com')) {
                return <NodeWithMetadata node={node} variant={NodeVariants.Link} />;
            }
            return (
                <div className="w-full min-h-[8rem] p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-muted-foreground">
                        {node.variant} content: {node.value.substring(0, 100)}...
                    </p>
                </div>
            );
    }
}

export default function ChannelNode({ node, nodeUser }: { node: NodeWithFrame, nodeUser: NodeUser | null }) {
    // Show loading state if user data isn't available yet
    if (!nodeUser) {
        return (
            <div key={node._id} className="flex items-start gap-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                    <span className="flex items-center gap-3">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                        <div className="text-right text-xs text-muted-foreground/70">
                            {timeSinceFromDateString(new Date(node._creationTime))}
                        </div>
                    </span>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="font-medium">{node.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {node.thought || "No description"}
                            </p>
                            {node.frameTitle && (
                                <p className="text-xs text-blue-600 mt-1">
                                    Frame: {node.frameTitle}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div key={node._id} className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
                <AvatarImage src={nodeUser.profileImage} alt={nodeUser.name} />
                <AvatarFallback className="text-xs">
                    {nodeUser.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="">
                <span className="flex items-center gap-3">
                    <span className="font-semibold">{nodeUser.name}</span>
                    <div className="text-right text-xs text-muted-foreground/70">
                        {timeSinceFromDateString(new Date(node._creationTime))}
                    </div>
                </span>
                <div className="flex flex-col gap-1">
                    <div className="flex-1">
                        {(node.thought && node.variant !== NodeVariants.Text) && (
                            <p className="text-sm text-muted-foreground">
                                {node.thought}
                            </p>
                        )}
                        {node.frameTitle && (
                            <p className="text-xs text-blue-600">
                                Frame: {node.frameTitle}
                            </p>
                        )}
                    </div>

                    {/* Render content based on node variant */}
                    <div className="w-[calc(100vw-5rem)] sm:w-auto sm:min-w-[600px]">
                        {renderNodeContent(node)}
                    </div>
                </div>
            </div>
        </div>
    )
}
