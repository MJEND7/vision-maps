"use client";

import {
    useQuery,
    useMutation,
    usePaginatedQuery,
} from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { MultiUserSelector } from "@/components/ui/multi-user-selector";
import { useNodeUserCache } from "@/hooks/useUserCache";
import PasteBin from "../channel/paste-bin";
import { UserResource } from "@clerk/types";
import { CreateNodeArgs } from "../../../convex/nodes";
import { NODE_VARIANTS } from "@/lib/constants";
import ChannelNode from "../channel/node";
import {
    ChannelSkeleton,
    NodeListSkeleton,
} from "../channel/channel-skeleton";
import InfiniteScroll from 'react-infinite-scroll-component';
import { Textarea } from "../ui/textarea";

export default function Channel({
    channelId,
    user,
    onOpenChat,
}: {
    channelId: string;
    user: UserResource;
    onOpenChat?: (chatId: string) => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedVariant, setSelectedVariant] = useState("all");
    const [selectedUsers, setSelectedUsers] = useState<string[]>(["all"]);
    const [sortBy, setSortBy] = useState("latest");
    const [isMobile, setIsMobile] = useState(false);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [titleValue, setTitleValue] = useState("");
    const [descriptionValue, setDescriptionValue] = useState("");

    const titleRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const createNode = useMutation(api.nodes.create);
    const updateChannel = useMutation(api.channels.update);
    const channel = useQuery(api.channels.get, {
        id: channelId as Id<"channels">,
    });

    const isChannelLoading = channel == undefined;

    // Get the getUserForNode function from the node user cache hook
    const { getUserForNode, prefetchUsers } = useNodeUserCache();

    useEffect(() => {
        if (channel?.title) {
            setTitleValue(channel?.title);
        }

        if (channel?.description) {
            setDescriptionValue(channel?.description || "");
        }
    }, [channel?.title, channel?.description]);

    const {
        results: storedNodes,
        status,
        loadMore,
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

    const isDone = status == "Exhausted";
    const isLoadingNodes =
        status == "LoadingMore" || status == "LoadingFirstPage";

    // Pre-fetch unique users from nodes when data changes
    useEffect(() => {
        if (storedNodes.length > 0) {
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
        await createNode({ ...data, channel: channelId as Id<"channels"> });
        setSortBy("latest");
        requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: "smooth",
                });
            }
        });
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
                    id="scrollableDiv"
                    ref={scrollContainerRef}
                    className={cn(
                        "flex h-full overflow-y-auto",
                        sortBy === "latest" ? "flex-col-reverse" : "flex-col",
                        isMobile ? "px-3" : "px-8"
                    )}
                >
                    <InfiniteScroll
                        dataLength={storedNodes.length}
                        next={() => loadMore(10)}
                        className={cn(
                            "flex scroll-smooth",
                            sortBy === "latest" ? "flex-col-reverse" : "flex-col",
                            isMobile ? "gap-4 py-4" : "gap-6 py-6"
                        )}
                        inverse={sortBy === "latest"}
                        hasMore={!isDone}
                        loader={<NodeListSkeleton count={1} />}
                        scrollableTarget="scrollableDiv"
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
                                            <ChannelNode node={node} nodeUser={nodeUser} onOpenChat={onOpenChat} />
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
            <PasteBin onCreateNode={handleNodeCreation} user={user} />
        </div>
    );
}
