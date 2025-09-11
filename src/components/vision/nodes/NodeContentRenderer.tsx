import React from 'react';
import { NodeVariants } from "../../../../convex/tables/nodes";
import Image from "next/image";
import { Brain, Check, ExternalLink, X } from 'lucide-react';
import { AudioPlayer } from "../../channel/audio-player";
import { VideoPlayer } from "../../channel/video-player";
import { GitHubCard, FigmaCard, YouTubeCard, TwitterCard, NotionCard, WebsiteCard, LoomCard, SpotifyCard, AppleMusicCard } from "../../channel/metadata";
import { useOGMetadataWithCache } from "@/utils/ogMetadata";
import { Button } from '@/components/ui/button';

// Component for nodes that need metadata fetching
function NodeWithMetadata({ node, variant }: { node: any, variant: NodeVariants }) {
    const { fetchWithCache } = useOGMetadataWithCache();
    const [metadata, setMetadata] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    // Fetch metadata when component mounts
    React.useEffect(() => {
        const fetchMetadata = async () => {
            try {
                // Validate URL before fetching
                if (!node.value || typeof node.value !== 'string') {
                    console.error('Invalid node value:', node.value);
                    setMetadata({
                        title: 'Invalid URL',
                        description: '',
                        url: '',
                        type: variant
                    });
                    return;
                }

                // If no rich metadata, fetch from cache/API
                const result = await fetchWithCache(node.value);
                setMetadata({
                    ...result.metadata,
                    type: variant
                });
            } catch (error) {
                console.error('Error fetching metadata:', error);
                // Set fallback metadata on error
                setMetadata({
                    title: 'Unable to load content',
                    description: 'There was an error loading this content',
                    url: node.value || '',
                    type: variant
                });
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
                <div className="bg-muted h-32 w-full rounded-lg"></div>
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
export function renderNodeContent(
    node: any,
    onOpenChat?: (chatId: string) => void,
    isEditing?: boolean,
    editValue?: string,
    setEditValue?: (value: string) => void,
    textareaRef?: React.RefObject<HTMLTextAreaElement | null>,
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void,
    onSave?: () => void,
    onCancel?: () => void,
    isSaving?: boolean
) {
    const variant = node.variant as NodeVariants;

    switch (variant) {
        case NodeVariants.Image:
            return (
                <div className="rounded-lg overflow-hidden border">
                    <Image
                        src={node.value}
                        alt={node.title || 'Image'}
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
                <div className="overflow-hidden w-full h-48 border border-accent bg-background rounded-lg flex flex-col justify-between">
                    <div className="flex text-xs items-center justify-between gap-2 font-semibold p-3">
                        <div className="flex items-center gap-2">
                            LLM Node
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Brain size={20} />
                    </div>
                    <div className="bg-accent flex items-center gap-10 justify-between border-t border-accent p-3">
                        <p className="text-sm font-semibold truncate">{node.title}</p>
                        <button
                            onClick={() => onOpenChat?.(node.value)}
                            className="min-w-auto text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                        >
                            <ExternalLink size={12} />
                            Open
                        </button>
                    </div>
                </div>
            );

        case NodeVariants.Text:
            return (
                <div>
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                ref={textareaRef}
                                value={editValue}
                                onChange={(e) => setEditValue?.(e.target.value)}
                                onKeyDown={onKeyDown}
                                className="text-sm min-h-[60px] resize-none w-full border border-border rounded p-2 bg-background text-foreground"
                                placeholder="Enter text..."
                            />
                            <div className="flex gap-2 justify-end">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onCancel}
                                    disabled={isSaving}
                                    className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded flex items-center gap-1 disabled:opacity-50"
                                >
                                    <X className="w-3 h-3"/>
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={onSave}
                                    disabled={isSaving}
                                    className="px-3 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded flex items-center gap-1 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3 h-3"/>
                                            Save
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Press Ctrl+Enter to save, Escape to cancel
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm whitespace-pre-wrap text-foreground">{node.value}</p>
                    )}
                </div>
            );

        default:
            // For unknown types, try to detect if it's a file
            if (node.value?.startsWith('http') && !node.value.includes('youtube.com') && !node.value.includes('github.com')) {
                return <NodeWithMetadata node={node} variant={NodeVariants.Link} />;
            }
            return (
                <div className="w-full min-h-[8rem] p-4 bg-muted rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">
                        {node.variant} content: {node.value?.substring(0, 100)}...
                    </p>
                </div>
            );
    }
}
