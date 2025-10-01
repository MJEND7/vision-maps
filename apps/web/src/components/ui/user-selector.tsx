"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User, Crown } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export type VisionUser = {
    _id: Id<"users">
    name: string
    email?: string
    profileImage?: string
    role: string
}

interface UserSelectorProps {
    visionId: Id<"visions">
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function UserSelector({
    visionId,
    value,
    onValueChange,
    placeholder = "Select user...",
    className
}: UserSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [debouncedSearch, setDebouncedSearch] = React.useState("")

    // Debounce search input
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    const visionUsers = useQuery(api.channels.getVisionUsers, {
        visionId,
        search: debouncedSearch || undefined
    })

    const selectedUser = visionUsers?.find((user) => user._id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size={"sm"}
                    role="combobox"
                    aria-expanded={open}
                    className={cn("justify-between", className)}
                >
                    {selectedUser ? (
                        <div className="flex items-center gap-2">
                            <Avatar className="h-4 w-4">
                                <AvatarImage src={selectedUser.profileImage} alt={selectedUser.name} />
                                <AvatarFallback className="text-xs">
                                    {selectedUser.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{selectedUser.name}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span>{placeholder}</span>
                        </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search users..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value="all"
                                onSelect={() => {
                                    onValueChange("all")
                                    setOpen(false)
                                }}
                                className="cursor-pointer"
                            >
                                <Check
                                    className={cn(
                                        "h-2 w-2",
                                        value === "all" ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" />
                                    <span>All users</span>
                                </div>
                            </CommandItem>
                            {visionUsers?.map((user) => (
                                <CommandItem
                                    key={user._id}
                                    value={user._id}
                                    onSelect={() => {
                                        onValueChange(user._id)
                                        setOpen(false)
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "h-2 w-2",
                                            value === user._id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex items-center gap-2 flex-1">
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage src={user.profileImage} alt={user.name} />
                                            <AvatarFallback className="text-xs">
                                                {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col flex-1">
                                            <span className="text-sm truncate">{user.name}</span>
                                            {user.email && (
                                                <span className="text-xs trucate text-muted-foreground">{user.email}</span>
                                            )}
                                        </div>
                                        {user.role === "owner" && (
                                            <Crown className="h-3 w-3 text-yellow-500" />
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
