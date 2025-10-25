"use client";

import { useParams } from 'next/navigation';
import { DraggableTabs } from '@/components/ui/draggable-tabs';
import { RightSidebarContent, RightSidebarContentRef } from '@/components/ui/right-sidebar';
import { Button } from '@/components/ui/button';
import { Frame, Settings, TableProperties, ChevronRight, ChevronLeft, ListTree, PanelRight } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import FrameComponent from '@/components/vision/frame';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Channel from '@/components/vision/channel';
import { useQuery, useMutation } from 'convex/react';
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import SettingsComponent from '@/components/vision/settings';
import { NodeUserCacheProvider } from '@/hooks/users/useUserCache';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { SidebarProvider } from '@/contexts/sidebar-context';
import { UpgradeDialog } from '@/components/ui/upgrade-dialog';
import { ViewMode } from '@/types/vision_page';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useSidebarResizing } from '@/hooks/useSidebarResizing';
import { useTabManagement } from '@/hooks/useTabManagement';
import { LeftSidebar } from '@/components/vision/left-sidebar';

function VisionDetailPageContent() {
    const { user } = useUser();
    const params = useParams();
    const visionId = params.id as Id<"visions">;
    const [isMobile, setIsMobile] = useState(false);
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const rightSidebarContentRef = useRef<RightSidebarContentRef>(null);
    const rightSidebarRef = useRef<HTMLDivElement>(null);
    const mobileHeaderRef = useRef<HTMLDivElement>(null);

    // Use custom hooks for state management
    const {
        tabs,
        selectedTab,
        tabOrder,
        openTab,
        removeTab,
        setSelectedTab,
        handleTabReorder,
        updateTabTitle,
        handleChannelDeleted,
        handleFrameDeleted,
        handleFramesDeleted
    } = useTabManagement(visionId);

    const {
        sidebarState,
        toggleLeftSidebar,
        toggleRightSidebar,
        closeLeftSidebar,
        closeRightSidebar,
        toggleLeftCollapse,
        toggleRightCollapse,
        setLeftWidth,
        setRightWidth
    } = useSidebarState(visionId, isMobile);

    const {
        startLeftResize,
        startRightResize
    } = useSidebarResizing(setLeftWidth, setRightWidth);

    const vision = useQuery(
        api.visions.get,
        { id: visionId }
    );

    const channelsWithFrames = useQuery(
        api.channels.listWithFramesByVision,
        { visionId }
    );

    const createChannel = useMutation(api.channels.create);
    const updateChannel = useMutation(api.channels.update);
    const reorderChannels = useMutation(api.channels.reorder);
    const createFrame = useMutation(api.frames.create);
    const updateFrame = useMutation(api.frames.update);
    const reorderFrames = useMutation(api.frames.reorder);

    // Extract data from the combined query - memoized to prevent useCallback dependency changes
    const channels = useMemo(() => channelsWithFrames?.channels || [], [channelsWithFrames?.channels]);
    const framesByChannel = useMemo(() => channelsWithFrames?.framesByChannel || {}, [channelsWithFrames?.framesByChannel]);

    const isVisionLoading = vision === undefined;
    const isChannelsLoading = channelsWithFrames === undefined;

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Handle click outside for right sidebar on mobile
    useEffect(() => {
        if (!isMobile || !sidebarState.rightOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Check if click is on mobile header (exclude header from closing sidebars)
            if (mobileHeaderRef.current && mobileHeaderRef.current.contains(target)) {
                return;
            }

            if (rightSidebarRef.current && !rightSidebarRef.current.contains(target)) {
                closeRightSidebar();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, sidebarState.rightOpen, closeRightSidebar]);

    const handleChannelReorder = useCallback(async (channelIds: string[]) => {
        try {
            await reorderChannels({
                visionId,
                channelIds: channelIds as Id<"channels">[],
            });
        } catch (error) {
            console.error('Failed to reorder channels:', error);
        }
    }, [reorderChannels, visionId]);

    const handleFrameReorder = useCallback(async (channelId: string, frameIds: string[]) => {
        try {
            await reorderFrames({
                channelId: channelId as Id<"channels">,
                frameIds: frameIds as Id<"frames">[],
            });
        } catch (error) {
            console.error('Failed to reorder frames:', error);
        }
    }, [reorderFrames]);

    const handleCreateChannel = async () => {
        if (!visionId) return;

        try {
            const channelId = await createChannel({
                visionId,
                title: "Untitled",
                description: ""
            });

            if (channelId) {
                openTab({ type: ViewMode.CHANNEL, id: channelId, title: "Untitled" });
            }
        } catch (error) {
            console.error('Failed to create channel:', error);
        }
    };

    const saveChannelName = async (channelId: string, newTitle: string = '') => {
        const title = newTitle.trim() || '';
        updateTabTitle(channelId, title);

        try {
            await updateChannel({
                id: channelId as Id<"channels">,
                title: title
            });
        } catch (error) {
            console.error('Failed to update channel:', error);
        }
    };

    const handleCreateFrame = async (channelId: string) => {
        const existingFrames = framesByChannel[channelId] || [];
        const frameNumbers = existingFrames
            .map(f => {
                const match = f.title.match(/^Frame (\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(n => n > 0);

        const nextNumber = frameNumbers.length > 0 ? Math.max(...frameNumbers) + 1 : 1;
        const defaultTitle = `Frame ${nextNumber}`;

        try {
            const frameId = await createFrame({
                channelId: channelId as Id<"channels">,
                title: defaultTitle
            });

            if (frameId) {
                openTab({ type: ViewMode.FRAME, id: frameId, title: defaultTitle, parent: channelId });
            }
        } catch (error) {
            console.error('Failed to create frame:', error);
        }
    };

    const saveFrameName = async (frameId: string, newTitle: string = '') => {
        const title = newTitle.trim() || '';
        if (!title) {
            return;
        }

        try {
            await updateFrame({
                id: frameId as Id<"frames">,
                title: title
            });

            updateTabTitle(frameId, title);
        } catch (error) {
            console.error('Failed to update frame:', error);
        }
    };

    const handleOpenChat = useCallback((chatId: string) => {
        // Open right sidebar if it's collapsed
        if (isMobile) {
            toggleRightSidebar();
        }

        setTimeout(() => {
            rightSidebarContentRef.current?.openChat(chatId);
        }, 500)
    }, [isMobile, toggleRightSidebar]);

    const handleOpenCommentChat = useCallback((chatId: string, nodeId?: string) => {
        // Open right sidebar if it's collapsed
        if (isMobile) {
            toggleRightSidebar();
        }

        // Open the comment chat via ref, pass both chatId and nodeId for local state
        setTimeout(() => {
            rightSidebarContentRef.current?.openCommentChat(chatId, nodeId);
        }, 500)
    }, [isMobile, toggleRightSidebar]);

    const handleChannelNavigate = useCallback((channelId: string, nodeId?: string) => {
        // Close right sidebar on mobile
        if (isMobile) {
            closeRightSidebar();
        }

        const channelTitle = channels?.find(c => c._id === channelId)?.title || "Channel";

        // Open the channel tab
        const tabData = { title: channelTitle, id: channelId, type: ViewMode.CHANNEL };
        openTab(tabData);

        // If we have a nodeId, we could implement scrolling to that specific node
        if (nodeId) {
            // Store the target node for highlighting/scrolling
            // This could be enhanced with a ref callback system
            console.log(`Navigate to node ${nodeId} in channel ${channelId}`);
        }
    }, [isMobile, channels, openTab, closeRightSidebar]);

    const renderContent = () => {
        const tabsArray = Array.from(tabs.values());

        return (
            <>
                {tabsArray.map(tab => (
                    <div
                        key={tab.id}
                        className={cn("h-full", selectedTab?.id !== tab.id && "hidden")}
                    >
                        {tab.type === ViewMode.CHANNEL && user && (
                            <SidebarProvider onOpenChat={handleOpenChat} rightSidebarContentRef={rightSidebarContentRef}>
                                <Channel
                                    key={tab.id}
                                    channelId={tab.id}
                                    onOpenChat={handleOpenChat}
                                    onChannelNavigate={handleChannelNavigate}
                                    onOpenCommentChat={handleOpenCommentChat}
                                    visionId={visionId}
                                    onShowUpgradeDialog={setShowUpgradeDialog}
                                />
                            </SidebarProvider>
                        )}
                        {tab.type === ViewMode.FRAME && user?.id && (
                            <SidebarProvider onOpenChat={handleOpenChat} rightSidebarContentRef={rightSidebarContentRef}>
                                <FrameComponent
                                    userId={user.id}
                                    id={tab.id as Id<"frames">}
                                    visionId={visionId}
                                    onShowUpgradeDialog={setShowUpgradeDialog}
                                />
                            </SidebarProvider>
                        )}
                        {tab.type === ViewMode.SETTINGS && (
                            <SettingsComponent
                                id={tab.id}
                                onChannelDeleted={() => handleChannelDeleted(tab.id, framesByChannel)}
                                onFrameDeleted={handleFrameDeleted}
                                onFramesDeleted={handleFramesDeleted}
                            />
                        )}
                    </div>
                ))}
                {tabs.size === 0 && (
                    <p className="flex h-full w-full items-center justify-center text-center text-sm text-primary/70 bg-accent">
                        No file selected
                    </p>
                )}
            </>
        );
    };

    const renderTabIcon = (t: ViewMode) => {
        const size = 15;
        switch (t) {
            case ViewMode.CHANNEL:
                return <TableProperties size={size} />
            case ViewMode.FRAME:
                return <Frame size={size} />
            case ViewMode.SETTINGS:
                return <Settings size={size} />
            default:
                return null
        }
    }

    const renderTabIconForDraggable = useCallback((type: string) => {
        return renderTabIcon(type as ViewMode);
    }, []);

    return (
        <>
            {/* Upgrade Dialog */}
            <UpgradeDialog
                open={showUpgradeDialog}
                onOpenChange={setShowUpgradeDialog}
                reason="ai"
            />
            <main className="w-screen h-screen flex relative bg-accent">
                <NodeUserCacheProvider visionId={visionId}>
                    {/* Mobile Header */}
                    {isMobile && (
                        <motion.div
                            ref={mobileHeaderRef}
                            className="absolute top-0 left-0 right-0 z-40 px-3 py-[9px] bg-accent"
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleLeftSidebar}
                                        className={cn("p-2 bg-background")}
                                    >
                                        <ListTree className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleRightSidebar}
                                        className={cn("p-2 bg-background")}
                                    >
                                        <PanelRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Left Sidebar */}
                    <LeftSidebar
                        isMobile={isMobile}
                        isVisionLoading={isVisionLoading}
                        isChannelsLoading={isChannelsLoading}
                        vision={vision}
                        channels={channels}
                        framesByChannel={framesByChannel}
                        sidebarOpen={sidebarState.leftOpen}
                        sidebarWidth={sidebarState.leftWidth}
                        sidebarCollapsed={sidebarState.leftCollapsed}
                        selectedTabId={selectedTab?.id}
                        user={user}
                        onToggleSidebar={toggleLeftSidebar}
                        onToggleCollapse={toggleLeftCollapse}
                        onClickOutside={closeLeftSidebar}
                        onStartResize={startLeftResize}
                        onOpenTab={openTab}
                        onCreateChannel={handleCreateChannel}
                        onCreateFrame={handleCreateFrame}
                        onSaveChannel={saveChannelName}
                        onSaveFrame={saveFrameName}
                        onChannelReorder={handleChannelReorder}
                        onFrameReorder={handleFrameReorder}
                    />

                    {/* Collapse indicator for desktop */}
                    {!isMobile && sidebarState.leftCollapsed && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-6 h-6 rounded-full border bg-background z-50 absolute left-2 top-4"
                            onClick={toggleLeftCollapse}
                        >
                            <ChevronRight className="w-3 h-3" />
                        </Button>
                    )}

                    {/* Content Area with Tabs */}
                    <div className={cn(
                        "flex flex-col flex-1 overflow-hidden bg-background relative",
                        isMobile && "pt-[53px]"
                    )}>
                        <motion.div
                            className="shrink-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <DraggableTabs
                                tabs={tabOrder}
                                selectedTab={selectedTab}
                                TabSelectAction={setSelectedTab}
                                TabRemoveAction={removeTab}
                                TabReorderAction={handleTabReorder}
                                renderTabIconAction={renderTabIconForDraggable}
                            />
                        </motion.div>

                        <div className="no-scrollbar flex-1 overflow-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="h-full"
                            >
                                {renderContent()}
                            </motion.div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    {isMobile ? (
                        <AnimatePresence mode="wait">
                            {sidebarState.rightOpen && (
                                <motion.div
                                    ref={rightSidebarRef}
                                    initial={{ x: 400 }}
                                    animate={{ x: 0 }}
                                    exit={{ x: 400 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="w-screen h-screen bg-card border-l border-border z-40 absolute shadow-lg flex flex-col"
                                >
                                    <div className="flex-1 min-h-0">
                                        <RightSidebarContent
                                            ref={rightSidebarContentRef}
                                            visionId={visionId}
                                            onToggleRightSidebar={toggleRightSidebar}
                                            onChannelNavigate={handleChannelNavigate}
                                            currentFrameId={selectedTab?.type === ViewMode.FRAME ? selectedTab.id : undefined}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    ) : (
                        !sidebarState.rightCollapsed && (
                            <div
                                className="h-full bg-card border-l border-border relative z-40 flex flex-col"
                                style={{
                                    width: sidebarState.rightWidth,
                                    height: '100vh'
                                }}
                            >
                                <div className="flex-1 min-h-0">
                                    <RightSidebarContent
                                        ref={rightSidebarContentRef}
                                        visionId={visionId}
                                        onChannelNavigate={handleChannelNavigate}
                                        currentFrameId={selectedTab?.type === ViewMode.FRAME ? selectedTab.id : undefined}
                                    />
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute -left-3 top-4 w-6 h-6 rounded-full border bg-background z-50"
                                    onClick={toggleRightCollapse}
                                >
                                    <ChevronRight className="w-3 h-3" />
                                </Button>

                                <div
                                    className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-accent hover:w-2 transition-all z-50"
                                    onMouseDown={startRightResize}
                                />
                            </div>
                        )
                    )}

                    {!isMobile && sidebarState.rightCollapsed && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-6 h-6 rounded-full border bg-background z-50 absolute right-2 top-4"
                            onClick={toggleRightCollapse}
                        >
                            <ChevronLeft className="w-3 h-3" />
                        </Button>
                    )}
                </NodeUserCacheProvider >
            </main>
        </>
    );
}

export default function VisionDetailPage() {
    const { isLoaded, isSignedIn } = useUser();

    if (!isLoaded || !isSignedIn) {
        return null;
    }

    return <VisionDetailPageContent />;
}
