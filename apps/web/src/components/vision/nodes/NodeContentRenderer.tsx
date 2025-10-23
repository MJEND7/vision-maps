import React, { useMemo } from 'react';
import { NodeVariants } from "@convex/tables/nodes";
import Image from "next/image";
import { Brain, ExternalLink, Expand, Minimize2 } from 'lucide-react';
import { AudioPlayer } from "../../channel/audio-player";
import { VideoPlayer } from "../../channel/video-player";
import {
    TranscriptionCard,
    GitHubCard,
    FigmaCard,
    YouTubeCard,
    TwitterCard,
    NotionCard,
    WebsiteCard,
    LoomCard,
    SpotifyCard,
    AppleMusicCard,
    ExcalidrawCard,
    TikTokCard,
} from "../../channel/metadata";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useOGMetadataWithCache } from "@/utils/ogMetadata";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Memoize remarkPlugins array to prevent unnecessary re-renders
const REMARK_PLUGINS = [remarkGfm];

// Memoize transition object to prevent framer-motion re-renders
const EXPAND_TRANSITION = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
    duration: 0.4
};
import { motion } from "motion/react";
import { Textarea } from '@/components/ui/textarea';
import { truncate } from '@/utils/string';
import { OGMetadata } from '@convex/tables/ogMetadata';
import { MARKDOWN_COMPONENTS } from '@/lib/markdown';


// Component for expandable text content with header and smooth animations
function ExpandableTextContent({ textExpand, content }: { textExpand: boolean, content: string; }) {
    const [isExpanded, setIsExpanded] = React.useState((!textExpand));
    const [needsExpansion, setNeedsExpansion] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (containerRef.current && !isExpanded) {
            const { scrollHeight, scrollWidth } = containerRef.current;
            // Check if content exceeds 200px width or 150px height (accounting for header)
            if (scrollHeight > 150 || scrollWidth > 200) {
                setNeedsExpansion(true);
            }
        }
    }, [content, isExpanded]);

    return (
        <div className="relative">
            {/* Header with expand button */}
            <div className="absolute -top-9 -right-2">
                {needsExpansion && textExpand && (
                    <button
                        onClick={() => {
                            console.log("Toggle expand:", !isExpanded);
                            setIsExpanded(!isExpanded);
                        }}
                        className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded ? <Minimize2 size={10} /> : <Expand size={10} />}
                    </button>
                )}
            </div>

            {/* Animated content container */}
            <motion.div
                initial={false}
                animate={useMemo(() => ({
                    maxWidth: isExpanded ? "800px" : "300px",
                    maxHeight: isExpanded ? "" : "150px",
                }), [isExpanded])}
                transition={EXPAND_TRANSITION}
                className={`${isExpanded ? '' : 'overflow-hidden'}`}
                style={isExpanded ? { position: 'relative' } : {}}
            >
                <div
                    ref={containerRef}
                    className="prose prose-sm"
                >
                    <Markdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
                        {content}
                    </Markdown>
                </div>
            </motion.div>
        </div>
    );
}

// Component for nodes that need metadata fetching
function NodeWithMetadata({
  node,
  variant,
}: {
  node: any;
  variant: NodeVariants;
}) {
  const { fetchWithCache } = useOGMetadataWithCache();
  const [metadata, setMetadata] = React.useState<OGMetadata | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Memoize stable URL based on node value
  const stableUrl = React.useMemo(() => node?.value || "", [node?.value]);

  // This effect only runs when stableUrl or variant changes
  React.useEffect(() => {
    let cancelled = false;

    const fetchMetadata = async () => {
      try {
        if (!stableUrl || typeof stableUrl !== "string") {
          console.error("Invalid node value:", stableUrl);
          if (!cancelled) {
            setMetadata({
              title: "Invalid URL",
              description: "",
              url: "",
              type: variant,
            });
          }
          return;
        }

        const result = await fetchWithCache(stableUrl);

        if (!cancelled) {
          setMetadata(result.metadata);
        }
      } catch (error) {
        console.error("Error fetching metadata:", error);
        if (!cancelled) {
          setMetadata({
            title: "Unable to load content",
            description: "There was an error loading this content",
            url: stableUrl,
            type: variant,
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchMetadata();
    return () => {
      cancelled = true;
    };
  }, [stableUrl, variant, fetchWithCache]);

  // ✅ Declare all hooks at the top level, unconditionally
  const card = React.useMemo(() => {
    if (!metadata) return null;

    switch (variant) {
      case NodeVariants.GitHub:
        return <GitHubCard metadata={metadata as any} />;
      case NodeVariants.Figma:
        return <FigmaCard metadata={metadata as any} />;
      case NodeVariants.YouTube:
        return <YouTubeCard metadata={metadata as any} />;
      case NodeVariants.Twitter:
        return <TwitterCard metadata={metadata as any} />;
      case NodeVariants.Notion:
        return <NotionCard metadata={metadata as any} />;
      case NodeVariants.Loom:
        return <LoomCard metadata={metadata as any} />;
      case NodeVariants.Spotify:
        return <SpotifyCard metadata={metadata as any} />;
      case NodeVariants.AppleMusic:
        return <AppleMusicCard metadata={metadata as any} />;
      case NodeVariants.Excalidraw:
        return <ExcalidrawCard metadata={metadata as any} />;
      case NodeVariants.TikTok:
        return <TikTokCard metadata={metadata as any} />;
      default:
        return <WebsiteCard metadata={metadata as any} />;
    }
  }, [variant, metadata]);

  // ✅ Conditional return happens *after* hooks, no missing calls
  if (isLoading || !metadata) {
    return (
      <div className="animate-pulse">
        <div className="bg-muted h-32 w-full rounded-lg" />
      </div>
    );
  }

  return card;
}

// Component for rendering image nodes with dialog
function ImageNodeContent({ node }: { node: any }) {
    const [isImageDialogOpen, setIsImageDialogOpen] = React.useState(false);

    return (
        <>
            <div className="rounded-lg overflow-hidden border cursor-pointer" onClick={() => setIsImageDialogOpen(true)}>
                <Image
                    src={node.value}
                    alt={node.title || ''}
                    width={330}
                    height={200}
                    quality={100}
                    className="w-full h-auto object-cover"
                />
            </div>
            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                <DialogContent
                    className="max-w-none max-h-none bg-transparent border-none p-0 flex items-center justify-center"
                    showCloseButton={false}
                >
                    <DialogTitle className="sr-only">
                        {node.title || 'Image'}
                    </DialogTitle>
                    <div className="relative">
                        <Image
                            src={node.value}
                            alt={node.title || ''}
                            width={1000}
                            height={1000}
                            quality={100}
                            className="max-w-[calc(100vw-4rem)] max-h-[calc(100vh-4rem)] w-auto h-auto object-contain"
                        />
                        <button
                            onClick={() => setIsImageDialogOpen(false)}
                            className="absolute top-4 right-4 p-3 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors touch-manipulation z-10"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

// Render node content based on variant
export function renderNodeContent(
    node: any,
    onOpenChat?: (chatId: string) => void,
    isEditing?: boolean,
    editValue?: string,
    setEditValue?: (value: string) => void,
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void,
    textExpand: boolean = true,
) {
    const variant = node.variant as NodeVariants;

    switch (variant) {
        case NodeVariants.Image:
            return <ImageNodeContent node={node} />;

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
        case NodeVariants.Excalidraw:
        case NodeVariants.TikTok:
        case NodeVariants.Link:
            return (
                <NodeWithMetadata node={node} variant={variant} />
            )

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
                    <div className="bg-accent flex items-center justify-between border-t border-accent p-3">
                        <div className="max-w-[180px] lg:max-w-[200px] xl:max-w-full overflow-hidden">
                            <p className="text-sm font-semibold truncate">{truncate(node.title, 35)}</p>
                        </div>
                        <button
                            onClick={() => onOpenChat?.(node.value)}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
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
                        <div className="w-full space-y-2">
                            <div className="flex items-center justify-between mb-1 px-1">
                                <span className="text-xs font-medium text-muted-foreground">
                                    {node.title || "Text"}
                                </span>
                            </div>
                            <Textarea
                                value={editValue}
                                onChange={(e) => setEditValue?.(e.target.value)}
                                onKeyDown={onKeyDown}
                                className="nodrag w-full text-sm resize-none border border-border rounded-xl p-2 bg-background text-foreground"
                                placeholder="Enter text..."
                            />
                            <p className="text-xs text-muted-foreground">
                                Press Ctrl+Enter to save, Escape to cancel
                            </p>
                        </div>
                    ) : (
                        <ExpandableTextContent textExpand={textExpand} content={node.value} />
                    )}
                </div>
            );

        case NodeVariants.Transcription:
            // Parse chunks from JSON value
            let transcriptChunks: Array<{ text: string; timestamp: number }> = [];
            try {
                transcriptChunks = JSON.parse(node.value);
            } catch (e) {
                console.error(e)
                // Fallback to treating as plain text if parsing fails
                return <ExpandableTextContent textExpand={textExpand} content={node.value} />;
            }

            // Check if we have audio and transcript chunks
            if (node.audioUrl && transcriptChunks && transcriptChunks.length > 0) {
                return (
                    <TranscriptionCard
                        audioUrl={node.audioUrl}
                        transcriptChunks={transcriptChunks}
                        recordingStartTime={transcriptChunks[0]?.timestamp}
                    />
                );
            }
            // Fallback to text display if no audio
            return <ExpandableTextContent textExpand={textExpand} content={node.value} />;

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
