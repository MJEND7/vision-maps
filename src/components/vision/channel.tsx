"use client";

import {
    useQuery,
    useMutation,
    usePaginatedQuery,
} from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

export default function Channel({
    channelId,
    user,
}: {
    channelId: string;
    user: UserResource;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedVariant, setSelectedVariant] = useState("all");
    const [selectedUsers, setSelectedUsers] = useState<string[]>(["all"]);
    const [sortBy, setSortBy] = useState("latest");

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [titleValue, setTitleValue] = useState("");
    const [descriptionValue, setDescriptionValue] = useState("");

    const titleRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        <div className="h-full px-20 py-6 space-y-8">
            <div className="space-y-2">
                <div>
                    {isEditingTitle ? (
                        <input
                            ref={titleRef}
                            value={titleValue}
                            onChange={(e) => setTitleValue(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={handleTitleKeyDown}
                            className="text-3xl bg-transparent border-none outline-none w-full p-0 m-0"
                        />
                    ) : (
                        <div
                            className="group cursor-pointer flex items-center gap-2"
                            onClick={() => setIsEditingTitle(true)}
                        >
                            <h1 className="font-semibold text-3xl">{titleValue}</h1>
                            <svg
                                className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity"
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
                            className="text-sm text-muted-foreground bg-transparent border-none outline-none h-[60px] w-[65%] p-0 m-0 resize-none"
                            rows={2}
                        />
                    ) : (
                        <div className="group flex flex-1">
                            <button
                                className="text-left cursor-pointer flex items-start h-[60px] w-[65%]"
                                onClick={() => setIsEditingDescription(true)}
                            >
                                <h2 className="text-sm text-muted-foreground">
                                    {descriptionValue || "Add description..."}
                                </h2>
                            </button>
                            <svg
                                className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity"
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
                <hr />

                {/* Search and Filter Controls */}
                <div className="relative flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                    <div className="flex w-full gap-2 items-center">
                        <Select
                            value={selectedVariant}
                            onValueChange={setSelectedVariant}
                        >
                            <SelectTrigger size="sm" className="sm:w-auto w-full">
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
                            <SelectTrigger size="sm">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="latest">Latest first</SelectItem>
                                <SelectItem value="oldest">Oldest first</SelectItem>
                            </SelectContent>
                        </Select>

                        {channel?.vision && (
                            <MultiUserSelector
                                visionId={channel.vision}
                                value={selectedUsers}
                                onValueChange={setSelectedUsers}
                                placeholder="All users"
                                className="sm:w-auto w-full text-xs"
                            />
                        )}
                    </div>

                    <div className="sm:w-auto w-full flex gap-2">
                        <div className="relative w-full sm:w-[300px]">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                                size={16}
                            />
                            <Input
                                type="text"
                                placeholder="Search nodes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-[40px] sm:h-[32px] placeholder:text-xs text-sm rounded-md"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Nodes List */}
            <div
                id="scrollableDiv"
                ref={scrollContainerRef}
                className={`max-h-[80%] relative flex ${sortBy === "latest" ? "flex-col-reverse" : "flex-col"} overflow-y-auto`}
            >
                <InfiniteScroll
                    dataLength={storedNodes.length}
                    next={() => loadMore(10)}
                    className={`flex scroll-smooth ${sortBy === "latest" ? "flex-col-reverse" : "flex-col"} gap-8`}
                    inverse={sortBy === "latest"} //
                    hasMore={!isDone}
                    loader={<NodeListSkeleton count={1} />}
                    scrollableTarget="scrollableDiv"
                >
                    {storedNodes.length === 0 && !isLoadingNodes ? (
                        <div className="text-sm text-center text-muted-foreground/70 py-10">
                            No nodes found.
                        </div>
                    ) : (
                        <>
                            <div className={`${sortBy === "latest" ? "inline" : "hidden"} h-[65px] shrink-0`} />
                            {storedNodes.map((node, i) => {
                                const nodeUser = getUserForNode(node.userId);
                                return (
                                    <div key={i}>
                                        <ChannelNode node={node} nodeUser={nodeUser} />
                                    </div>
                                );
                            })}
                            <div className={`${sortBy === "latest" ? "hidden" : "inline"} h-[65px] shrink-0`} />
                        </>
                    )}

                </InfiniteScroll>
            </div>

            <PasteBin onCreateNode={handleNodeCreation} user={user} />
        </div>
    );
}
