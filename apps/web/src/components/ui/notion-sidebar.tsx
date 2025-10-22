"use client";

import { useState, useEffect } from "react";
import { api } from "@/../convex/_generated/api";
import { usePermissions } from "@/contexts/PermissionsContext";
import {
    Map,
    Settings,
    Bell,
    LogOut,
    HelpCircle,
    ChevronsUpDown,
    Clock,
    Users,
    ArrowRight,
    Zap,
    Star,
    DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, SignOutButton, useAuth } from "@clerk/nextjs";
import { useWorkspace, useWorkspaceList } from "@/contexts/WorkspaceContext";
import { useRouter, usePathname } from "next/navigation"; // Added usePathname
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils"; // Assuming you have this utility
import { CustomOrgPopup } from "@/components/ui/custom-org-popup";
import { OrgSettingsDialog } from "@/components/ui/org-settings-dialog";
import { ProfileSettingsDialog } from "@/components/ui/profile-settings-dialog";

export function NotionSidebar() {
    const { user } = useUser();
    const { isSignedIn } = useAuth();
    const { workspace } = useWorkspace();
    const {
        userMemberships,
        userInvitations,
        isLoaded: orgListLoaded,
        setActive
    } = useWorkspaceList();
    const router = useRouter();
    const pathname = usePathname(); // Get current pathname
    const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
    const [orgSettingsOpen, setOrgSettingsOpen] = useState(false);
    const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

    const notificationCount = useQuery(
        api.notifications.getUnreadCount,
        {}
    ) ?? 0;

    // Get plan data from PermissionsContext (which fetches from Convex)
    const { plan, trialDaysLeft } = usePermissions();

    // Map Plan enum to string for display
    const userPlan = plan.toLowerCase();

    // Helper function to check if a route is active
    const isActiveRoute = (route: string) => {
        return pathname === route;
    };

    // Track initial load to avoid excessive refetching
    useEffect(() => {
        if (orgListLoaded && !hasInitiallyLoaded) {
            setHasInitiallyLoaded(true);
        }
    }, [orgListLoaded, hasInitiallyLoaded, userMemberships.data?.length]);

    const handleProfileClick = () => {
        setProfileSettingsOpen(true);
    };

    const handleSettingsClick = () => {
        setOrgSettingsOpen(true);
    };

    const handleOrganizationSelect = async (orgId: string) => {
        try {
            if (orgId === "personal") {
                await setActive?.({ workspace: null });
            } else {
                await setActive?.({ workspace: orgId as any });
            }

            // Only revalidate after switch is complete
            if (hasInitiallyLoaded) {
                userMemberships.revalidate?.();
                userInvitations.revalidate?.();
            }
        } catch (error) {
            console.error("Error switching organization:", error);
        }
    };

    const AdWidget = () => {
        if (!isSignedIn) return null;

        // Free user → Upgrade widget
        if (userPlan == "free") {
            return (
                <div
                    className="relative rounded-2xl p-4 mt-2 
        bg-gradient-to-br from-white/80 via-white/60 to-white/30 
        dark:from-[#0a0f2a]/60 dark:via-[#111b3d]/40 dark:to-[#0a0f2a]/20
        backdrop-blur-2xl border dark:border-white/10 
        shadow-lg shadow-black/5 dark:shadow-black/30"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Upgrade
                        </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-6">
                        See pricing and build better with vision maps
                    </p>
                    <Button
                        size="sm"
                        className="w-full text-xs bg-gradient-to-r from-blue-500 to-indigo-500 
                     hover:from-blue-600 hover:to-indigo-600 
                     text-white shadow-md rounded-xl"
                        onClick={() => router.push("/pricing")}
                    >
                        <Zap className="w-3 h-3 mr-1" />
                        Upgrade Now
                    </Button>
                </div>
            );
        }

        // Active trial
        if (
            (userPlan !== "free" && userPlan !== "free_org") &&
            trialDaysLeft !== null &&
            trialDaysLeft > 0
        ) {
            return (
                <div
                    className="relative rounded-2xl p-4 mt-2 
        bg-gradient-to-br from-white/80 via-white/60 to-white/30 
        dark:from-[#0a0f2a]/60 dark:via-[#111b3d]/40 dark:to-[#0a0f2a]/20
        backdrop-blur-2xl border dark:border-white/10 
        shadow-lg shadow-black/5 dark:shadow-black/30"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Free Trial
                        </span>
                    </div>

                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-6">
                        {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in your trial
                    </p>

                    <Button
                        size="sm"
                        className="w-full text-xs bg-gradient-to-r from-blue-500 to-indigo-500 
                     hover:from-blue-600 hover:to-indigo-600 
                     text-white shadow-md rounded-xl"
                        onClick={() => router.push("/pricing")}
                    >
                        <DollarSign className="w-3 h-3" />
                        Pricing
                    </Button>
                </div>
            );
        }

        // Pro user → Encourage team upgrade
        if (userPlan === "pro" && !workspace) {
            return (
                <div
                    className="relative rounded-2xl p-4 mt-2 
        bg-gradient-to-br from-white/80 via-white/60 to-white/30 
        dark:from-[#0a0f2a]/60 dark:via-[#111b3d]/40 dark:to-[#0a0f2a]/20
        backdrop-blur-2xl border dark:border-white/10 
        shadow-lg shadow-black/5 dark:shadow-black/30"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Team Up!
                        </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-6">
                        Collaborate with your team on Vision Maps
                    </p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs border border-green-400/70 text-green-700 dark:text-green-300 
                     hover:bg-green-50/50 dark:hover:bg-green-900/20 
                     rounded-xl shadow-sm"
                        onClick={() => router.push("/pricing?plan=teams")}
                    >
                        Upgrade to Teams
                        <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="w-64 h-full bg-transparent border-r border-border flex flex-col">
            {/* Organization Selector */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
                <CustomOrgPopup onOrgChange={(orgId) => handleOrganizationSelect(orgId || "personal")}>
                    <Button variant="ghost" className="flex-1 justify-between p-2 h-auto">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                                {workspace?.name?.[0] || user?.firstName?.[0] || "P"}
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-medium truncate max-w-32">
                                    {workspace?.name || "Personal"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {workspace
                                        ? `${workspace.membersCount} member${workspace.membersCount !== 1 ? "s" : ""}`
                                        : "Personal workspace"
                                    }
                                </span>
                            </div>
                        </div>
                        <ChevronsUpDown className={`w-4 h-4`} />
                    </Button>
                </CustomOrgPopup>
                {workspace && (
                    <button
                        onClick={handleSettingsClick}
                        className="hover:rotate-180  rounded p-1 transition-all ease-in-out duration-500">
                        <Settings size={18} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 flex-col flex justify-between p-4 overflow-y-auto">
                <div className="space-y-2">
                    {/* Visions Page Button */}
                    <Button
                        variant={isActiveRoute("/dashboard/visions") ? "secondary" : "ghost"}
                        className={cn(
                            "w-full justify-start text-left p-2",
                            isActiveRoute("/dashboard/visions") && "bg-accent text-accent-foreground font-medium"
                        )}
                        onClick={() => router.push("/dashboard/visions")}
                    >
                        <div className="flex items-center gap-2">
                            <Map className="w-4 h-4" />
                            <span className="">Visions</span>
                        </div>
                    </Button>

                    {/* Notifications */}
                    <Button
                        variant={isActiveRoute("/dashboard/notifications") ? "secondary" : "ghost"}
                        className={cn(
                            "w-full justify-start text-left p-2",
                            isActiveRoute("/dashboard/notifications") && "bg-accent text-accent-foreground font-medium"
                        )}
                        onClick={() => router.push("/dashboard/notifications")}
                    >
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            <span className="">Notifications</span>
                            {notificationCount > 0 && (
                                <Badge variant="destructive">
                                    {notificationCount}
                                </Badge>
                            )}
                        </div>
                    </Button>

                </div>

                {/* Bottom Actions */}
                <div className="space-y-2">
                    {/* Ad Widget */}
                    <AdWidget />
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start text-left p-2",
                            isActiveRoute("/dashboard/support") && "bg-accent text-accent-foreground font-medium"
                        )}
                        onClick={() => window.open("mailto:support@visionmaps.com", "_blank")}
                    >
                        <div className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 " />
                            Support
                        </div>
                    </Button>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="px-3 py-5  border-t border-border space-y-2">
                <button
                    className="flex items-center gap-2 p-2  rounded-md hover:bg-accent w-full text-left transition-colors"
                    onClick={handleProfileClick}
                >
                    <Avatar className="w-8 h-8">
                        <AvatarImage src={user?.imageUrl} />
                        <AvatarFallback>
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                            {user?.firstName} {user?.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                            {user?.emailAddresses?.[0]?.emailAddress}
                        </div>
                    </div>
                </button>
            </div>

            {/* Organization Settings Dialog */}
            {workspace && (
                <OrgSettingsDialog
                    open={orgSettingsOpen}
                    onOpenChange={setOrgSettingsOpen}
                />
            )}

            {/* Profile Settings Dialog */}
            <ProfileSettingsDialog
                open={profileSettingsOpen}
                onOpenChange={setProfileSettingsOpen}
            />
        </div>
    );
}
