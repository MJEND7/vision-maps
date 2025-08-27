import { UserButton, useUser } from "@clerk/nextjs";
import { Skeleton } from "./skeleton";

export default function UserAvatar() {
    const { isLoaded } = useUser();

    if (!isLoaded) {
        return <Skeleton className="dark:bg-muted bg-gray-200 w-8 h-8 rounded-full" />;
    }

    return (
        <UserButton
            appearance={{
                elements: { avatarBox: "w-8 h-8" },
            }}
        />
    )
}
