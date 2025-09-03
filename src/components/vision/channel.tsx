"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useState, useRef, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiUserSelector } from "@/components/ui/multi-user-selector"
import { useNodeUserCache } from "@/hooks/useUserCache"
import PasteBin from "../channel/paste-bin"
import { UserResource } from "@clerk/types"
import { CreateNodeArgs } from "../../../convex/nodes"
import { NODE_VARIANTS } from "@/lib/constants"
import ChannelNode from "../channel/node"

export default function Channel({ channelId, user }: { channelId: string, user: UserResource }) {
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [selectedVariant, setSelectedVariant] = useState("all")
    const [selectedUsers, setSelectedUsers] = useState<string[]>(["all"])
    const [sortBy, setSortBy] = useState("latest")

    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [isEditingDescription, setIsEditingDescription] = useState(false)
    const [titleValue, setTitleValue] = useState("")
    const [descriptionValue, setDescriptionValue] = useState("")

    const titleRef = useRef<HTMLInputElement>(null)
    const descriptionRef = useRef<HTMLTextAreaElement>(null)

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const data = useQuery(api.channels.getWithNodes, {
        id: channelId as Id<"channels">,
        filters: {
            search: debouncedSearch || undefined,
            variant: selectedVariant === "all" ? undefined : selectedVariant,
            userIds: selectedUsers.includes("all") ? undefined : selectedUsers as Id<"users">[],
            sortBy: sortBy
        }
    })
    const updateChannel = useMutation(api.channels.update)
    const isLoading = data == undefined

    const createNode = useMutation(api.nodes.create);

    // Get the getUserForNode function from the node user cache hook
    const { getUserForNode, prefetchUsers } = useNodeUserCache()

    useEffect(() => {
        if (data?.channel) {
            setTitleValue(data.channel.title)
            setDescriptionValue(data.channel.description || "")
        }
    }, [data?.channel])

    // Pre-fetch unique users from nodes when data changes
    useEffect(() => {
        if (data?.nodes) {
            // Extract unique user IDs from nodes
            const uniqueUserIds = Array.from(new Set(data.nodes.map(node => node.userId)))
            // Pre-fetch these users
            prefetchUsers(uniqueUserIds)
        }
    }, [data?.nodes, prefetchUsers])

    useEffect(() => {
        if (isEditingTitle && titleRef.current) {
            titleRef.current.focus()
        }
    }, [isEditingTitle])

    useEffect(() => {
        if (isEditingDescription && descriptionRef.current) {
            descriptionRef.current.focus()
        }
    }, [isEditingDescription])

    if (isLoading) {
        return null
    }

    const channel = data.channel;

    const handleTitleSave = async () => {
        if (titleValue.trim() !== channel.title) {
            await updateChannel({
                id: channelId as Id<"channels">,
                title: titleValue.trim()
            })
        }
        setIsEditingTitle(false)
    }

    const handleDescriptionSave = async () => {
        if (descriptionValue.trim() !== (channel.description || "")) {
            await updateChannel({
                id: channelId as Id<"channels">,
                description: descriptionValue.trim()
            })
        }
        setIsEditingDescription(false)
    }

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTitleSave()
        } else if (e.key === 'Escape') {
            setTitleValue(channel.title)
            setIsEditingTitle(false)
        }
    }

    const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.metaKey) {
            handleDescriptionSave()
        } else if (e.key === 'Escape') {
            setDescriptionValue(channel.description || "")
            setIsEditingDescription(false)
        }
    }

    const handleNodeCreation = async (data: Omit<CreateNodeArgs, "channel">) => {
        console.log("Node: ", data)
        await createNode({ ...data, channel: channelId as Id<"channels"> });
        //TODO some loading state stuff
    }

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
                            <h1 className="font-semibold text-3xl">
                                {channel.title}
                            </h1>
                            <svg
                                className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
                                    {channel.description || "Add description..."}
                                </h2>
                            </button>
                            <svg
                                className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </div>
                    )}
                </div>
                <hr />

                {/* Search and Filter Controls */}
                <div className="relative flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                    <div className="flex w-full gap-2 items-center">
                        <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                            <SelectTrigger size='sm' className='sm:w-auto w-full'>
                                <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                {NODE_VARIANTS.map((variant) => (
                                    <SelectItem key={variant.value} value={variant.value}>
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

                        {data?.channel?.vision && (
                            <MultiUserSelector
                                visionId={data.channel.vision}
                                value={selectedUsers}
                                onValueChange={setSelectedUsers}
                                placeholder="All users"
                                className="sm:w-auto w-full text-xs"
                            />
                        )}
                    </div>

                    <div className="sm:w-auto w-full flex gap-2">
                        <div className="relative w-full sm:w-[300px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
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
            <div className="h-[75%] relative flex flex-col items-start space-y-8">
                {isLoading ? (
                    <div className="text-center text-gray-500 py-10">
                        Loading nodes...
                    </div>
                ) : data.nodes.length === 0 ? (
                    <div className="text-sm text-center text-muted-foreground/70 py-10">
                        No nodes found.
                    </div>
                ) : (
                    data.nodes.map((node) => {
                        const nodeUser = getUserForNode(node.userId)
                        return (
                            <div key={node._id}>
                                <ChannelNode node={node} nodeUser={nodeUser} />
                            </div>
                        )
                    })
                )}
            </div>
            <PasteBin onCreateNode={handleNodeCreation} user={user} />
        </div >
    )
}
