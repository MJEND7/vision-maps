import React from 'react';
import { NodeVariants } from "../../../../convex/tables/nodes";
import Image from "next/image";
import { Brain, Check, ExternalLink, X, Expand, Minimize2 } from 'lucide-react';
import { AudioPlayer } from "../../channel/audio-player";
import { VideoPlayer } from "../../channel/video-player";
import { GitHubCard, FigmaCard, YouTubeCard, TwitterCard, NotionCard, WebsiteCard, LoomCard, SpotifyCard, AppleMusicCard } from "../../channel/metadata";
import { useOGMetadataWithCache } from "@/utils/ogMetadata";
import { Button } from '@/components/ui/button';
import Markdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter, SyntaxHighlighterProps } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { motion, AnimatePresence } from "motion/react";

// Code component with copy functionality for text nodes
const CodeComponent = ({ className, children, ...props }: any) => {
    const [copied, setCopied] = React.useState(false);
    const match = /language-(\w+)/.exec(className || "");
    const theme =
        typeof window !== "undefined" &&
            document.documentElement.classList.contains("dark")
            ? oneDark
            : oneLight;

    const codeString = String(children).replace(/\n$/, "");

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(codeString);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code:", err);
        }
    };

    return match ? (
        <div className="max-w-full relative group my-3">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 text-xs rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                {copied ? <Check size={12} /> : <ExternalLink size={12} />}
            </button>
            <SyntaxHighlighter
                style={theme as SyntaxHighlighterProps["style"]}
                language={match[1]}
                PreTag="div"
                className="rounded-md border text-xs"
                {...props}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
    ) : (
        <code
            className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-card-foreground"
            {...props}
        >
            {children}
        </code>
    );
};

// Custom Markdown styles for text nodes (much smaller text)
const textNodeMarkdownComponents: Components = {
    h1: ({ ...props }) => (
        <h1 className="text-md font-bold text-card-foreground py-3" {...props} />
    ),
    h2: ({ ...props }) => (
        <h2 className="text-sm font-semibold text-card-foreground py-3" {...props} />
    ),
    h3: ({ ...props }) => (
        <h2 className="text-xs font-semibold text-card-foreground py-3" {...props} />
    ),
    th: ({ ...props }) => (
        <th className="whitespace-nowrap text-sm list-disc list-inside space-y-0.5  font-semibold text-card-foreground py-2" {...props} />
    ),
    td: ({ ...props }) => (
        <td className="text-sm list-disc list-inside space-y-0.5 text-card-foreground py-2" {...props} />
    ),
    p: ({ ...props }) => (
        <p className="text-xs text-card-foreground leading-tight py-2" {...props} />
    ),
    ul: ({ ...props }) => (
        <ul className="list-disc list-inside space-y-0.5 text-card-foreground my-2 text-xs" {...props} />
    ),
    ol: ({ ...props }) => (
        <ol className="list-decimal list-inside space-y-0.5 text-card-foreground my-2 text-xs" {...props} />
    ),
    li: ({ ...props }) => (
        <li className="ml-1 text-card-foreground text-xs my-2" {...props} />
    ),
    blockquote: ({ ...props }) => (
        <blockquote
            className="my-2 border-l-2 border-border pl-1 italic text-muted-foreground my-1 text-xs"
            {...props}
        />
    ),
    code: CodeComponent,
};

// Component for expandable text content with header and smooth animations
function ExpandableTextContent({ content, title }: { content: string; title?: string }) {
    const [isExpanded, setIsExpanded] = React.useState(false);
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
                {needsExpansion && (
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
                animate={{
                    maxWidth: isExpanded ? "800px" : "300px",
                    maxHeight: isExpanded ? "" : "150px",
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    duration: 0.4
                }}
                className={`${isExpanded ? '' : 'overflow-hidden'}`}
                style={isExpanded ? { position: 'relative', zIndex: 1000 } : {}}
            >
                <div
                    ref={containerRef}
                    className="prose prose-sm"
                >
                    <Markdown remarkPlugins={[remarkGfm]} components={textNodeMarkdownComponents}>
                        {content}
                    </Markdown>
                </div>
            </motion.div>
        </div>
    );
}

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
                        alt={node.title || ''}
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
                            <div className="flex items-center justify-between mb-1 px-1">
                                <span className="text-xs font-medium text-muted-foreground">
                                    {node.title || "Text"}
                                </span>
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={editValue}
                                onChange={(e) => setEditValue?.(e.target.value)}
                                onKeyDown={onKeyDown}
                                className="text-sm resize-none w-auto border border-border rounded p-2 bg-background text-foreground"
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
                                    <X className="w-3 h-3" />
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
                                            <Check className="w-3 h-3" />
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
                        <ExpandableTextContent content={node.value} title={node.title} />
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
