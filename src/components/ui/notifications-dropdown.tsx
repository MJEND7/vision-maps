"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Check, Trash2, UserPlus } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "./button";
import { Avatar } from "./avatar";
import Image from "next/image";

// Simple time formatting function
function formatTimeAgo(dateString: string): string {
    const now = new Date().getTime();
    const date = new Date(dateString).getTime();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}
import { Id } from "../../../convex/_generated/dataModel";
import { useOrgSwitch } from "@/contexts/OrgSwitchContext";

export default function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { isOrgSwitching } = useOrgSwitch();

    const notifications = useQuery(api.notifications.getUserNotifications, { limit: 20 });
    const unreadCount = useQuery(api.notifications.getUnreadCount, (isOrgSwitching) ? "skip" : {});
    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);
    const deleteNotification = useMutation(api.notifications.deleteNotification);
    const acceptInvite = useMutation(api.notifications.acceptInvite);
    const rejectInvite = useMutation(api.notifications.rejectInvite);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                buttonRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleNotificationClick = async (notificationId: Id<"notifications">, isRead: boolean) => {
        if (!isRead) {
            try {
                await markAsRead({ notificationId });
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        }
    };

    const handleDeleteNotification = async (notificationId: Id<"notifications">) => {
        try {
            await deleteNotification({ notificationId });
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    const handleAcceptInvite = async (notificationId: Id<"notifications">) => {
        try {
            await acceptInvite({ notificationId });
        } catch (error) {
            console.error("Failed to accept invite:", error);
        }
    };

    const handleRejectInvite = async (notificationId: Id<"notifications">) => {
        try {
            await rejectInvite({ notificationId });
        } catch (error) {
            console.error("Failed to reject invite:", error);
        }
    };

    const unreadCountDisplay = (unreadCount ?? 0) > 99 ? "99+" : (unreadCount ?? 0);

    return (
        <div className="relative">
            <Button
                ref={buttonRef}
                variant="ghost"
                size="sm"
                className="relative p-2 h-8 w-8"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell size={18} />
                {(unreadCount ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {unreadCountDisplay}
                    </span>
                )}
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={dropdownRef}
                        initial={{ y: -10, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -10, opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 w-80 bg-background border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                    >
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                Notifications
                            </h3>
                            {(unreadCount ?? 0) > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs"
                                >
                                    <Check size={14} className="mr-1" />
                                    Mark all read
                                </Button>
                            )}
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {!notifications || notifications.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        className={`p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group ${!notification.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                                            }`}
                                        onClick={() => handleNotificationClick(notification._id, notification.isRead)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0">
                                                {notification.sender?.picture ? (
                                                    <Avatar className="h-8 w-8">
                                                        <Image
                                                            src={notification.sender.picture}
                                                            alt={notification.sender.name}
                                                            width={32}
                                                            height={32}
                                                        />
                                                    </Avatar>
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                                        <span className="text-xs font-medium">
                                                            {notification.sender?.name?.charAt(0) || "?"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {notification.type === "invite" && (
                                                                <UserPlus size={14} className="text-blue-500" />
                                                            )}
                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                {notification.title}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                            {notification.message}
                                                        </p>

                                                        {/* Invite-specific UI */}
                                                        {notification.type === "invite" && notification.inviteStatus === "pending" && (
                                                            <div className="flex items-center gap-2 mt-3">
                                                                <Button
                                                                    size="sm"
                                                                    className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleAcceptInvite(notification._id);
                                                                    }}
                                                                >
                                                                    Accept
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 px-3 text-xs"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRejectInvite(notification._id);
                                                                    }}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {/* Status badge for processed invites */}
                                                        {notification.type === "invite" && notification.inviteStatus !== "pending" && (
                                                            <div className="mt-2">
                                                                <span className={`text-xs px-2 py-1 rounded ${notification.inviteStatus === "accepted"
                                                                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                                                                        : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                                                                    }`}>
                                                                    {notification.inviteStatus === "accepted" ? "Accepted" : "Rejected"}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                                {formatTimeAgo(notification.createdAt)}
                                                            </span>
                                                            {notification.vision && (
                                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                                    {notification.vision.title}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 ml-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteNotification(notification._id);
                                                        }}
                                                    >
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </div>

                                                {!notification.isRead && (
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {notifications && notifications.length > 0 && (
                            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-center text-sm"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
