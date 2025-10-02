"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Bell, Check, Trash2, Users, MessageSquare, Settings, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { useOrganization, useOrganizationList } from "@/contexts/OrganizationContext";
import { NotionSidebar } from "@/components/ui/notion-sidebar";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/../convex/_generated/dataModel";


const getNotificationIcon = (type: string) => {
    switch (type) {
        case "invite":
            return <Users className="w-4 h-4" />;
        case "org_invite":
            return <Users className="w-4 h-4" />;
        case "join_request":
            return <UserCheck className="w-4 h-4" />;
        case "request_approved":
            return <Check className="w-4 h-4" />;
        case "request_rejected":
            return <UserX className="w-4 h-4" />;
        case "comment":
            return <MessageSquare className="w-4 h-4" />;
        case "mention":
            return <Bell className="w-4 h-4" />;
        case "system":
            return <Settings className="w-4 h-4" />;
        default:
            return <Bell className="w-4 h-4" />;
    }
};

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

export default function NotificationsPage() {
    const { isLoaded: userLoaded, isSignedIn } = useUser();
    const { isLoaded: orgLoaded } = useOrganization();
    const { setActive } = useOrganizationList();
    const router = useRouter();
    const [filter, setFilter] = useState<"all" | "unread">("all");

    // Get real notifications from Convex - handle errors gracefully
    const allNotifications = useQuery(api.notifications.getUserNotifications, { limit: 50 });
    const notifications = allNotifications || [];

    // Track if we're in an unstable auth state (during org operations)
    const isAuthStable = userLoaded && orgLoaded && isSignedIn;

    // Auto-mark all notifications as read when page loads
    useEffect(() => {
        if (isAuthStable && notifications.length > 0) {
            const unreadNotifications = notifications.filter(n => !n.isRead);
            if (unreadNotifications.length > 0) {
                // Mark all as read after a short delay to allow page to settle
                const timer = setTimeout(() => {
                    handleMarkAllAsRead();
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [isAuthStable, notifications.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Mutations for handling notifications
    const markAsReadMutation = useMutation(api.notifications.markAsRead);
    const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);
    const deleteNotificationMutation = useMutation(api.notifications.deleteNotification);
    const acceptInviteMutation = useMutation(api.notifications.acceptInvite);
    const rejectInviteMutation = useMutation(api.notifications.rejectInvite);
    const acceptOrgInviteMutation = useMutation(api.notifications.acceptOrgInvite);
    const rejectOrgInviteMutation = useMutation(api.notifications.rejectOrgInvite);

    const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
        try {
            await markAsReadMutation({ notificationId });
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
            toast.error("Failed to mark notification as read");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsReadMutation({});
            toast.success("All notifications marked as read");
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
            toast.error("Failed to mark all notifications as read");
        }
    };

    const handleDelete = async (notificationId: Id<"notifications">) => {
        try {
            await deleteNotificationMutation({ notificationId });
            toast.success("Notification deleted");
        } catch (error) {
            console.error("Failed to delete notification:", error);
            toast.error("Failed to delete notification");
        }
    };

    const handleAcceptInvite = async (notificationId: Id<"notifications">) => {
        try {
            await acceptInviteMutation({ notificationId });
            toast.success("Invitation accepted!");
        } catch (error) {
            console.error("Failed to accept invitation:", error);
            toast.error("Failed to accept invitation");
        }
    };

    const handleRejectInvite = async (notificationId: Id<"notifications">) => {
        try {
            await rejectInviteMutation({ notificationId });
            toast.success("Invitation rejected");
        } catch (error) {
            console.error("Failed to reject invitation:", error);
            toast.error("Failed to reject invitation");
        }
    };

    const handleAcceptOrgInvite = async (notificationId: Id<"notifications">) => {
        try {
            await acceptOrgInviteMutation({ notificationId });
            toast.success("Organization invitation accepted!");
        } catch (error) {
            console.error("Failed to accept organization invitation:", error);
            toast.error("Failed to accept organization invitation");
        }
    };

    const handleRejectOrgInvite = async (notificationId: Id<"notifications">) => {
        try {
            await rejectOrgInviteMutation({ notificationId });
            toast.success("Organization invitation rejected");
        } catch (error) {
            console.error("Failed to reject organization invitation:", error);
            toast.error("Failed to reject organization invitation");
        }
    };

    const handleNotificationClick = async (notification: any) => {
        if (!notification.isRead) {
            await handleMarkAsRead(notification._id);
        }
        if (notification.visionId) {
            router.push(`/dashboard/visions/${notification.visionId}`);
        }
    };

    const filteredNotifications = filter === "all"
        ? notifications
        : notifications.filter(n => !n.isRead);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (!isAuthStable) {
        return (
            <div className="flex h-screen bg-background">
                <NotionSidebar />
                <main className="flex-1 overflow-y-auto flex items-center justify-center">
                    <div className="text-center p-8 bg-card/50 rounded-lg border border-dashed border-border">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading notifications...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background">
            <NotionSidebar />

            <main className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-6"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold">Notifications</h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Stay up to date with your activity
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleMarkAllAsRead}
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Mark all as read
                                    </Button>
                                )}
                                <Badge variant="secondary">
                                    {unreadCount} unread
                                </Badge>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg w-fit border border-border">
                            <Button
                                variant={filter === "all" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setFilter("all")}
                                className="text-xs"
                            >
                                All ({notifications.length})
                            </Button>
                            <Button
                                variant={filter === "unread" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setFilter("unread")}
                                className="text-xs"
                            >
                                Unread ({unreadCount})
                            </Button>
                        </div>

                        {/* Notifications List */}
                        <div className="space-y-2">
                            {filteredNotifications.length > 0 ? (
                                filteredNotifications.map((notification, index) => (
                                    <motion.div
                                        key={notification._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`
                                            p-4 rounded-lg border transition-all duration-200
                                            ${notification.isRead
                                                ? "bg-card hover:bg-muted/50 border-border"
                                                : "bg-accent/30 border-l-4 border-l-primary hover:bg-accent/50 dark:border-l-blue-400"
                                            }
                                            ${(notification.type === "invite" || notification.type === "org_invite") && notification.inviteStatus === "pending" ? "" : "cursor-pointer"}
                                        `}
                                        onClick={() => {
                                            if (!((notification.type === "invite" || notification.type === "org_invite") && notification.inviteStatus === "pending")) {
                                                handleNotificationClick(notification);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`
                                                p-2 rounded-full 
                                                ${notification.isRead
                                                    ? "bg-muted text-muted-foreground"
                                                    : "bg-primary/10 text-primary dark:bg-blue-500/10 dark:text-blue-400"
                                                }
                                            `}>
                                                {getNotificationIcon(notification.type)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1 flex-1">
                                                        <p className="font-medium text-sm">
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {notification.message}
                                                        </p>
                                                        {notification.sender && (
                                                            <p className="text-xs text-muted-foreground">
                                                                From: {notification.sender.name}
                                                            </p>
                                                        )}
                                                        {notification.vision && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Vision: {notification.vision.title}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatTimestamp(notification.createdAt)}
                                                        </p>

                                                        {/* Vision Invite Actions */}
                                                        {notification.type === "invite" && notification.inviteStatus === "pending" && (
                                                            <div className="flex gap-2 mt-3">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleAcceptInvite(notification._id);
                                                                    }}
                                                                    className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white"
                                                                >
                                                                    <UserCheck className="w-3 h-3 mr-1" />
                                                                    Accept
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRejectInvite(notification._id);
                                                                    }}
                                                                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                                                                >
                                                                    <UserX className="w-3 h-3 mr-1" />
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {/* Organization Invite Actions */}
                                                        {notification.type === "org_invite" && notification.inviteStatus === "pending" && (
                                                            <div className="flex gap-2 mt-3">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleAcceptOrgInvite(notification._id);
                                                                    }}
                                                                    className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white"
                                                                >
                                                                    <UserCheck className="w-3 h-3 mr-1" />
                                                                    Accept
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRejectOrgInvite(notification._id);
                                                                    }}
                                                                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                                                                >
                                                                    <UserX className="w-3 h-3 mr-1" />
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 ml-2">
                                                        {!notification.isRead && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkAsRead(notification._id);
                                                                }}
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(notification._id);
                                                            }}
                                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12 bg-card/50 rounded-lg border border-dashed border-border"
                                >
                                    <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">
                                        {filter === "all" ? "No notifications" : "No unread notifications"}
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {filter === "all"
                                            ? "You're all caught up! New notifications will appear here."
                                            : "All notifications have been read."
                                        }
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
