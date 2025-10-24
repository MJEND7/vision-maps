"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth, SignOutButton } from "@clerk/nextjs";
import { OwnerType, useSubscription } from "@/hooks/users/useSubscription";
import { toast } from "sonner";
import { BillingTab as SharedBillingTab } from "@/components/billing/BillingTab";
import {
    SessionWithActivitiesResource,
    ExternalAccountResource,
} from "@clerk/types";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Camera,
    User as UserIcon,
    Loader2,
    Mail,
    Shield,
    Smartphone,
    LinkIcon,
    Monitor,
    Laptop,
    RefreshCw,
    ShieldOff,
    DollarSign,
    Trash2,
    LogOut,
} from "lucide-react";
import { Google } from "@/icons/google";
import { Github } from "lucide-react";
import { truncate } from "@/utils/string";
import ThemeSwitcher from "../ThemeSwitcher";

interface ProfileSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Utils
const cn = (...classes: (string | false | undefined)[]) =>
    classes.filter(Boolean).join(" ");

function toFlagEmoji(country?: string) {
    if (!country || country.length !== 2) return "";
    const codePoints = country
        .toUpperCase()
        .split("")
        .map((c) => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

function relativeTimeFromNow(date?: Date) {
    if (!date) return "N/A";
    const d = new Date(date);
    const diffMs = Date.now() - d.getTime();
    const abs = Math.abs(diffMs);
    const units = [
        { label: "year", ms: 1000 * 60 * 60 * 24 * 365 },
        { label: "month", ms: 1000 * 60 * 60 * 24 * 30 },
        { label: "day", ms: 1000 * 60 * 60 * 24 },
        { label: "hour", ms: 1000 * 60 * 60 },
        { label: "min", ms: 1000 * 60 },
        { label: "sec", ms: 1000 },
    ];
    for (const u of units) {
        const amt = Math.floor(abs / u.ms);
        if (amt >= 1) {
            const suffix = diffMs >= 0 ? "ago" : "from now";
            return `${amt} ${u.label}${amt > 1 ? "s" : ""} ${suffix}`;
        }
    }
    return "just now";
}

function getDeviceIcon(activity?: {
    isMobile?: boolean;
    deviceType?: string;
}) {
    if (activity?.isMobile) return Smartphone;
    const type = (activity?.deviceType || "").toLowerCase();
    if (type.includes("laptop")) return Laptop;
    if (
        type.includes("desktop") ||
        type.includes("mac") ||
        type.includes("pc")
    ) {
        return Monitor;
    }
    if (type.includes("phone") || type.includes("mobile")) return Smartphone;
    return Monitor;
}

type ProviderKey =
    | "google"
    | "github"
    | "gitlab"
    | "apple"
    | "facebook"
    | "twitter"
    | "discord"
    | "slack"
    | "microsoft"
    | "linkedin"
    | "unknown";

function providerMeta(provider?: string): {
    name: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    classes: string;
} {
    const p = (provider || "unknown").toLowerCase() as ProviderKey;
    switch (p) {
        case "github":
            return { name: "GitHub", Icon: Github, classes: "bg-zinc-900 text-white" };
        case "google":
        default:
            return {
                name: "Google",
                Icon: Google,
                classes: "bg-zinc-900 text-white"
            };
    }
}

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
    const { user } = useUser();
    const { sessionId: currentSessionId } = useAuth();
    const [sessions, setSessions] = useState<SessionWithActivitiesResource[] | null>(null);
    const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
    const { plan: activePlan, planType, isOnTrial, status, isActive } = useSubscription(user?.id, OwnerType.User);

    const [activeTab, setActiveTab] = useState("profile");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
    const [isUpdatingImage, setIsUpdatingImage] = useState(false);

    useEffect(() => {
        if (user?.firstName) setFirstName(user.firstName);
        if (user?.lastName) setLastName(user.lastName);
    }, [user?.firstName, user?.lastName]);

    const fetchSessions = async () => {
        if (!user) return;
        setSessionsLoading(true);
        try {
            const s = await user.getSessions();
            setSessions(s as unknown as SessionWithActivitiesResource[]);
        } catch {
            toast.error("Failed to load sessions");
        } finally {
            setSessionsLoading(false);
        }
    };

    useEffect(() => {
        if (open && user) {
            fetchSessions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user]);


    const handleUpdateName = async () => {
        if (!firstName.trim() && !lastName.trim()) return;
        if (firstName === user?.firstName && lastName === user?.lastName) return;

        setIsUpdatingName(true);
        try {
            await user?.update({
                firstName: firstName.trim(),
                lastName: lastName.trim()
            });
            toast.success("Name updated successfully");
        } catch {
            toast.error("Failed to update name");
        } finally {
            setIsUpdatingName(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) {
                toast.error("Image must be less than 4MB.");
                return;
            }
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateImage = async () => {
        if (!profileImage || !profileImagePreview) return;
        setIsUpdatingImage(true);
        try {
            // Clerk expects base64 encoded image, which we already have from FileReader
            await user?.setProfileImage({ file: profileImagePreview });
            toast.success("Profile image updated successfully");
            setProfileImage(null);
            setProfileImagePreview(null);
        } catch (error) {
            console.error("Failed to update profile image:", error);
            toast.error("Failed to update profile image");
        } finally {
            setIsUpdatingImage(false);
        }
    };

    const getPlanBadgeColor = () => {
        if (planType === "team")
            return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
        if (planType === "pro")
            return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    };

    const getPlanDisplayName = () => {
        if (planType === "team") return "Team";
        if (planType === "pro") return "Pro";
        return "Free";
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col gap-0 sm:max-w-[800px] max-w-[95vw] h-[90vh] sm:h-[60vh] max-h-[95vh] overflow-hidden p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Manage your account and preferences</DialogDescription>
                    <div className="absolute top-4 right-4">
                        <ThemeSwitcher size={"lg"}/>
                    </div>
                </DialogHeader>

                <div className="flex flex-col sm:flex-row h-full overflow-hidden">
                    {/* Sidebar Navigation */}
                    <div className="w-full flex flex-col justify-between sm:w-60 border-r sm:border-r border-b sm:border-b-0 bg-muted/30 p-4 sm:p-6 flex-shrink-0">
                        <nav className="flex sm:flex-col gap-2 sm:space-y-2 overflow-x-auto sm:overflow-x-visible scrollbar-hide">
                            <button
                                onClick={() => setActiveTab("profile")}
                                className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${activeTab === "profile"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                            >
                                <UserIcon className="w-4 h-4" />
                                <span className="font-medium whitespace-nowrap">Profile</span>
                            </button>

                            <button
                                onClick={() => setActiveTab("security")}
                                className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${activeTab === "security"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                            >
                                <Shield className="w-4 h-4" />
                                <span className="font-medium whitespace-nowrap">Security</span>
                            </button>

                            <button
                                onClick={() => setActiveTab("billing")}
                                className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${activeTab === "billing"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                            >
                                <DollarSign className="w-4 h-4" />
                                <span className="font-medium whitespace-nowrap">Billing</span>
                            </button>
                        </nav>

                        <SignOutButton>
                            <button
                                className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left rounded-lg transition-colors hover:bg-red-300/30 hover:text-red-400`}
                            >
                                <LogOut className="w-4 h-4 " />
                                <span className="font-medium whitespace-nowrap">Logout</span>
                            </button>
                        </SignOutButton>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-hidden">
                        <div className="h-full overflow-y-auto scrollbar-hide p-4">
                            {activeTab === "profile" && (
                                <ProfileTab
                                    user={user}
                                    firstName={firstName}
                                    setFirstName={setFirstName}
                                    lastName={lastName}
                                    setLastName={setLastName}
                                    isUpdatingName={isUpdatingName}
                                    handleUpdateName={handleUpdateName}
                                    profileImage={profileImage}
                                    profileImagePreview={profileImagePreview}
                                    handleImageSelect={handleImageSelect}
                                    handleUpdateImage={handleUpdateImage}
                                    isUpdatingImage={isUpdatingImage}
                                    setProfileImage={setProfileImage}
                                    setProfileImagePreview={setProfileImagePreview}
                                />
                            )}

                            {activeTab === "security" && (
                                <SecurityTab
                                    user={user}
                                    sessions={sessions}
                                    sessionsLoading={sessionsLoading}
                                    fetchSessions={fetchSessions}
                                    currentSessionId={currentSessionId}
                                />
                            )}

                            {activeTab === "billing" && user?.id && (
                                <SharedBillingTab
                                    ownerId={user.id}
                                    ownerType="user"
                                    plan={activePlan}
                                    planType={planType}
                                    isOnTrial={isOnTrial}
                                    status={status}
                                    isActive={isActive}
                                    getPlanBadgeColor={getPlanBadgeColor}
                                    getPlanDisplayName={getPlanDisplayName}
                                    canManageBilling={true}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Profile Tab Component
function ProfileTab({
    user,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    isUpdatingName,
    handleUpdateName,
    profileImage,
    profileImagePreview,
    handleImageSelect,
    handleUpdateImage,
    isUpdatingImage,
    setProfileImage,
    setProfileImagePreview,
}: any) {
    return (
        <div className="space-y-6">

            <div className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
                {/* Avatar + Name */}
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                    <div className="relative">
                        <Avatar className="h-20 w-20">
                            <AvatarImage
                                src={profileImagePreview || user?.imageUrl}
                                alt={user?.fullName || "User avatar"}
                            />
                            <AvatarFallback>
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <label
                            htmlFor="profile-image-upload"
                            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow cursor-pointer hover:bg-primary/90"
                            title="Upload new photo"
                        >
                            <Camera className="h-4 w-4" />
                        </label>
                        <input
                            id="profile-image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageSelect}
                        />
                    </div>

                    <div className="flex-1 min-w-0 text-center sm:text-left">
                        <h2 className="truncate text-lg font-semibold">
                            {user?.fullName || user?.username}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {user?.emailAddresses[0]?.emailAddress}
                        </p>
                    </div>
                </div>

                {!!profileImage && (
                    <div className="flex gap-2">
                        <Button
                            onClick={handleUpdateImage}
                            disabled={isUpdatingImage}
                            size="sm"
                        >
                            {isUpdatingImage ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                "Save Photo"
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setProfileImage(null);
                                setProfileImagePreview(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                <Separator />

                {/* Editable Fields */}
                <div className="space-y-4">
                    {/* First Name */}
                    <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Enter first name"
                            className="w-full"
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Enter last name"
                            className="w-full"
                        />
                    </div>

                    {/* Update Name Button */}
                    <div>
                        <Button
                            onClick={handleUpdateName}
                            disabled={isUpdatingName || (firstName === user?.firstName && lastName === user?.lastName)}
                            size="sm"
                            className="w-full sm:w-auto"
                        >
                            {isUpdatingName ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Name"
                            )}
                        </Button>
                    </div>

                    <Separator />

                    {/* Email */}
                    <div>
                        <Label>Email</Label>
                        <div className="flex items-center gap-2 rounded-md border bg-muted p-2 mt-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate text-sm">
                                {user?.emailAddresses[0]?.emailAddress}
                            </span>
                            <Badge variant="outline" className="ml-auto">
                                {user?.emailAddresses[0]?.verification?.status || "unverified"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Connected Accounts */}
            <ConnectedAccounts accounts={user?.externalAccounts || []} />
        </div>
    );
}

// Connected Accounts Component
function ConnectedAccounts({ accounts }: { accounts: ExternalAccountResource[] }) {
    if (!accounts?.length) {
        return (
            <div className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                        <LinkIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-base">Connected Accounts</h4>
                        <p className="text-xs text-muted-foreground">
                            Link social accounts to sign in faster
                        </p>
                    </div>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">No connected accounts</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                    <LinkIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h4 className="font-semibold text-base">Connected Accounts</h4>
                    <p className="text-xs text-muted-foreground">
                        Manage your linked social accounts
                    </p>
                </div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
                {accounts.map((account) => {
                    const meta = providerMeta(account.provider);
                    const subtitle = account.emailAddress || account.username || "";
                    return (
                        <div
                            key={account.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                            <div
                                className={cn(
                                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                                    meta.classes
                                )}
                                title={meta.name}
                            >
                                <meta.Icon className="h-5 w-5" />
                            </div>
                            <div className="">
                                <p className="font-medium text-sm">{meta.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {truncate(subtitle, 10) || "Connected"}
                                </p>
                            </div>
                            <Badge variant="outline" className="whitespace-nowrap text-xs">
                                Connected
                            </Badge>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Security Tab Component
function SecurityTab({
    user,
    sessions,
    sessionsLoading,
    fetchSessions,
    currentSessionId,
}: any) {
    const [revokingId, setRevokingId] = useState<string | null>(null);

    return (
        <div className="space-y-6">

            {/* Password */}
            <div className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                        <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-base">Password</h4>
                        <p className="text-xs text-muted-foreground">
                            Manage your password and account security
                        </p>
                    </div>
                </div>
                <Separator />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        window.location.href = `/user-profile`;
                    }}
                >
                    Manage Password
                </Button>
            </div>

            {/* Devices & Activity */}
            <div className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2.5">
                            <Smartphone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-base">Devices & Activity</h4>
                            <p className="text-xs text-muted-foreground">
                                Review where you&apos;re signed in
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchSessions}
                        disabled={sessionsLoading}
                    >
                        {sessionsLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Refresh
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh
                            </>
                        )}
                    </Button>
                </div>

                <Separator />

                {sessionsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading sessions...</p>
                ) : !sessions?.length ? (
                    <p className="text-sm text-muted-foreground">No active sessions</p>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((session: any) => {
                            const activity = session.latestActivity;
                            const DeviceIcon = getDeviceIcon(activity);
                            const isCurrent = session.id === currentSessionId;

                            return (
                                <div
                                    key={session.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                                >
                                    <div
                                        className={cn(
                                            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                                            isCurrent
                                                ? "bg-primary/10 text-primary"
                                                : "bg-muted"
                                        )}
                                    >
                                        <DeviceIcon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-sm">
                                            {activity?.deviceType ||
                                                (activity?.isMobile ? "Mobile device" : "Desktop")}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {activity?.browserName || "Unknown browser"} •{" "}
                                            {activity?.city || "Unknown city"}{" "}
                                            {activity?.country
                                                ? toFlagEmoji(activity.country)
                                                : ""}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Last active {relativeTimeFromNow(session.lastActiveAt)}
                                        </p>
                                    </div>
                                    {isCurrent ? (
                                        <Badge
                                            variant="outline"
                                            className="border-primary/20 bg-primary/10 text-primary text-xs"
                                        >
                                            This device
                                        </Badge>
                                    ) : (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={revokingId === session.id}
                                            onClick={async () => {
                                                if (
                                                    !window.confirm(
                                                        "Revoke this session? It will be signed out."
                                                    )
                                                )
                                                    return;
                                                try {
                                                    setRevokingId(session.id);
                                                    await session.revoke();
                                                    toast.success("Session revoked");
                                                    await fetchSessions();
                                                } catch {
                                                    toast.error("Failed to revoke session");
                                                } finally {
                                                    setRevokingId(null);
                                                }
                                            }}
                                        >
                                            {revokingId === session.id ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Revoking
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldOff className="mr-2 h-4 w-4" />
                                                    Revoke
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete Account */}
            <div className="space-y-6 p-6 border border-destructive/20 rounded-xl bg-card shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-destructive/10 p-2.5">
                        <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-base text-destructive">Delete Account</h4>
                        <p className="text-xs text-muted-foreground">
                            Permanently delete your account and all data
                        </p>
                    </div>
                </div>
                <Separator />
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                        if (
                            window.confirm(
                                "Are you sure you want to delete your account? This action cannot be undone."
                            )
                        ) {
                            try {
                                await user?.delete();
                                window.location.href = "/";
                            } catch {
                                toast.error("Failed to delete account");
                            }
                        }
                    }}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                </Button>
            </div>
        </div>
    );
}

