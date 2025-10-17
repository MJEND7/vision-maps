import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getUserAvatarFallbackInitials } from "@/utils/user";
import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { Input } from "./input";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

export function InviteUsersDialogue({
    children,
    vision,
    isOpen: controlledIsOpen,
    onOpenChange: controlledOnOpenChange,
    onInviteUser
}: {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    vision: Id<"visions">;
    onInviteUser?: (userId: string) => void;
    children: React.ReactNode;
}) {
    // Internal state for uncontrolled usage
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [searchTerm, setSearch] = useState("");

    // Use controlled state if provided, otherwise use internal state
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
    const onOpenChange = controlledOnOpenChange || setInternalIsOpen;

    const users = useQuery(api.user.searchUsers, {
        searchTerm: searchTerm,
        vision: vision,
        limit: 10
    });

    const createInviteNotification = useMutation(api.notifications.createInviteNotification);

    const handleInvite = async (user: any) => {
        try {
            await createInviteNotification({
                recipientId: user.externalId,
                visionId: vision,
                role: "editor" // Default role, you might want to make this configurable
            });
            
            if (onInviteUser) {
                onInviteUser(user._id);
            }
            // Close dialog after inviting (optional)
            onOpenChange(false);
            setSearch("")
            console.log("Invited user:", user.name);
        } catch (error) {
            console.error("Failed to invite user:", error);
        }
    };

    // Don't render if vision is not provided
    if (!vision) {
        return <>{children}</>;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite Users</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Search by name or email..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {users && users.length > 0 ? (
                            users.map((user) => (
                                <div
                                    key={user._id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
                                >
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarImage src={user.picture || ""} alt={user.name} />
                                        <AvatarFallback className="text-xs">
                                            {getUserAvatarFallbackInitials(
                                                user.name.split(" ")[0],
                                                user.name.split(" ")[1] || ""
                                            )}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {user.name}
                                        </p>
                                        {user.email && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </p>
                                        )}
                                    </div>
                                    {!user.isInVisions && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInvite(user)}
                                            className="flex-shrink-0"
                                        >
                                            <UserPlus className="h-4 w-4 mr-1" />
                                            Invite
                                        </Button>
                                    )}
                                </div>
                            ))
                        ) : searchTerm ? (
                            <div className="text-center py-4 text-muted-foreground">
                                <p className="text-sm">No users found matching &quot;{searchTerm}&quot;</p>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">
                                <p className="text-sm">Start typing to search for users</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
