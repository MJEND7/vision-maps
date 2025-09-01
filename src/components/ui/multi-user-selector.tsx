"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User, Crown, X, Users } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export type VisionUser = {
  _id: Id<"users">
  name: string
  email?: string
  profileImage?: string
  role: string
}

interface MultiUserSelectorProps {
  visionId: Id<"visions">
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiUserSelector({
  visionId,
  value,
  onValueChange,
  placeholder = "Select users...",
  className
}: MultiUserSelectorProps) {
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

  const selectedUsers = visionUsers?.filter((user) => value.includes(user._id)) || []
  const hasAllSelected = value.includes("all")

  const handleToggleUser = (userId: string) => {
    if (userId === "all") {
      // If selecting "all", clear individual selections
      if (hasAllSelected) {
        onValueChange([])
      } else {
        onValueChange(["all"])
      }
    } else {
      // If selecting individual user, remove "all" if present
      const newValue = value.filter(id => id !== "all")
      
      if (newValue.includes(userId)) {
        // Remove user
        onValueChange(newValue.filter(id => id !== userId))
      } else {
        // Add user
        onValueChange([...newValue, userId])
      }
    }
  }

  const removeUser = (userId: string) => {
    if (userId === "all") {
      onValueChange([])
    } else {
      onValueChange(value.filter(id => id !== userId))
    }
  }

  const displayText = () => {
    if (hasAllSelected) {
      return "All users"
    }
    if (selectedUsers.length === 0) {
      return placeholder
    }
    if (selectedUsers.length === 1) {
      return selectedUsers[0].name
    }
    return `${selectedUsers.length} users selected`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between min-w-[200px]", className)}
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            {hasAllSelected ? (
              <>
                <Users className="h-4 w-4" />
                <span className="truncate">All users</span>
              </>
            ) : selectedUsers.length > 0 ? (
              <div className="flex items-center gap-1 flex-1 overflow-hidden">
                <Users className="h-4 w-4" />
                <span className="truncate">{displayText()}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
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
                onSelect={() => handleToggleUser("all")}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    hasAllSelected ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>All users</span>
                </div>
              </CommandItem>
              {visionUsers?.map((user) => {
                const isSelected = value.includes(user._id)
                return (
                  <CommandItem
                    key={user._id}
                    value={user._id}
                    onSelect={() => handleToggleUser(user._id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
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
                          <span className="text-xs truncate text-muted-foreground">{user.email}</span>
                        )}
                      </div>
                      {user.role === "owner" && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        
        {/* Selected users badges */}
        {!hasAllSelected && selectedUsers.length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <div className="flex flex-wrap gap-1">
              {selectedUsers.map((user) => (
                <Badge
                  key={user._id}
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  <Avatar className="h-3 w-3">
                    <AvatarImage src={user.profileImage} alt={user.name} />
                    <AvatarFallback className="text-[8px]">
                      {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[80px]">{user.name}</span>
                  {user.role === "owner" && (
                    <Crown className="h-2 w-2 text-yellow-500" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeUser(user._id)
                    }}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-sm p-0.5"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}