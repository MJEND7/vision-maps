"use client";

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DraggableSidebar } from '@/components/ui/draggable-sidebar';
import { DraggableSidebarSkeleton, VisionTitleSkeleton } from '@/components/vision-skeletons';
import { ChevronsDownUp, Settings, TableProperties, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Vision } from '@convex/tables/visions';
import { TabStore, ViewMode } from '@/types/vision_page';
import { ProfileSettingsDialog } from '@/components/ui/profile-settings-dialog';
import { useChannelManagement } from '@/hooks/useChannelManagement';
import Link from 'next/link';

interface TitleCardProps {
    isLoading: boolean;
    vision?: Vision;
    onOpenSettings: (id: string) => void;
    className?: string;
}

function TitleCard({ isLoading, vision, onOpenSettings, className }: TitleCardProps) {
    if (isLoading || !vision) {
        return <div className={className} />;
    }

    return (
        <div className={cn('w-full space-y-2 pb-2 pt-4 px-4', className)}>
            <div className="w-full flex justify-between items-center">
                <Link href={"/dashboard/visions"} className="text-sm flex items-center gap-1">
                    ← Back
                </Link>
                <button
                    onClick={() => onOpenSettings(vision._id.toString())}
                    className="hover:rotate-180 rounded p-1 transition-all ease-in-out duration-500"
                >
                    <Settings size={18} />
                </button>
            </div>
            <div className="space-y-1">
                <h1 className="flex gap-1 items-center text-left text-lg font-semibold">
                    {vision?.title}
                </h1>
                <h2 className="text-left text-xs text-muted-foreground truncate">
                    {vision?.description || "No description provided"}
                </h2>
            </div>
        </div>
    );
}

interface ProfileSectionProps {
    user: any;
    onProfileClick: () => void;
}

function ProfileSection({ user, onProfileClick }: ProfileSectionProps) {
    return (
        <div className="px-3 py-5 border-t border-border space-y-2">
            <button
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent w-full text-left transition-colors"
                onClick={onProfileClick}
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
    );
}

interface LeftSidebarProps {
    // State from parent
    isMobile: boolean;
    isVisionLoading: boolean;
    isChannelsLoading: boolean;
    vision?: Vision;
    channels: any[];
    framesByChannel: Record<string, any[]>;
    sidebarOpen: boolean;
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    selectedTabId?: string;
    user: any;

    // Core callbacks that affect parent state
    onToggleSidebar: () => void;
    onToggleCollapse: () => void;
    onClickOutside: () => void;
    onStartResize: () => void;
    onOpenTab: (tab: TabStore) => void;
    onCreateChannel: () => Promise<void>;
    onCreateFrame: (channelId: string) => Promise<void>;
    onSaveChannel: (channelId: string, newTitle?: string) => Promise<void>;
    onSaveFrame: (frameId: string, newTitle?: string) => Promise<void>;
    onChannelReorder: (channelIds: string[]) => Promise<void>;
    onFrameReorder: (channelId: string, frameIds: string[]) => Promise<void>;
}

export function LeftSidebar({
    isMobile,
    isVisionLoading,
    isChannelsLoading,
    vision,
    channels,
    framesByChannel,
    sidebarOpen,
    sidebarWidth,
    sidebarCollapsed,
    selectedTabId,
    user,
    onToggleSidebar,
    onToggleCollapse,
    onClickOutside,
    onStartResize,
    onOpenTab,
    onCreateChannel,
    onCreateFrame,
    onSaveChannel,
    onSaveFrame,
    onChannelReorder,
    onFrameReorder,
}: LeftSidebarProps) {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

    // Manage channel and frame editing locally within this component
    const {
        openChannels,
        editingChannel,
        editingChannelName,
        toggleChannel,
        collapseAllChannels,
        startEditingChannel,
        setChannelName,
        cancelEditingChannel
    } = useChannelManagement(vision?._id.toString() || '');

    // Manage frame editing locally
    const [editingFrame, setEditingFrame] = useState<string | null>(null);
    const [editingFrameName, setEditingFrameName] = useState<string>('');

    // Handle click outside on mobile
    useEffect(() => {
        if (!isMobile || !sidebarOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (sidebarRef.current && !sidebarRef.current.contains(target)) {
                onClickOutside();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, sidebarOpen, onClickOutside]);

    const handleSaveChannel = async (channelId: string) => {
        await onSaveChannel(channelId, editingChannelName);
        cancelEditingChannel();
    };

    const handleSaveFrame = async (frameId: string) => {
        if (!editingFrameName.trim()) {
            setEditingFrame(null);
            return;
        }
        await onSaveFrame(frameId, editingFrameName);
        setEditingFrame(null);
    };

    // Shared sidebar content
    const sidebarContent = (
        <div className="flex-1 space-y-2 overflow-hidden flex flex-col">
            {isVisionLoading ? (
                <VisionTitleSkeleton />
            ) : (
                <TitleCard
                    isLoading={isVisionLoading}
                    vision={vision}
                    onOpenSettings={(id) => {
                        onOpenTab({ type: ViewMode.SETTINGS, id, title: ViewMode.SETTINGS });
                        if (isMobile) onToggleSidebar();
                    }}
                />
            )}

            <hr />

            <div className="px-3 w-full space-y-4 flex-1 overflow-hidden flex flex-col">
                <div className="w-full flex items-center justify-between">
                    <Button
                        variant={"outline"}
                        className="text-xs text-muted-foreground flex items-center gap-1"
                        onClick={onCreateChannel}
                        disabled={isChannelsLoading}
                    >
                        <TableProperties size={15} /> New channel
                    </Button>
                    <Button
                        variant={"outline"}
                        className="text-xs text-muted-foreground flex items-center gap-1"
                        onClick={collapseAllChannels}
                    >
                        <ChevronsDownUp />
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {isChannelsLoading ? (
                        <DraggableSidebarSkeleton />
                    ) : channels && channels.length > 0 ? (
                        <DraggableSidebar
                            channels={channels}
                            framesByChannel={framesByChannel}
                            openChannels={openChannels}
                            selectedTabId={selectedTabId}
                            editingChannel={editingChannel}
                            editingChannelName={editingChannelName}
                            editingFrame={editingFrame}
                            editingFrameName={editingFrameName}
                            onChannelReorder={onChannelReorder}
                            onChannelReorderEnd={onChannelReorder}
                            onFrameReorder={onFrameReorder}
                            onFrameReorderEnd={onFrameReorder}
                            onToggleChannel={toggleChannel}
                            onOpenTab={(tab) => {
                                onOpenTab(tab);
                                if (isMobile) onToggleSidebar();
                            }}
                            onCreateFrame={onCreateFrame}
                            onEditChannel={startEditingChannel}
                            onEditFrame={(frameId, currentTitle) => {
                                setEditingFrame(frameId);
                                setEditingFrameName(currentTitle);
                            }}
                            onSaveChannel={handleSaveChannel}
                            onSaveFrame={handleSaveFrame}
                            onCancelEditChannel={cancelEditingChannel}
                            onCancelEditFrame={() => {
                                setEditingFrame(null);
                                setEditingFrameName('');
                            }}
                            onEditChannelNameChange={setChannelName}
                            onEditFrameNameChange={setEditingFrameName}
                        />
                    ) : (
                        <div className="text-xs text-muted-foreground/60 px-3">
                            No channels yet
                        </div>
                    )}
                </div>
            </div>

            {/* Profile section - visible on both mobile and desktop */}
            <ProfileSection user={user} onProfileClick={() => setProfileSettingsOpen(true)} />

            {/* Profile settings dialog */}
            <ProfileSettingsDialog
                open={profileSettingsOpen}
                onOpenChange={setProfileSettingsOpen}
            />
        </div>
    );

    // Mobile drawer
    if (isMobile) {
        return (
            <AnimatePresence mode="wait">
                {sidebarOpen && (
                    <motion.div
                        ref={sidebarRef}
                        initial={{ x: -280 }}
                        animate={{ x: 0 }}
                        exit={{ x: -280 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="w-[250px] h-full bg-background border-r border-border flex z-50 absolute top-0 left-0 shadow-lg"
                    >
                        {sidebarContent}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Desktop sidebar
    if (sidebarCollapsed) {
        return null;
    }

    return (
        <div
            className="h-full bg-background border-r border-border flex flex-col relative z-40"
            style={{
                width: sidebarWidth,
                height: '100vh'
            }}
        >
            <div className="flex flex-col justify-between flex-1 overflow-hidden">
                {sidebarContent}
            </div>

            {/* Collapse button */}
            <Button
                variant="ghost"
                size="sm"
                className="absolute -right-3 top-4 w-6 h-6 rounded-full border bg-background z-50"
                onClick={onToggleCollapse}
            >
                <ChevronLeft className="w-3 h-3" />
            </Button>

            {/* Resize handle */}
            <div
                className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-accent hover:w-2 transition-all z-50"
                onMouseDown={onStartResize}
            />
        </div>
    );
}
