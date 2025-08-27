import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getUserAvatarFallbackInitials } from "@/utils/user";
import usePresence from "@convex-dev/presence/react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { timeSinceFromDateString } from "@/utils/date";
import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";

const facePileVariants = cva(
    "flex -space-x-2",
    {
        variants: {
            variant: {
                presence: "",
                static: "",
            },
        },
        defaultVariants: {
            variant: "presence",
        },
    }
);

interface FacePileProps extends VariantProps<typeof facePileVariants> {
    visionId: string;
    maxVisible?: number;
    roomToken?: string;
}

export default function FacePile({ visionId, maxVisible = 3, variant }: FacePileProps) {
    const { user: currentUser } = useUser();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Use the presence hook for presence variant
    let users: {
        name: string;
        image: string | null;
        email: string | null;
        userId: string;
        online: boolean;
        lastDisconnected: number;
    }[] | undefined = [];

    if (variant == "static") {
        users = useQuery(
            api.presence.listRoom,
            { roomToken: `vision:${visionId}` }
        );
    } else {
        users = usePresence(
            api.presence as any,
            `vision:${visionId}`,
            currentUser?.id || "anonymous",
        ) as any;
    }

    if (!users) {
        return (
            <div className={"w-7 h-7"}/>
        );
    }

    const visibleUsers = users.slice(0, maxVisible);
    const remainingUsersCount = Math.max(0, users.length - maxVisible);
    
    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (users.length === 0) {
        return (
            <div className={"w-7 h-7"}/>
        );
    }

    return (
        <TooltipProvider>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <div className={cn(facePileVariants({ variant }), "cursor-pointer")}>
                        {visibleUsers.map((user, index) => (
                            <Tooltip key={user.userId || index}>
                                <TooltipTrigger asChild>
                                    <Avatar className={cn(`w-7 h-7 border border-accent bg-accent`)}>
                                        <AvatarImage className={`${user.online ? "opacity-100" : "opacity-50 blur-[0.5px]"}  `} src={user.image || ""} alt={user.name} />
                                        <AvatarFallback>{getUserAvatarFallbackInitials(user.name.split(" ")[0], user.name.split(" ")[1])}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent alignOffset={10}>
                                    <div className="text-xs">
                                        <p className="font-medium">{currentUser?.fullName == user.name ? "You" : user.name}</p>
                                        <p className="text-muted-foreground">{user.lastDisconnected == 0 ? "Now" : timeSinceFromDateString(new Date(user.lastDisconnected))}</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ))}

                        {remainingUsersCount > 0 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Avatar className="border-2 border-primary/10 bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                        <AvatarFallback>+{remainingUsersCount}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-sm">{remainingUsersCount} more user{remainingUsersCount > 1 ? 's' : ''}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </DialogTrigger>
                
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Users in this Vision</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                type="text"
                                placeholder="Search by name or email..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {filteredUsers.map((user) => (
                                <div key={user.userId} className={`${user.online ? "hover:cursor-pointer" : "" } flex items-center gap-3 p-2 rounded-lg hover:bg-accent`}>
                                    <Avatar className={cn(
                                        "h-8 w-8 border",
                                        user.online ? "opacity-100" : "opacity-45"
                                    )}>
                                        <AvatarImage src={user.image || ""} alt={user.name} />
                                        <AvatarFallback className="text-xs">
                                            {getUserAvatarFallbackInitials(user.name.split(" ")[0], user.name.split(" ")[1])}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {currentUser?.fullName === user.name ? "You" : user.name}
                                        </p>
                                        {user.email && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {user.lastDisconnected === 0 ? "Online now" : `Last seen ${timeSinceFromDateString(new Date(user.lastDisconnected))}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            
                            {filteredUsers.length === 0 && searchQuery && (
                                <div className="space-y-4">
                                    <div className="text-center py-4 text-muted-foreground">
                                        <p className="text-sm">No users found matching "{searchQuery}"</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full">
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Invite {searchQuery}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}
