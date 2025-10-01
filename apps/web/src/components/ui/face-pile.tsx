import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getUserAvatarFallbackInitials } from "@/utils/user";
import usePresence from "@convex-dev/presence/react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { cn } from "@/lib/utils";
import { timeSinceFromDateString } from "@/utils/date";
import { Skeleton } from "./skeleton";
import { ActiveUsers } from "../../../convex/tables/user";
import { UserResource } from "@clerk/types";
import { InviteUsersDialogue } from "./invite-users-dialogue";

type User = {
    name: string;
    image: string | null;
    email: string | null;
    userId: string;
    online: boolean;
    lastDisconnected: number;
};

interface CoreFacePileProps {
    users: User[];
    visionId: string;
    maxVisible?: number;
    currentUser?: UserResource | null;
    isLoading?: boolean;
}

function CoreFacePile({ visionId, users, maxVisible = 3, currentUser, isLoading }: CoreFacePileProps) {
    if (isLoading) {
        return (
            <div className="flex -space-x-2">
                {Array.from({ length: maxVisible }, (_, i) => (
                    <Skeleton key={i} className="sm:w-7 sm:h-7 h-5 w-5 rounded-full border border-accent" />
                ))}
            </div>
        );
    }

    if (!users || users.length === 0) {
        return (
            <div className={"w-7 h-7"} />
        );
    }

    const visibleUsers = users.slice(0, maxVisible);
    const remainingUsersCount = Math.max(0, users.length - maxVisible);

    return (
        <TooltipProvider>
            <InviteUsersDialogue vision={visionId as any}>
                <div className={cn("flex -space-x-2", "cursor-pointer")}>
                    {visibleUsers.map((user, index) => (
                        <Tooltip key={user.userId || index}>
                            <TooltipTrigger asChild>
                                <Avatar className={cn(`sm:w-7 sm:h-7 h-5 w-5 border border-accent bg-accent`)}>
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
            </InviteUsersDialogue>
        </TooltipProvider>
    );
}

interface StaticFacePileProps {
    visionId: string;
    maxVisible?: number;
}

export function StaticFacePile({ visionId, maxVisible }: StaticFacePileProps) {
    const { user: currentUser } = useUser();
    const users = useQuery(
        api.presence.listRoom,
        { roomToken: `vision:${visionId}` }
    );

    return <CoreFacePile visionId={visionId} users={users || []} maxVisible={maxVisible} currentUser={currentUser} isLoading={users === undefined} />;
}

interface PresenceFacePileProps {
    visionId: string;
    maxVisible?: number;
}

export function PresenceFacePile({ visionId, maxVisible }: PresenceFacePileProps) {
    const { user: currentUser } = useUser();
    const users = usePresence(
        api.presence as any,
        `vision:${visionId}`,
        currentUser?.id || "anonymous",
    ) as ActiveUsers;

    return <CoreFacePile visionId={visionId} users={users || []} maxVisible={maxVisible} currentUser={currentUser} isLoading={users === undefined} />;
}

export default StaticFacePile;
