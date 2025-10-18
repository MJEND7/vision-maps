"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Bell, Check, Trash2, Users, MessageSquare, Settings, UserCheck, UserX, Mail, Gift, AlertCircle, ExternalLink, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/../convex/_generated/dataModel";
import { Separator } from "@/components/ui/separator";
import { NotificationType } from "@/../convex/tables/notifications";


const getNotificationIcon = (type: string) => {
    switch (type) {
        case NotificationType.INVITE:
            return Mail;
        case NotificationType.ORG_INVITE:
            return Users;
        case NotificationType.JOIN_REQUEST:
            return UserCheck;
        case NotificationType.REQUEST_APPROVED:
            return Check;
        case NotificationType.REQUEST_REJECTED:
            return UserX;
        case NotificationType.COMMENT:
        case NotificationType.COMMENT_REPLY:
            return MessageSquare;
        case NotificationType.MENTION:
            return Bell;
        case NotificationType.PAYMENT:
            return CreditCard;
        case NotificationType.SYSTEM:
            return Settings;
        default:
            return Bell;
    }
};

const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return "bg-muted/50 text-muted-foreground";

    switch (type) {
        case NotificationType.INVITE:
        case NotificationType.ORG_INVITE:
            return "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400";
        case NotificationType.JOIN_REQUEST:
            return "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400";
        case NotificationType.REQUEST_APPROVED:
            return "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400";
        case NotificationType.REQUEST_REJECTED:
            return "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400";
        case NotificationType.COMMENT:
        case NotificationType.COMMENT_REPLY:
        case NotificationType.MENTION:
            return "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400";
        case NotificationType.PAYMENT:
            return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";
        default:
            return "bg-primary/10 text-primary dark:bg-primary/20";
    }
};

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
};

// Helper to extract invoice URL and amount from payment notifications
const extractPaymentInfo = (message: string, title: string) => {
    // Match the full invoice URL (everything after "invoice:")
    const urlMatch = message.match(/https:\/\/invoice\.stripe\.com\/[^\s]*/);
    const amountMatch = message.match(/\$(\d+\.\d{2})/);

    // Extract invoice number from title
    const invoiceNumberMatch = title.match(/#([A-Z0-9-]+)/);
    const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1] : null;

    // Create a clean message by removing the URL and redundant text
    let cleanMessage = message
        .replace(/View your invoice:.*$/i, '') // Remove "View your invoice:" and everything after
        .replace(/https:\/\/invoice\.stripe\.com\/[^\s]*/, '') // Remove URL if still there
        .trim();

    // If the clean message ends with "subscription!", make it more friendly
    cleanMessage = cleanMessage.replace(/subscription!/, 'subscription.');

    return {
        url: urlMatch ? urlMatch[0] : null,
        amount: amountMatch ? amountMatch[0] : null,
        cleanMessage,
        invoiceNumber
    };
};

export default function NotificationsPage() {
    const { isLoaded: userLoaded, isSignedIn } = useUser();
    const { isLoaded: orgLoaded } = useOrganization();
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
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 bg-card rounded-xl border shadow-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>
                        <p className="text-sm text-muted-foreground">
                            Stay updated with your latest activity
                        </p>
                    </div>

                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="self-start sm:self-auto"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-3">
                    <div className="inline-flex gap-1 bg-muted p-1 rounded-lg">
                        <Button
                            variant={filter === "all" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setFilter("all")}
                            className="text-xs px-4"
                        >
                            All
                            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                                {notifications.length}
                            </Badge>
                        </Button>
                        <Button
                            variant={filter === "unread" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setFilter("unread")}
                            className="text-xs px-4"
                        >
                            Unread
                            {unreadCount > 0 && (
                                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                                    {unreadCount}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Notifications List */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
            >
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification, index) => {
                        const Icon = getNotificationIcon(notification.type);
                        const isPendingInvite = (notification.type === NotificationType.INVITE || notification.type === NotificationType.ORG_INVITE) && notification.inviteStatus === "pending";
                        const isPayment = notification.type === NotificationType.PAYMENT;
                        const paymentInfo = isPayment ? extractPaymentInfo(notification.message, notification.title) : null;

                        return (
                            <motion.div
                                key={notification._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className={`
                                    group relative rounded-xl border transition-all duration-200
                                    ${notification.isRead
                                        ? "bg-card hover:bg-accent/50 border-border"
                                        : "bg-accent/50 hover:bg-accent border-border shadow-sm"
                                    }
                                    ${!isPendingInvite && !isPayment ? "cursor-pointer" : ""}
                                `}
                                onClick={() => {
                                    if (!isPendingInvite && !isPayment) {
                                        handleNotificationClick(notification);
                                    }
                                }}
                            >
                                {/* Unread indicator */}
                                {!notification.isRead && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                )}

                                <div className="p-4 sm:p-5">
                                    <div className="flex gap-4">
                                        {/* Icon */}
                                        <div className={`
                                            flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center
                                            ${getNotificationColor(notification.type, notification.isRead)}
                                            transition-colors
                                        `}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0 space-y-2.5">
                                                    {/* Special formatting for payment notifications */}
                                                    {isPayment && paymentInfo ? (
                                                        <>
                                                            {/* Invoice Header */}
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <h3 className={`text-base font-bold ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                                                                        Payment Received
                                                                    </h3>
                                                                    {paymentInfo.invoiceNumber && (
                                                                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                                                            Invoice #{paymentInfo.invoiceNumber}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Clean Message */}
                                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                                {paymentInfo.cleanMessage}
                                                            </p>

                                                            {/* View Invoice Button */}
                                                            {paymentInfo.url && (
                                                                <a
                                                                    href={paymentInfo.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all hover:shadow-md font-medium text-sm"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                    View Invoice
                                                                </a>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <h3 className={`text-sm font-semibold ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                                                                {notification.title}
                                                            </h3>
                                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                                {notification.message}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Action buttons */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!notification.isRead && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkAsRead(notification._id);
                                                            }}
                                                            className="h-8 w-8 hover:bg-green-500/10 hover:text-green-600"
                                                            title="Mark as read"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(notification._id);
                                                        }}
                                                        className="h-8 w-8 hover:bg-red-500/10 hover:text-red-600"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                {notification.sender && (
                                                    <>
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {notification.sender.name}
                                                        </span>
                                                        <Separator orientation="vertical" className="h-3" />
                                                    </>
                                                )}
                                                {notification.vision && (
                                                    <>
                                                        <span className="truncate max-w-[200px]">
                                                            {notification.vision.title}
                                                        </span>
                                                        <Separator orientation="vertical" className="h-3" />
                                                    </>
                                                )}
                                                <time>{formatTimestamp(notification.createdAt)}</time>
                                            </div>

                                            {/* Vision Invite Actions */}
                                            {notification.type === NotificationType.INVITE && notification.inviteStatus === "pending" && (
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAcceptInvite(notification._id);
                                                        }}
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5 mr-1.5" />
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
                                                        <UserX className="w-3.5 h-3.5 mr-1.5" />
                                                        Decline
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Organization Invite Actions */}
                                            {notification.type === NotificationType.ORG_INVITE && notification.inviteStatus === "pending" && (
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAcceptOrgInvite(notification._id);
                                                        }}
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5 mr-1.5" />
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
                                                        <UserX className="w-3.5 h-3.5 mr-1.5" />
                                                        Decline
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-16 sm:py-20 bg-card/50 rounded-xl border border-dashed"
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                            <Bell className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            {filter === "all" ? "No notifications yet" : "All caught up!"}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {filter === "all"
                                ? "When you receive notifications, they'll appear here."
                                : "You've read all your notifications."
                            }
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
