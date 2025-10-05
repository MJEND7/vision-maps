"use client";

import React, { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useSubscription } from "@/hooks/useSubscription";
import { useUploadThing } from "@/utils/uploadthing";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    SessionWithActivitiesResource,
    ExternalAccountResource,
} from "@clerk/types";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    ArrowLeft,
    Calendar,
    Camera,
    CreditCard,
    Crown,
    ExternalLink,
    Github,
    Loader2,
    Mail,
    Monitor,
    Shield,
    ShieldOff,
    Smartphone,
    User,
    Link as LinkIcon,
    Laptop,
    RefreshCw,
    Save,
} from "lucide-react";
import { Google } from "@/icons/google";

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


// Provider visuals for Connected Accounts
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

function DevicesSection({
    sessions,
    loading,
    onRefresh,
    currentSessionId,
}: {
    sessions: SessionWithActivitiesResource[] | null;
    loading: boolean;
    onRefresh: () => Promise<void>;
    currentSessionId?: string | null;
}) {
    const [revokingId, setRevokingId] = useState<string | null>(null);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        Devices & Activity
                    </CardTitle>
                    <CardDescription>
                        Review where you’re signed in and revoke access if needed.
                    </CardDescription>
                </div>
                <Button
                    variant="outline"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    {loading ? (
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
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading sessions...</p>
                ) : !sessions?.length ? (
                    <p className="text-sm text-muted-foreground">No active sessions</p>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((session) => {
                            const activity = session.latestActivity;
                            const DeviceIcon = getDeviceIcon(activity);
                            const isCurrent = session.id === currentSessionId;

                            return (
                                <div
                                    key={session.id}
                                    className="flex items-center gap-3 rounded-lg border p-3"
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
                                        <p className="truncate font-medium">
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
                                            className="border-primary/20 bg-primary/10 text-primary"
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
                                                    await onRefresh();
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
            </CardContent>
        </Card>
    );
}

// Connected Accounts (improved styling, mobile-first)
function ConnectedAccounts({
    accounts,
}: {
    accounts: ExternalAccountResource[];
}) {
    if (!accounts?.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5" />
                        Connected Accounts
                    </CardTitle>
                    <CardDescription>
                        Link social accounts to sign in faster and more securely.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No connected accounts
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Connected Accounts
                </CardTitle>
                <CardDescription>
                    Manage your linked social and developer accounts.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => {
                    const meta = providerMeta(account.provider);
                    const subtitle = account.emailAddress || account.username || "";
                    return (
                        <div
                            key={account.id}
                            className="flex items-center gap-3 rounded-lg border p-3"
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
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{meta.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {subtitle || "Connected"}
                                </p>
                            </div>
                            <Badge variant="outline" className="whitespace-nowrap">
                                Connected
                            </Badge>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

// Page
export default function ProfilePage() {
    const { user } = useUser();
    const { sessionId: currentSessionId } = useAuth();
    const [sessions, setSessions] = useState<
        SessionWithActivitiesResource[] | null
    >(null);
    const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);

    const { activePlan, planType, isOnTrial, status, isActive } =
        useSubscription();

    const router = useRouter();
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);
    const [username, setUsername] = useState("");
    const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<
        string | null
    >(null);
    const [isUpdatingImage, setIsUpdatingImage] = useState(false);

    const { startUpload, isUploading } = useUploadThing("mediaUploader");

    useEffect(() => {
        if (user?.username) setUsername(user.username);
    }, [user?.username]);

    const fetchSessions = React.useCallback(async () => {
        if (!user) return;
        setSessionsLoading(true);
        try {
            const s = await user.getSessions();
            // Clerk returns SessionWithActivities for getSessions() in this project
            setSessions(s as unknown as SessionWithActivitiesResource[]);
        } catch {
            toast.error("Failed to load sessions");
        } finally {
            setSessionsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleManageSubscription = async () => {
        setIsLoadingPortal(true);
        try {
            const response = await fetch("/api/stripe/create-portal-session", {
                method: "POST",
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("Failed to create portal session");
                setIsLoadingPortal(false);
            }
        } catch {
            toast.error("Failed to open customer portal");
            setIsLoadingPortal(false);
        }
    };

    const handleUpgrade = () => {
        router.push("/pricing");
    };

    const handleUpdateUsername = async () => {
        if (!username.trim() || username === user?.username) return;
        setIsUpdatingUsername(true);
        try {
            await user?.update({ username: username.trim() });
            toast.success("Username updated successfully");
        } catch {
            toast.error("Failed to update username");
        } finally {
            setIsUpdatingUsername(false);
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
        if (!profileImage) return;
        setIsUpdatingImage(true);
        try {
            const uploaded = await startUpload([profileImage]);
            if (uploaded && uploaded[0]) {
                await user?.setProfileImage({ file: uploaded[0].ufsUrl });
                toast.success("Profile image updated successfully");
                setProfileImage(null);
                setProfileImagePreview(null);
            }
        } catch {
            toast.error("Failed to update profile image");
        } finally {
            setIsUpdatingImage(false);
        }
    };

    const getPlanBadgeColor = () => {
        if (planType === "team")
            return "bg-purple-500/10 text-purple-600 border-purple-500/20";
        if (planType === "pro")
            return "bg-blue-500/10 text-blue-600 border-blue-500/20";
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    };

    const getPlanDisplayName = () => {
        if (planType === "team") return "Team";
        if (planType === "pro") return "Pro";
        return "Free";
    };

    return (
        <div className="container mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="rounded-2xl border bg-background p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard/visions")}
                        className="h-9 w-9"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                            Settings
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage your account, security, and subscription
                        </p>
                    </div>
                </div>
            </div>
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-xl border bg-muted/40 p-1">
                    <TabsTrigger
                        value="profile"
                        className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        Profile
                    </TabsTrigger>
                    <TabsTrigger
                        value="security"
                        className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        Security
                    </TabsTrigger>
                    <TabsTrigger
                        value="billing"
                        className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        Billing
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile
                            </CardTitle>
                            <CardDescription>
                                Manage your personal details and profile settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Avatar + Name */}
                            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                                <div className="relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={
                                            profileImagePreview ||
                                            user?.imageUrl ||
                                            "/default-avatar.png"
                                        }
                                        alt={user?.fullName || "User avatar"}
                                        className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
                                    />
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

                                <div className="flex-1 min-w-0">
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
                                        disabled={isUpdatingImage || isUploading}
                                        size="sm"
                                    >
                                        {isUpdatingImage || isUploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save
                                            </>
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
                                {/* Username */}
                                <div>
                                    <Label htmlFor="username">Username</Label>
                                    <div className="mt-1 flex gap-2">
                                        <Input
                                            id="username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Enter username"
                                            className="w-full"
                                        />
                                        <Button
                                            onClick={handleUpdateUsername}
                                            disabled={isUpdatingUsername || username === user?.username}
                                        >
                                            {isUpdatingUsername ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                "Update"
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Full Name (read-only from Clerk, but can be editable if needed) */}
                                <div>
                                    <Label htmlFor="fullname">Full Name</Label>
                                    <Input
                                        id="fullname"
                                        value={user?.fullName || ""}
                                        disabled
                                        className="bg-muted"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <Label>Email</Label>
                                    <div className="flex items-center gap-2 rounded-md border bg-muted p-2">
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
                        </CardContent>
                    </Card>

                    {/* Connected Accounts */}
                    <ConnectedAccounts accounts={user?.externalAccounts || []} />
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="mt-6 space-y-6">
                    {/* Password */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Password
                            </CardTitle>
                            <CardDescription>
                                Manage your password and account security
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    window.location.href = `/user-profile`;
                                }}
                                className="w-full sm:w-auto"
                            >
                                Set Password
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Devices & Activity - Static widgets */}
                    <DevicesSection
                        sessions={sessions}
                        loading={sessionsLoading}
                        onRefresh={fetchSessions}
                        currentSessionId={currentSessionId}
                    />

                    {/* Delete Account */}
                    <Card className="border-destructive/50">
                        <CardHeader>
                            <CardTitle className="text-destructive">
                                Delete Account
                            </CardTitle>
                            <CardDescription>
                                Permanently delete your account and all associated data
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    if (
                                        window.confirm(
                                            "Are you sure you want to delete your account? This action cannot be undone."
                                        )
                                    ) {
                                        try {
                                            await user?.delete();
                                            router.push("/");
                                        } catch {
                                            toast.error("Failed to delete account");
                                        }
                                    }
                                }}
                                className="w-full sm:w-auto"
                            >
                                Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="h-5 w-5" />
                                Subscription
                            </CardTitle>
                            <CardDescription>
                                Manage your subscription plan and billing
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                    <p className="text-sm text-muted-foreground">Current Plan</p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <p className="text-2xl font-bold">{getPlanDisplayName()}</p>
                                        <Badge variant="outline" className={getPlanBadgeColor()}>
                                            {isOnTrial ? "Trial" : status || "Free"}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                        onClick={() => router.push("/pricing")}
                                    >
                                        View Pricing
                                    </Button>
                                    {planType !== "free" && isActive ? (
                                        <Button
                                            onClick={handleManageSubscription}
                                            disabled={isLoadingPortal}
                                            className="w-full sm:w-auto"
                                        >
                                            {isLoadingPortal ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Manage Subscription
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <Button onClick={handleUpgrade} className="w-full sm:w-auto">
                                            Upgrade Plan
                                        </Button>
                                    )}

                                </div>
                            </div>

                            <Separator />

                            {activePlan && planType !== "free" && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {activePlan.paymentMethod && (
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-lg bg-primary/10 p-2">
                                                <CreditCard className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Payment Method</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {activePlan.paymentMethod.brand?.toUpperCase()} ••••{" "}
                                                    {activePlan.paymentMethod.last4}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {activePlan.currentPeriodEnd && (
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-lg bg-primary/10 p-2">
                                                <Calendar className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {activePlan.cancelAtPeriodEnd
                                                        ? "Cancels on"
                                                        : "Renews on"}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(
                                                        activePlan.currentPeriodEnd
                                                    ).toLocaleDateString("en-US", {
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {isOnTrial && activePlan.trialEndsAt && (
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-lg bg-primary/10 p-2">
                                                <Calendar className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Trial Ends</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(
                                                        activePlan.trialEndsAt
                                                    ).toLocaleDateString("en-US", {
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {planType === "team" && "seats" in activePlan && (
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-lg bg-primary/10 p-2">
                                                <User className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Team Seats</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {activePlan.seats} seat
                                                    {activePlan.seats !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {planType === "free" && (
                                <div className="rounded-lg bg-muted/50 p-4">
                                    <p className="text-sm text-muted-foreground">
                                        You&apos;re currently on the free plan. Upgrade to unlock
                                        unlimited visions, AI features, and more!
                                    </p>
                                </div>
                            )}

                            {activePlan?.cancelAtPeriodEnd && (
                                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                                    <p className="text-sm text-yellow-600 dark:text-yellow-500">
                                        Your subscription will be cancelled at the end of the
                                        current billing period.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Plan Features */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Plan Features</CardTitle>
                            <CardDescription>
                                Features available on your {getPlanDisplayName()} plan
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <FeatureItem enabled text="Basic vision mapping" />
                                <FeatureItem
                                    enabled={planType !== "free"}
                                    text="Unlimited visions"
                                />
                                <FeatureItem
                                    enabled={planType !== "free"}
                                    text="AI-powered features"
                                />
                                <FeatureItem
                                    enabled={planType === "team"}
                                    text="Team collaboration"
                                />
                                <FeatureItem
                                    enabled={planType !== "free"}
                                    text="Advanced exports"
                                />
                                <FeatureItem
                                    enabled={planType === "team"}
                                    text="Real-time commenting"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
}

function FeatureItem({
    enabled,
    text,
}: {
    enabled: boolean;
    text: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <div
                className={cn(
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full",
                    enabled ? "bg-green-500/10" : "bg-gray-500/10"
                )}
            >
                <div
                    className={cn(
                        "h-2 w-2 rounded-full",
                        enabled ? "bg-green-500" : "bg-gray-500"
                    )}
                />
            </div>
            <p
                className={cn(
                    "text-sm",
                    enabled ? "" : "line-through text-muted-foreground"
                )}
            >
                {text}
            </p>
        </div>
    );
}
