import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useState, useRef, useEffect } from "react"

export default function Channel({ channelId }: { channelId: string }) {
    const data = useQuery(api.channels.getWithNodes, { id: channelId as Id<"channels"> })
    const updateChannel = useMutation(api.channels.update)
    const isLoading = data == undefined

    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [isEditingDescription, setIsEditingDescription] = useState(false)
    const [titleValue, setTitleValue] = useState("")
    const [descriptionValue, setDescriptionValue] = useState("")

    const titleRef = useRef<HTMLInputElement>(null)
    const descriptionRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (data?.channel) {
            setTitleValue(data.channel.title)
            setDescriptionValue(data.channel.description || "")
        }
    }, [data?.channel])

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

    return (
        <div className="px-20 py-6 space-y-4">
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
            <div>
                
            </div >
        </div >
    )
}
