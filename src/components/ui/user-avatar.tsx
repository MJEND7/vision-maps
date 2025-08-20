import { UserButton } from "@clerk/nextjs";

export default function UserAvatar() {
    return (
        <UserButton
            appearance={{
                elements: { avatarBox: "w-8 h-8" },
            }}
        />
    )
}
