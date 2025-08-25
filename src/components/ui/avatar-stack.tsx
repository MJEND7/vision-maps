import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatarAltText, getUserAvatarFallbackInitials } from "@/utils/user";
import { UserData } from "@clerk/types";

const AvatarStack = ({ users }: { users: UserData[] }) => {
    const visibleUsers = users.slice(0, 3); // Get the first 4 users
    const remainingUsersCount = users.length - visibleUsers.length; // Calculate remaining

    return (
        <div className="flex -space-x-2 overflow-hidden">
            {visibleUsers.map((user, index) => (
                <Avatar key={index} className="border-2 border-white">
                    <AvatarImage src={user.imageUrl} alt={getUserAvatarAltText(user)} />
                    <AvatarFallback>{getUserAvatarFallbackInitials(user)}</AvatarFallback>
                </Avatar>
            ))}

            {remainingUsersCount > 0 && (
                <Avatar className="border-2 border-white bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-medium">
                    <AvatarFallback>+{remainingUsersCount}</AvatarFallback>
                </Avatar>
            )}
        </div>
    );
};

export default AvatarStack;
