"use client";

import { useParams, useRouter } from 'next/navigation';
import { DraggableTabs } from '@/components/ui/draggable-tabs';
import { DraggableSidebar } from '@/components/ui/draggable-sidebar';
import { RightSidebarContent, RightSidebarContentRef } from '@/components/ui/right-sidebar';
import { Button } from '@/components/ui/button';
import { ChevronsDownUp, Frame, Settings, TableProperties, ChevronLeft, ChevronRight, ListTree, PanelRight, ArrowLeft } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import FrameComponent from '@/components/vision/frame';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Channel from '@/components/vision/channel';
import { useQuery, useMutation } from 'convex/react';
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Vision } from "@convex/tables/visions";
import SettingsComponent from '@/components/vision/settings';
import { NodeUserCacheProvider } from '@/hooks/users/useUserCache';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { SidebarProvider } from '@/contexts/sidebar-context';
import { VisionTitleSkeleton, DraggableSidebarSkeleton } from '@/components/vision-skeletons';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ProfileSettingsDialog } from '@/components/ui/profile-settings-dialog';
import { UpgradeDialog } from '@/components/ui/upgrade-dialog';
import { SidebarState, ViewMode, TabStore } from '@/types/vision_page';

const DEFAULT_SIDEBAR_STATE: SidebarState = {
    leftWidth: 280,
    rightWidth: 400,
    leftCollapsed: false,
    rightCollapsed: false,
    leftOpen: false,
    rightOpen: false
};

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;

function TitleCard({ isLoading, vision, OpenSettings, className }: {
    isLoading: boolean,
    vision?: Vision,
    OpenSettings: (id: string) => void,
    className?: string
}) {
    const router = useRouter();

    if (isLoading || !vision) {
        return (
            <div className={className}>
            </div>
        )
    }

    const handleBackNavigation = () => {
        router.push('/dashboard/visions');
    };

    return (
        <div className={cn('w-full space-y-2 pb-2 pt-4 px-4', className)}>
            <div className="w-full flex justify-between items-center">
                <button
                    onClick={handleBackNavigation}
                    className="text-sm flex items-center gap-1"
                    title="Back to visions"
                >
                    <ArrowLeft size={18} className="mb-[1px]" />
                    Back
                </button>
                <button onClick={() => OpenSettings(vision._id.toString())} className="hover:rotate-180  rounded p-1 transition-all ease-in-out duration-500">
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
        </div >
    )
}

function VisionDetailPageContent() {
    const { user } = useUser();
    const params = useParams();
    const visionId = params.id as Id<"visions">;
    const [tabs, setTabs] = useState<Map<string, TabStore>>(new Map());
    const [selectedTab, setSelectedTab] = useState<TabStore | null>(null)
    const [tabOrder, setTabOrder] = useState<TabStore[]>([])
    const [openChannels, setOpenChannels] = useState<Set<string>>(new Set());
    const [editingChannel, setEditingChannel] = useState<string | null>(null);
    const [editingChannelName, setEditingChannelName] = useState<string>('');
    const [editingFrame, setEditingFrame] = useState<string | null>(null);
    const [editingFrameName, setEditingFrameName] = useState<string>('');
    const [sidebarState, setSidebarState] = useState<SidebarState>(DEFAULT_SIDEBAR_STATE);
    const [isMobile, setIsMobile] = useState(false);
    const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
    const rightSidebarContentRef = useRef<RightSidebarContentRef>(null);
    const leftResizeRef = useRef<HTMLDivElement>(null);
    const rightResizeRef = useRef<HTMLDivElement>(null);
    const leftSidebarRef = useRef<HTMLDivElement>(null);
    const rightSidebarRef = useRef<HTMLDivElement>(null);
    const mobileHeaderRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
    const sidebarSaveTimeout = useRef<NodeJS.Timeout | null>(null);
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

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

    const storageKey = `vision-${visionId}-opened-channels`;
    const tabsStorageKey = `vision-${visionId}-tabs`;
    const selectedTabStorageKey = `vision-${visionId}-selected-tab`;
    const sidebarStorageKey = `vision-${visionId}-sidebar-state`;

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(sidebarStorageKey);
            if (saved) {
                try {
                    const savedState = JSON.parse(saved);
                    setSidebarState(prev => ({ ...prev, ...savedState, leftOpen: false, rightOpen: false }));
                } catch (error) {
                    console.error('Failed to parse saved sidebar state:', error);
                }
            }
        }
    }, [sidebarStorageKey]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const openChannelIds = JSON.parse(saved);
                    setOpenChannels(new Set(openChannelIds));
                } catch (error) {
                    console.error('Failed to parse saved opened channels:', error);
                }
            }
        }
    }, [storageKey]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(openChannels)));
        }
    }, [openChannels, storageKey]);

    const setTab = (data: TabStore | null) => {
        setSelectedTab(data);
        //if (!data) return
        //if (data.type == ViewMode.FRAME && data.parent) {
        //    channelIdRef.current = data.parent
        //    return
        //}
        //channelIdRef.current = data.id
    }

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTabs = localStorage.getItem(tabsStorageKey);
            if (savedTabs) {
                try {
                    const tabsData = JSON.parse(savedTabs);
                    const tabsMap = new Map(tabsData.map((tab: TabStore) => [tab.id, tab])) as Map<string, TabStore>;
                    setTabs(tabsMap);
                    setTabOrder(tabsData);
                } catch (error) {
                    console.error('Failed to parse saved tabs:', error);
                }
            }

            const savedSelectedTab = localStorage.getItem(selectedTabStorageKey);
            if (savedSelectedTab) {
                try {
                    const selectedTabData = JSON.parse(savedSelectedTab);
                    setTab(selectedTabData)
                } catch (error) {
                    console.error('Failed to parse saved selected tab:', error);
                }
            }
        }
    }, [tabsStorageKey, selectedTabStorageKey]);

    useEffect(() => {
        if (typeof window !== 'undefined' && tabs.size > 0) {
            localStorage.setItem(tabsStorageKey, JSON.stringify(tabOrder));
        } else if (typeof window !== 'undefined' && tabs.size === 0) {
            localStorage.removeItem(tabsStorageKey);
        }
    }, [tabOrder, tabsStorageKey, tabs.size]);

    useEffect(() => {
        if (typeof window !== 'undefined' && selectedTab) {
            localStorage.setItem(selectedTabStorageKey, JSON.stringify(selectedTab));
        } else if (typeof window !== 'undefined' && !selectedTab) {
            localStorage.removeItem(selectedTabStorageKey);
        }
    }, [selectedTab, selectedTabStorageKey]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!isMobile) return;

            const target = event.target as Node;

            // Check if click is on mobile header (exclude header from closing sidebars)
            if (mobileHeaderRef.current && mobileHeaderRef.current.contains(target)) {
                return;
            }

            if (sidebarState.leftOpen && leftSidebarRef.current && !leftSidebarRef.current.contains(target)) {
                setSidebarState(prev => ({ ...prev, leftOpen: false }));
            }

            if (sidebarState.rightOpen && rightSidebarRef.current && !rightSidebarRef.current.contains(target)) {
                setSidebarState(prev => ({ ...prev, rightOpen: false }));
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, sidebarState.leftOpen, sidebarState.rightOpen]);

    const handleChannelDeleted = useCallback((channelId: string) => {
        setTabs((currentTabs) => {
            const newTabs = new Map(currentTabs);
            newTabs.delete(channelId);
            return newTabs;
        });

        setTabOrder(prev => {
            const updatedOrder = prev.filter(tab => {
                if (tab.id === channelId) return false;

                if (tab.type === ViewMode.FRAME && framesByChannel[channelId]?.some(frame => frame._id === tab.id)) {
                    setTabs(current => {
                        const updated = new Map(current);
                        updated.delete(tab.id);
                        return updated;
                    });
                    return false;
                }

                return true;
            });

            if (selectedTab && (selectedTab.id === channelId ||
                (selectedTab.type === ViewMode.FRAME && framesByChannel[channelId]?.some(frame => frame._id === selectedTab.id)))) {
                if (updatedOrder.length > 0) {
                    setSelectedTab(updatedOrder[updatedOrder.length - 1]);
                } else {
                    setSelectedTab(null);
                }
            }

            return updatedOrder;
        });

        // Channel frame deletion is handled by the backend query refresh

        setOpenChannels(prev => {
            const newSet = new Set(prev);
            newSet.delete(channelId);
            return newSet;
        });
    }, [selectedTab, framesByChannel]);

    const handleFrameDeleted = useCallback((frameId: string) => {
        setTabs((currentTabs) => {
            const newTabs = new Map(currentTabs);
            newTabs.delete(frameId);
            return newTabs;
        });

        setTabOrder(prev => {
            const updatedOrder = prev.filter(tab => tab.id !== frameId);

            if (selectedTab?.id === frameId) {
                if (updatedOrder.length > 0) {
                    setSelectedTab(updatedOrder[updatedOrder.length - 1]);
                } else {
                    setSelectedTab(null);
                }
            }

            return updatedOrder;
        });

        // Frame deletion is handled by the backend query refresh
    }, [selectedTab]);

    const handleFramesDeleted = useCallback((frameIds: string[]) => {
        setTabs((currentTabs) => {
            const newTabs = new Map(currentTabs);
            frameIds.forEach(frameId => newTabs.delete(frameId));
            return newTabs;
        });

        setTabOrder(prev => {
            const updatedOrder = prev.filter(tab => !frameIds.includes(tab.id));

            if (selectedTab && frameIds.includes(selectedTab.id)) {
                if (updatedOrder.length > 0) {
                    setSelectedTab(updatedOrder[updatedOrder.length - 1]);
                } else {
                    setSelectedTab(null);
                }
            }

            return updatedOrder;
        });

        // Frames deletion is handled by the backend query refresh
    }, [selectedTab]);

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

    const saveSidebarStateDebounced = useCallback((newState: SidebarState) => {
        if (sidebarSaveTimeout.current) {
            clearTimeout(sidebarSaveTimeout.current);
        }

        sidebarSaveTimeout.current = setTimeout(() => {
            if (typeof window !== 'undefined') {
                localStorage.setItem(sidebarStorageKey, JSON.stringify(newState));
            }
        }, 2000);
    }, [sidebarStorageKey]);

    const toggleLeftSidebar = useCallback(() => {
        setSidebarState(prev => ({
            ...prev,
            leftOpen: !prev.leftOpen,
            rightOpen: false
        }));
    }, []);

    const toggleRightSidebar = useCallback(() => {
        setSidebarState(prev => ({
            ...prev,
            rightOpen: !prev.rightOpen,
            leftOpen: false
        }));
    }, []);

    const toggleLeftCollapse = useCallback(() => {
        setSidebarState(prev => {
            const newState = {
                ...prev,
                leftCollapsed: !prev.leftCollapsed
            };
            saveSidebarStateDebounced(newState);
            return newState;
        });
    }, [saveSidebarStateDebounced]);

    const toggleRightCollapse = useCallback(() => {
        setSidebarState(prev => {
            const newState = {
                ...prev,
                rightCollapsed: !prev.rightCollapsed
            };
            saveSidebarStateDebounced(newState);
            return newState;
        });
    }, [saveSidebarStateDebounced]);

    const handleLeftResize = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const newWidth = Math.min(Math.max(e.clientX, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
        setSidebarState(prev => {
            const newState = {
                ...prev,
                leftWidth: newWidth
            };
            saveSidebarStateDebounced(newState);
            return newState;
        });
    }, [isResizing, saveSidebarStateDebounced]);

    const handleRightResize = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
        setSidebarState(prev => {
            const newState = {
                ...prev,
                rightWidth: newWidth
            };
            saveSidebarStateDebounced(newState);
            return newState;
        });
    }, [isResizing, saveSidebarStateDebounced]);

    const stopResize = useCallback(() => {
        setIsResizing(null);
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', isResizing === 'left' ? handleLeftResize : handleRightResize);
            document.addEventListener('mouseup', stopResize);
            return () => {
                document.removeEventListener('mousemove', isResizing === 'left' ? handleLeftResize : handleRightResize);
                document.removeEventListener('mouseup', stopResize);
            };
        }
    }, [isResizing, handleLeftResize, handleRightResize, stopResize]);

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
                                onChannelDeleted={handleChannelDeleted}
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

    const openTab = (tab: TabStore) => {
        if (tabs.has(tab.id)) {
            const existingTab = tabs.get(tab.id)!;
            setTab(existingTab);
            return;
        }

        newTab(tab);
    }

    const newTab = (tab: TabStore) => {
        setTabs((t) => {
            const newMap = new Map(t);
            newMap.set(tab.id, tab);
            return newMap;
        });
        setTabOrder(prev => {
            const newOrder = [...prev, tab];
            if (newOrder.length > 10) {
                const tabToRemove = newOrder[0];
                setTabs((currentTabs) => {
                    const updatedTabs = new Map(currentTabs);
                    updatedTabs.delete(tabToRemove.id);
                    return updatedTabs;
                });
                return newOrder.slice(1);
            }
            return newOrder;
        });
        setTab(tab);
    }

    const toggleChannel = (channelId: string, open?: boolean) => {
        setOpenChannels(prev => {
            const newSet = new Set(prev);

            // If open is explicitly true, only add (never remove)
            if (open === true) {
                newSet.add(channelId);
                return newSet;
            }

            // If open is explicitly false, only remove (never add)
            if (open === false) {
                newSet.delete(channelId);
                return newSet;
            }

            // If open is undefined, toggle
            if (newSet.has(channelId)) {
                newSet.delete(channelId);
            } else {
                newSet.add(channelId);
            }
            return newSet;
        });
    };

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

    const startEditingChannel = (channelId: string, currentTitle: string) => {
        setEditingChannel(channelId);
        setEditingChannelName(currentTitle);
    };

    const updateTabTitle = (id: string, newTitle: string) => {
        setTabs((currentTabs) => {
            if (currentTabs.has(id)) {
                const updatedTabs = new Map(currentTabs);
                const existingTab = updatedTabs.get(id)!;
                updatedTabs.set(id, { ...existingTab, title: newTitle });
                return updatedTabs;
            }
            return currentTabs;
        });

        setTabOrder(prev => prev.map(tab =>
            tab.id === id ? { ...tab, title: newTitle } : tab
        ));

        if (selectedTab?.id === id) {
            setSelectedTab(prev => prev ? { ...prev, title: newTitle } : prev);
        }
    };

    const saveChannelName = async (channelId: string) => {
        setEditingChannel(null);
        updateTabTitle(channelId, editingChannelName.trim());

        try {
            await updateChannel({
                id: channelId as Id<"channels">,
                title: editingChannelName.trim()
            });
        } catch (error) {
            console.error('Failed to update channel:', error);
        }
    };

    const cancelEditingChannel = () => {
        setEditingChannel(null);
        setEditingChannelName('');
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
                setEditingFrame(frameId);
                setEditingFrameName(defaultTitle);

                openTab({ type: ViewMode.FRAME, id: frameId, title: defaultTitle, parent: channelId });
            }
        } catch (error) {
            console.error('Failed to create frame:', error);
        }
    };

    const startEditingFrame = (frameId: string, currentTitle: string) => {
        setEditingFrame(frameId);
        setEditingFrameName(currentTitle);
    };

    const saveFrameName = async (frameId: string) => {
        if (!editingFrameName.trim()) {
            setEditingFrame(null);
            return;
        }

        try {
            await updateFrame({
                id: frameId as Id<"frames">,
                title: editingFrameName.trim()
            });

            updateTabTitle(frameId, editingFrameName.trim());
            setEditingFrame(null);
        } catch (error) {
            console.error('Failed to update frame:', error);
        }
    };

    const cancelEditingFrame = () => {
        setEditingFrame(null);
        setEditingFrameName('');
    };

    const handleOpenChat = useCallback((chatId: string) => {
        // Open right sidebar if it's collapsed
        setSidebarState(prev => ({
            ...prev,
            rightCollapsed: false,
            rightOpen: isMobile ? true : prev.rightOpen
        }));
        // Open the chat via ref

        setTimeout(() => {
            rightSidebarContentRef.current?.openChat(chatId);
        }, 500)
    }, [isMobile]);

    const handleOpenCommentChat = useCallback((chatId: string, nodeId?: string) => {
        // Open right sidebar if it's collapsed
        setSidebarState(prev => ({
            ...prev,
            rightCollapsed: false,
            rightOpen: isMobile ? true : prev.rightOpen
        }));

        // Open the comment chat via ref, pass both chatId and nodeId for local state
        setTimeout(() => {
            rightSidebarContentRef.current?.openCommentChat(chatId, nodeId);
        }, 500)
    }, [isMobile]);

    const handleChannelNavigate = useCallback((channelId: string, nodeId?: string) => {
        // Close right sidebar on mobile
        if (isMobile) {
            setSidebarState(prev => ({ ...prev, rightOpen: false }));
        }

        const channelTitle = channels?.find(c => c._id === channelId)?.title || "Channel";

        // Open the channel tab
        const tabData = { title: channelTitle, id: channelId, type: ViewMode.CHANNEL };
        setTabs((t) => {
            const newMap = new Map(t);
            newMap.set(channelId, tabData);
            return newMap;
        });
        setTabOrder(prev => {
            // Remove existing tab if present
            const filtered = prev.filter(tab => tab.id !== channelId);
            const newOrder = [...filtered, tabData];
            if (newOrder.length > 10) {
                const tabToRemove = newOrder[0];
                setTabs((currentTabs) => {
                    const updatedTabs = new Map(currentTabs);
                    updatedTabs.delete(tabToRemove.id);
                    return updatedTabs;
                });
                return newOrder.slice(1);
            }
            return newOrder;
        });
        setTab(tabData);

        // If we have a nodeId, we could implement scrolling to that specific node
        if (nodeId) {
            // Store the target node for highlighting/scrolling
            // This could be enhanced with a ref callback system
            console.log(`Navigate to node ${nodeId} in channel ${channelId}`);
        }
    }, [isMobile, channels]);

    const removeTab = (id: string) => {
        setTabs((currentTabs) => {
            const newTabs = new Map(currentTabs);
            newTabs.delete(id);
            return newTabs;
        });

        setTabOrder(prev => {
            const newOrder = prev.filter(tab => tab.id !== id);

            if (newOrder.length === 0) {
                setTab(null);
            } else if (selectedTab?.id === id) {
                setTab(newOrder[newOrder.length - 1]);
            }

            return newOrder;
        });
    }

    const handleTabReorder = useCallback((newOrder: TabStore[]) => {
        setTabOrder(newOrder);
    }, []);

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
                    {isMobile && (
                        <motion.div
                            ref={mobileHeaderRef}
                            className="absolute top-0 left-0 right-0 z-40 px-3 py-3 bg-accent"
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

                    {isMobile ? (
                        <AnimatePresence mode="wait">
                            {sidebarState.leftOpen && (
                                <motion.div
                                    ref={leftSidebarRef}
                                    initial={{ x: -280 }}
                                    animate={{ x: 0 }}
                                    exit={{ x: -280 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="w-[250px] h-full bg-card border-r border-border flex z-50 absolute top-0 left-0 shadow-lg"
                                >
                                    <div className="flex-1 space-y-2 overflow-hidden">
                                        {isVisionLoading ? (
                                            <VisionTitleSkeleton />
                                        ) : (
                                            <TitleCard
                                                OpenSettings={(id) => {
                                                    openTab({ type: ViewMode.SETTINGS, id, title: ViewMode.SETTINGS });
                                                    setSidebarState(prev => ({ ...prev, leftOpen: false }));
                                                }}
                                                isLoading={isVisionLoading}
                                                vision={vision}
                                            />
                                        )}

                                        <>
                                            <hr />
                                            <div className="px-3 w-full space-y-4">
                                                <div className="w-full flex items-center justify-between">
                                                    <Button
                                                        variant={"outline"}
                                                        className="text-xs text-muted-foreground flex items-center gap-1"
                                                        onClick={handleCreateChannel}
                                                        disabled={isChannelsLoading}
                                                    >
                                                        <TableProperties size={15} /> New channel
                                                    </Button>
                                                    <Button
                                                        variant={"outline"}
                                                        className="text-xs text-muted-foreground flex items-center gap-1"
                                                        onClick={() => setOpenChannels(new Set())}
                                                    >
                                                        <ChevronsDownUp />
                                                    </Button>
                                                </div>
                                                {isChannelsLoading ? (
                                                    <DraggableSidebarSkeleton />
                                                ) : channels && channels.length > 0 ? (
                                                    <DraggableSidebar
                                                        channels={channels}
                                                        framesByChannel={framesByChannel}
                                                        openChannels={openChannels}
                                                        selectedTabId={selectedTab?.id}
                                                        editingChannel={editingChannel}
                                                        editingChannelName={editingChannelName}
                                                        editingFrame={editingFrame}
                                                        editingFrameName={editingFrameName}
                                                        onChannelReorder={handleChannelReorder}
                                                        onChannelReorderEnd={handleChannelReorder}
                                                        onFrameReorder={handleFrameReorder}
                                                        onFrameReorderEnd={handleFrameReorder}
                                                        onToggleChannel={toggleChannel}
                                                        onOpenTab={(tab) => {
                                                            openTab(tab);
                                                            setSidebarState(prev => ({ ...prev, leftOpen: false }));
                                                        }}
                                                        onCreateFrame={handleCreateFrame}
                                                        onEditChannel={startEditingChannel}
                                                        onEditFrame={startEditingFrame}
                                                        onSaveChannel={saveChannelName}
                                                        onSaveFrame={saveFrameName}
                                                        onCancelEditChannel={cancelEditingChannel}
                                                        onCancelEditFrame={cancelEditingFrame}
                                                        onEditChannelNameChange={setEditingChannelName}
                                                        onEditFrameNameChange={setEditingFrameName}
                                                    />
                                                ) : (
                                                    <div className="text-xs text-muted-foreground/60 px-3">
                                                        No channels yet
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    ) : (
                        !sidebarState.leftCollapsed && (
                            <div
                                className="h-full bg-card border-r border-border flex flex-col relative z-40"
                                style={{
                                    width: sidebarState.leftWidth,
                                    height: '100vh'
                                }}
                            >
                                <div className="flex flex-col justify-between flex-1 overflow-hidden">
                                    <div className="space-y-2">
                                        {isVisionLoading ? (
                                            <VisionTitleSkeleton />
                                        ) : (
                                            <TitleCard
                                                OpenSettings={(id) => {
                                                    openTab({ type: ViewMode.SETTINGS, id, title: ViewMode.SETTINGS });
                                                }}
                                                isLoading={isVisionLoading}
                                                vision={vision}
                                            />
                                        )}
                                        <hr />
                                        <div className="px-3 w-full space-y-4">
                                            <div className="w-full flex items-center justify-between">
                                                <Button
                                                    variant={"outline"}
                                                    className="text-xs text-muted-foreground flex items-center gap-1"
                                                    onClick={handleCreateChannel}
                                                    disabled={isChannelsLoading}
                                                >
                                                    <TableProperties size={15} /> New channel
                                                </Button>
                                                <Button
                                                    variant={"outline"}
                                                    className="text-xs text-muted-foreground flex items-center gap-1"
                                                    onClick={() => setOpenChannels(new Set())}
                                                >
                                                    <ChevronsDownUp />
                                                </Button>
                                            </div>
                                            {isChannelsLoading ? (
                                                <DraggableSidebarSkeleton />
                                            ) : channels && channels.length > 0 ? (
                                                <DraggableSidebar
                                                    channels={channels}
                                                    framesByChannel={framesByChannel}
                                                    openChannels={openChannels}
                                                    selectedTabId={selectedTab?.id}
                                                    editingChannel={editingChannel}
                                                    editingChannelName={editingChannelName}
                                                    editingFrame={editingFrame}
                                                    editingFrameName={editingFrameName}
                                                    onChannelReorder={handleChannelReorder}
                                                    onChannelReorderEnd={handleChannelReorder}
                                                    onFrameReorder={handleFrameReorder}
                                                    onFrameReorderEnd={handleFrameReorder}
                                                    onToggleChannel={toggleChannel}
                                                    onOpenTab={openTab}
                                                    onCreateFrame={handleCreateFrame}
                                                    onEditChannel={startEditingChannel}
                                                    onEditFrame={startEditingFrame}
                                                    onSaveChannel={saveChannelName}
                                                    onSaveFrame={saveFrameName}
                                                    onCancelEditChannel={cancelEditingChannel}
                                                    onCancelEditFrame={cancelEditingFrame}
                                                    onEditChannelNameChange={setEditingChannelName}
                                                    onEditFrameNameChange={setEditingFrameName}
                                                />
                                            ) : (
                                                <div className="text-xs text-muted-foreground/60 px-3">
                                                    No channels yet
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Bottom Section */}
                                    <div className="px-3 py-5 border-t border-border space-y-2">
                                        <button
                                            className="flex items-center gap-2 p-2  rounded-md hover:bg-accent w-full text-left transition-colors"
                                            onClick={() => setProfileSettingsOpen(true)}
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
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute -right-3 top-4 w-6 h-6 rounded-full border bg-background z-50"
                                    onClick={toggleLeftCollapse}
                                >
                                    <ChevronLeft className="w-3 h-3" />
                                </Button>

                                <div
                                    ref={leftResizeRef}
                                    className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-accent hover:w-2 transition-all z-50"
                                    onMouseDown={() => setIsResizing('left')}
                                />
                            </div>
                        )
                    )}

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
                                TabSelectAction={setTab}
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

                    {isMobile ? (
                        <AnimatePresence mode="wait">
                            {sidebarState.rightOpen && (
                                <motion.div
                                    ref={rightSidebarRef}
                                    initial={{ x: 400 }}
                                    animate={{ x: 0 }}
                                    exit={{ x: 400 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="w-full h-screen bg-card border-l border-border z-40 absolute top-0 right-0 shadow-lg flex flex-col"
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
                                    ref={rightResizeRef}
                                    className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-accent hover:w-2 transition-all z-50"
                                    onMouseDown={() => setIsResizing('right')}
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

                    {/* Profile Settings Dialog */}
                    <ProfileSettingsDialog
                        open={profileSettingsOpen}
                        onOpenChange={setProfileSettingsOpen}
                    />
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
