import React, { useState, useRef } from "react";
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
import { Brain, ExternalLink, Edit2, Trash2, Check, X, Link2, Eye } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";

// Component for nodes that need metadata fetching
function NodeWithMetadata({ node, variant }: { node: NodeWithFrame, variant: NodeVariants }) {
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
function renderNodeContent(
    node: NodeWithFrame,
    onOpenChat?: (chatId: string) => void,
    isEditing?: boolean,
    editValue?: string,
    setEditValue?: (value: string) => void,
    textareaRef?: React.RefObject<HTMLTextAreaElement | null>,
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
) {
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
                        <button
                            onClick={() => onOpenChat?.(node.value)}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                        >
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
                    {isEditing ? (
                        <Textarea
                            ref={textareaRef}
                            value={editValue}
                            onChange={(e) => setEditValue?.(e.target.value)}
                            onKeyDown={onKeyDown}
                            className="text-sm min-h-[60px] resize-none"
                            placeholder="Enter text..."
                        />
                    ) : (
                        <p className="text-sm whitespace-pre-wrap">{node.value}</p>
                    )}
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

export default function ChannelNode({
    node,
    nodeUser,
    onOpenChat,
    onChannelNavigate,
    onShowDeleteDialog,
    onShowMobileDrawer,
    isMobile
}: {
    node: NodeWithFrame,
    nodeUser: NodeUser | null,
    onOpenChat?: (chatId: string) => void,
    onChannelNavigate?: (channelId: string, nodeId?: string) => void,
    onShowDeleteDialog?: () => void,
    onShowMobileDrawer?: () => void,
    isMobile?: boolean
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(node.value);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    const updateNode = useMutation(api.nodes.update);
    const deleteNode = useMutation(api.nodes.remove);

    // Find duplicate nodes for reference detection
    const duplicateNodes = useQuery(
        api.nodes.findDuplicateNodes,
        node.vision && node.variant === NodeVariants.Text
            ? {
                visionId: node.vision,
                value: node.value,
                variant: node.variant,
                excludeNodeId: node._id as Id<"nodes">,
            }
            : "skip"
    );

    const isReference = duplicateNodes && duplicateNodes.length > 0;
    const originalNode = duplicateNodes && duplicateNodes.length > 0 ? duplicateNodes[0] : null;


    // Long press handlers for mobile
    const handleTouchStart = () => {
        if (!isMobile) return;

        longPressTimerRef.current = setTimeout(() => {
            onShowMobileDrawer?.();
            // Add haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500); // 500ms long press
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleTouchMove = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setEditValue(node.value);
        // Close mobile drawer if it was open
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
    };

    const handleSave = async () => {
        if (editValue.trim() !== node.value) {
            try {
                await updateNode({
                    id: node._id as Id<"nodes">,
                    value: editValue.trim(),
                    // Remove height, width, weight as they don't exist on NodeWithFrame type
                });
            } catch (error) {
                console.error('Failed to update node:', error);
            }
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(node.value);
        setIsEditing(false);
    };

    const handleDelete = () => {
        onShowDeleteDialog?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && e.metaKey) {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

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
        <>
            <div
                key={node._id}
                className={`flex items-start gap-3 group ${isMobile && node.variant === NodeVariants.Text && !isEditing
                    ? 'active:bg-muted/30 transition-colors select-none'
                    : ''
                    }`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
            >
                <Avatar className="h-8 w-8">
                    <AvatarImage src={nodeUser.profileImage} alt={nodeUser.name} />
                    <AvatarFallback className="text-xs">
                        {nodeUser.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="">
                    <span className="flex justify-between items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">{nodeUser.name}</span>
                            {isReference && originalNode && (
                                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs cursor-pointer flex items-center gap-1 hover:bg-blue-100"
                                        >
                                            <Link2 size={10} />
                                            Reference
                                        </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80" align="start">
                                        <div className="space-y-2">
                                            <h4 className="font-medium">Referenced from:</h4>
                                            <div className="space-y-2">
                                                {duplicateNodes!.map((duplicate) => (
                                                    <div
                                                        key={duplicate._id}
                                                        className="flex items-center justify-between p-2 rounded-md border hover:bg-muted cursor-pointer"
                                                        onClick={() => {
                                                            onChannelNavigate?.(duplicate.channelId!, duplicate._id);
                                                            setIsPopoverOpen(false);
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={duplicate.userProfileImage || undefined} alt={duplicate.userName || "Unknown User"} />
                                                                <AvatarFallback className="text-xs">
                                                                    {(duplicate.userName || "Unknown User").split(" ").map(n => n[0]).join("").toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium">{duplicate.userName || "Unknown User"}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    in {duplicate.channelTitle || "Unknown Channel"}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {timeSinceFromDateString(new Date(duplicate._creationTime))}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Eye size={14} className="text-muted-foreground" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                            <div className="text-right text-xs text-muted-foreground/70">
                                {timeSinceFromDateString(new Date(node._creationTime))}
                            </div>
                        </div>
                        {/* Desktop action buttons - hidden on mobile */}
                        <div className="hidden sm:flex items-center gap-1">
                            {node.variant === NodeVariants.Text && isEditing ? (
                                <>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={handleSave}
                                    >
                                        <Check size={12} />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={handleCancel}
                                    >
                                        <X size={12} />
                                    </Button>
                                </>
                            ) : node.variant === NodeVariants.Text && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={handleEdit}
                                >
                                    <Edit2 size={12} />
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handleDelete}
                                title="Delete node"
                            >
                                <Trash2 size={12} />
                            </Button>
                        </div>

                        {/* Mobile editing buttons - only show when editing */}
                        {isMobile && node.variant === NodeVariants.Text && isEditing && (
                            <div className="flex items-center gap-1 sm:hidden">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={handleSave}
                                >
                                    <Check size={12} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={handleCancel}
                                >
                                    <X size={12} />
                                </Button>
                            </div>
                        )}
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
                        <div className="w-[calc(100vw-5rem)] max-w-[40rem] sm:w-auto sm:min-w-[40rem]">
                            {renderNodeContent(node, onOpenChat, isEditing, editValue, setEditValue, textareaRef, handleKeyDown)}
                        </div>
                    </div>
                </div >
            </div >

        </>
    )
}
