"use client";

import {
    useQuery,
    useMutation,
    usePaginatedQuery,
} from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, Filter, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { MultiUserSelector } from "@/components/ui/multi-user-selector";
import { useNodeUserCache } from "@/hooks/useUserCache";
import { useNodeStore } from "@/hooks/useNodeStore";
import { NodeWithFrame } from "../../../convex/channels";
import PasteBin from "../channel/paste-bin";
import { CreateNodeArgs } from "../../../convex/nodes";
import { NODE_VARIANTS } from "@/lib/constants";
import { useMetadataCache } from "../../utils/ogMetadata";
import ChannelNode from "../channel/node";
import {
    ChannelSkeleton,
    NodeListSkeleton,
} from "../channel/channel-skeleton";
import InfiniteScroll from 'react-infinite-scroll-component';
import { Textarea } from "../ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "../ui/drawer";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertTriangle, Edit2, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

export default function Channel({
    channelId,
    onOpenChat,
    onChannelNavigate,
}: {
    channelId: string;
    onOpenChat?: (chatId: string) => void;
    onChannelNavigate?: (channelId: string, nodeId?: string) => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedVariant, setSelectedVariant] = useState("all");
    const [selectedUsers, setSelectedUsers] = useState<string[]>(["all"]);
    const [sortBy, setSortBy] = useState("latest");
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileDrawer, setShowMobileDrawer] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [nodeToDelete, setNodeToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [titleValue, setTitleValue] = useState("");
    const [descriptionValue, setDescriptionValue] = useState("");

    const titleRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const { cacheMetadataForUrl } = useMetadataCache();

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const createNode = useMutation(api.nodes.create);
    const updateChannel = useMutation(api.channels.update);
    const deleteNode = useMutation(api.nodes.remove);
    const updateChatNodeId = useMutation(api.chats.updateChatNodeId);

    // Memoize callback functions to prevent unnecessary re-renders
    const showDeleteConfirmation = useCallback((node: any) => {
        setNodeToDelete(node);
        setShowDeleteDialog(true);
        setShowMobileDrawer(false);
    }, []);

    const showMobileDrawerForNode = useCallback((node: any) => {
        setNodeToDelete(node);
        setShowMobileDrawer(true);
    }, []);
    const channel = useQuery(api.channels.get, {
        id: channelId as Id<"channels">,
    });

    const isChannelLoading = channel == undefined;

    // Get the getUserForNode function from the node user cache hook
    const { getUserForNode, prefetchUsers } = useNodeUserCache();

    // Local store for optimistic updates
    const {
        nodesByChannel,
        loading,
        hasMore,
        addNewNode,
        removeNode,
        syncWithServerData,
        setLoading,
        setHasMore,
        clearChannel,
    } = useNodeStore();

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Clear local store when filters change to force re-fetch
    useEffect(() => {
        clearChannel(channelId);
    }, [debouncedSearch, selectedVariant, selectedUsers, sortBy, channelId, clearChannel]);

    const storedNodes = useMemo(() => nodesByChannel[channelId] || [], [nodesByChannel, channelId]);
    const isLoadingNodes = loading[channelId] || false;
    const isDone = !hasMore[channelId];

    useEffect(() => {
        if (channel?.title) {
            setTitleValue(channel?.title);
        }

        if (channel?.description) {
            setDescriptionValue(channel?.description || "");
        }
    }, [channel?.title, channel?.description]);

    // Use regular query to sync with server data
    const {
        results: serverNodes,
        status,
        loadMore: loadMoreFromServer,
    } = usePaginatedQuery(
        api.nodes.listByChannel,
        {
            channelId: channelId as Id<"channels">,
            filters: {
                search: debouncedSearch || undefined,
                variant: selectedVariant === "all" ? undefined : selectedVariant,
                userIds: selectedUsers.includes("all")
                    ? undefined
                    : (selectedUsers as Id<"users">[]),
                sortBy: sortBy === "latest" ? "oldest" : "latest", // Flip the sort to get newest at bottom
            },
        },
        { initialNumItems: 10 }
    );

    // Sync server data with local store
    useEffect(() => {
        if (serverNodes && serverNodes.length > 0) {
            syncWithServerData(channelId, serverNodes);
        }
        setHasMore(channelId, status !== "Exhausted");
        setLoading(channelId, status === "LoadingMore" || status === "LoadingFirstPage");
    }, [serverNodes, status, channelId, syncWithServerData, setHasMore, setLoading]);

    const loadMore = () => {
        setLoading(channelId, true);
        loadMoreFromServer(10);
    };

    // Pre-fetch unique users from nodes when data changes
    useEffect(() => {
        if (storedNodes && storedNodes.length > 0) {
            const userMap: Set<Id<"users">> = new Set();
            storedNodes.map((node) => {
                if (!userMap.has(node.userId)) {
                    userMap.add(node.userId);
                }
            });
            prefetchUsers(Array.from(userMap));
        }
    }, [storedNodes, prefetchUsers]);

    if (isChannelLoading) {
        return <ChannelSkeleton />;
    }

    const handleTitleSave = async () => {
        setIsEditingTitle(false);
        if (titleValue.trim() !== channel.title) {
            await updateChannel({
                id: channelId as Id<"channels">,
                title: titleValue.trim(),
            });
        }
    };

    const handleDescriptionSave = async () => {
        setIsEditingDescription(false);
        if (
            descriptionValue &&
            descriptionValue.trim() !== (channel.description || "")
        ) {
            await updateChannel({
                id: channelId as Id<"channels">,
                description: descriptionValue.trim(),
            });
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleTitleSave();
        } else if (e.key === "Escape") {
            setTitleValue(channel.title);
            setIsEditingTitle(false);
        }
    };

    const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && e.metaKey) {
            handleDescriptionSave();
        } else if (e.key === "Escape") {
            setDescriptionValue(channel.description || "");
            setIsEditingDescription(false);
        }
    };


    const handleNodeCreation = async (
        data: Omit<CreateNodeArgs, "channel">
    ) => {
        // Cache OG metadata for URLs
        if (data.value) {
            await cacheMetadataForUrl(data.value);
        }

        try {
            const nodeId = await createNode({ ...data, channel: channelId as Id<"channels"> });

            // Add optimistically to local store
            let node = {
                _id: nodeId, _creationTime: Date.now(),
                title: data.title,
                variant: data.variant,
                value: data.value,
                thought: data.thought,
                frame: data.frameId,
                channel: channelId as Id<"channels">,
                vision: channel?.vision,
                userId: "" as Id<"users">, // This will be filled by server
                updatedAt: new Date().toISOString(),
                frameTitle: null,
            };
            addNewNode(channelId, node);

            // If this is an AI node and the value looks like a chatId, update the chat to link to this node
            if (data.variant === "AI" && data.value) {
                try {
                    await updateChatNodeId({
                        chatId: data.value as Id<"chats">,
                        nodeId: nodeId,
                    });
                } catch (error) {
                    console.error("Failed to link chat to node:", error);
                }
            }

            setSortBy("latest");
            requestAnimationFrame(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({
                        top: scrollContainerRef.current.scrollHeight,
                        behavior: "smooth",
                    });
                }
            });
        } catch (error) {
            // Remove optimistic update on error
            console.error("Failed to create node:", error);
        }
    };


    const confirmDelete = async () => {
        if (!nodeToDelete) return;
        setIsDeleting(true);

        // Optimistic update: remove from local store immediately
        const nodeId = nodeToDelete._id as Id<"nodes">;
        const nodeBackup = nodeToDelete; // Keep backup for rollback
        removeNode(channelId, nodeId);

        try {
            await deleteNode({ id: nodeId });
            setShowDeleteDialog(false);
            setNodeToDelete(null);
        } catch (error) {
            // Rollback: re-add the node on error
            addNewNode(channelId, nodeBackup);
            console.error('Failed to delete node:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteDialog(false);
        setNodeToDelete(null);
        setIsDeleting(false);
    };


    const hideMobileDrawer = () => {
        setShowMobileDrawer(false);
        setNodeToDelete(null);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header Section - Fixed, no scroll */}
            <div className={cn(
                "flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                isMobile ? "px-3 py-3 space-y-3" : "px-8 py-4 space-y-4"
            )}>
                {/* Title and Description - Desktop Only */}
                {!isMobile && (
                    <div className="space-y-1">
                        {isEditingTitle ? (
                            <input
                                ref={titleRef}
                                value={titleValue}
                                onChange={(e) => setTitleValue(e.target.value)}
                                onBlur={handleTitleSave}
                                onKeyDown={handleTitleKeyDown}
                                className="bg-transparent border-none outline-none w-full p-0 m-0 font-semibold text-3xl"
                            />
                        ) : (
                            <div
                                className="group cursor-pointer flex items-center gap-2"
                                onClick={() => setIsEditingTitle(true)}
                            >
                                <h1 className="font-semibold text-3xl">{titleValue}</h1>
                                <svg
                                    className="opacity-0 group-hover:opacity-50 transition-opacity w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                </svg>
                            </div>
                        )}

                        {isEditingDescription ? (
                            <textarea
                                ref={descriptionRef}
                                value={descriptionValue}
                                onChange={(e) => setDescriptionValue(e.target.value)}
                                onBlur={handleDescriptionSave}
                                onKeyDown={handleDescriptionKeyDown}
                                className="text-muted-foreground bg-transparent border-none outline-none w-full p-0 m-0 resize-none text-sm h-12"
                                rows={2}
                            />
                        ) : (
                            <div className="group flex items-start">
                                <button
                                    className="text-left cursor-pointer flex items-start w-full h-12"
                                    onClick={() => setIsEditingDescription(true)}
                                >
                                    <h2 className="text-muted-foreground text-sm">
                                        {descriptionValue || "Add description..."}
                                    </h2>
                                </button>
                                <svg
                                    className="opacity-0 group-hover:opacity-50 transition-opacity ml-2 flex-shrink-0 w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>
                )}

                {/* Search and Filter Controls */}
                {isMobile ? (
                    // Mobile: Info button + Filter button + Search
                    <div className="flex gap-2 items-center">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                                size={14}
                            />
                            <Input
                                type="text"
                                placeholder="Search nodes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-9 rounded-md"
                            />
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-3 text-xs"
                                >
                                    <Filter size={14} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="end" alignOffset={-45}>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Content Type</label>
                                        <Select
                                            value={selectedVariant}
                                            onValueChange={setSelectedVariant}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="All types" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All types</SelectItem>
                                                {NODE_VARIANTS.map((variant) => (
                                                    <SelectItem
                                                        key={variant.value}
                                                        value={variant.value}
                                                    >
                                                        {variant.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Sort By</label>
                                        <Select value={sortBy} onValueChange={setSortBy}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Sort by" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="latest">Latest first</SelectItem>
                                                <SelectItem value="oldest">Oldest first</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {channel?.vision && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Users</label>
                                            <MultiUserSelector
                                                visionId={channel.vision}
                                                value={selectedUsers}
                                                onValueChange={setSelectedUsers}
                                                placeholder="All users"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Channel Info Button - Mobile Only */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-3 text-xs"
                                >
                                    <Info size={14} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="end">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Channel Title</label>
                                        <Input
                                            ref={titleRef}
                                            value={titleValue}
                                            onChange={(e) => setTitleValue(e.target.value)}
                                            onBlur={handleTitleSave}
                                            className="w-full px-3 py-2 rounded-md"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Description</label>
                                        <Textarea
                                            ref={descriptionRef}
                                            value={descriptionValue}
                                            onChange={(e) => setDescriptionValue(e.target.value)}
                                            onBlur={handleDescriptionSave}
                                            className="w-full px-3 py-2 border rounded-md resize-none"
                                            rows={5}
                                        />
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                    </div>
                ) : (
                    // Desktop: Original layout
                    <div className="flex gap-2 items-center justify-between">
                        {/* Filters Row */}
                        <div className="flex gap-2 items-center">
                            <div className="flex gap-2">
                                <Select
                                    value={selectedVariant}
                                    onValueChange={setSelectedVariant}
                                >
                                    <SelectTrigger className="h-8 w-auto text-xs">
                                        <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        {NODE_VARIANTS.map((variant) => (
                                            <SelectItem
                                                key={variant.value}
                                                value={variant.value}
                                            >
                                                {variant.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="h-8 w-auto text-xs">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="latest">Latest first</SelectItem>
                                        <SelectItem value="oldest">Oldest first</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {channel?.vision && (
                                <MultiUserSelector
                                    visionId={channel.vision}
                                    value={selectedUsers}
                                    onValueChange={setSelectedUsers}
                                    placeholder="All users"
                                    className="h-8 w-auto text-xs"
                                />
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative w-64">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                                size={14}
                            />
                            <Input
                                type="text"
                                placeholder="Search nodes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-8 rounded-md"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Scrollable Nodes Content - This is the ONLY scrolling area */}
            <div className="overflow-hidden">
                <div
                    id={channelId}
                    ref={scrollContainerRef}
                    className={cn(
                        "flex h-full overflow-y-auto",
                        sortBy === "latest" ? "flex-col-reverse" : "flex-col",
                        isMobile ? "px-3" : "px-8"
                    )}
                >
                    <InfiniteScroll
                        dataLength={storedNodes.length}
                        next={() => loadMore()}
                        className={cn(
                            "flex scroll-smooth",
                            sortBy === "latest" ? "flex-col-reverse" : "flex-col",
                            isMobile ? "gap-4 py-4" : "gap-6 py-6"
                        )}
                        inverse={sortBy === "latest"}
                        hasMore={!isDone}
                        loader={<NodeListSkeleton count={1} />}
                        scrollableTarget={channelId}
                    >
                        {storedNodes.length === 0 && !isLoadingNodes ? (
                            <div className={cn(
                                "text-center text-muted-foreground/70",
                                isMobile ? "text-xs py-8" : "text-sm py-12"
                            )}>
                                No nodes found.
                            </div>
                        ) : (
                            <>
                                <div className={`${sortBy === "latest" ? "inline" : "hidden"} ${isMobile ? "h-25" : "h-20"} shrink-0`} />
                                {storedNodes.map((node, i) => {
                                    const nodeUser = getUserForNode(node.userId);
                                    return (
                                        <div key={i}>
                                            <ChannelNode
                                                node={node}
                                                nodeUser={nodeUser}
                                                onOpenChat={onOpenChat}
                                                onChannelNavigate={onChannelNavigate}
                                                onShowDeleteDialog={() => showDeleteConfirmation(node)}
                                                onShowMobileDrawer={() => showMobileDrawerForNode(node)}
                                                isMobile={isMobile}
                                            />
                                        </div>
                                    );
                                })}
                                <div className={`${sortBy === "latest" ? "hidden" : "inline"} ${isMobile ? "h-25" : "h-20"} shrink-0`} />
                            </>
                        )}
                    </InfiniteScroll>
                </div>
            </div>

            {/* Fixed Paste Bin at Bottom */}
            <PasteBin
                onCreateNode={handleNodeCreation}
                channelId={channelId}
                visionId={channel?.vision || ""}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={(open) => {
                if (!open) cancelDelete();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Delete Node
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this node?
                        </DialogDescription>
                    </DialogHeader>
                    <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            <strong>Warning:</strong> This action cannot be undone. Deleting this node will permanently remove:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>The node content and metadata</li>
                                <li>All associated data</li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={cancelDelete}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {isDeleting ? 'Deleting...' : 'Delete Node'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mobile Action Drawer */}
            <Drawer open={showMobileDrawer} onOpenChange={hideMobileDrawer}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Node Actions</DrawerTitle>
                        <DrawerDescription className="text-sm truncate">
                            {nodeToDelete?.value && nodeToDelete.value.length > 50
                                ? `${nodeToDelete.value.substring(0, 50)}...`
                                : nodeToDelete?.value || ''}
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4">
                        <div className="flex gap-3">
                            {nodeToDelete?.variant === 'text' && (
                                <Button
                                    variant="outline"
                                    className="flex-1 flex items-center gap-2 h-12"
                                    onClick={() => {
                                        // TODO: Need to implement edit mode trigger
                                        hideMobileDrawer();
                                    }}
                                    disabled
                                >
                                    <Edit2 size={16} />
                                    Edit (Coming Soon)
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                className="flex-1 flex items-center gap-2 h-12"
                                onClick={() => showDeleteConfirmation(nodeToDelete)}
                            >
                                <Trash2 size={16} />
                                Delete
                            </Button>
                        </div>
                    </div>

                    <DrawerFooter>
                        <Button variant="outline" onClick={hideMobileDrawer}>
                            Cancel
                        </Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
