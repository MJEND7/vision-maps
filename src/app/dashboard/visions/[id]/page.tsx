"use client";

import { useParams, useRouter } from 'next/navigation';
import { DraggableTabs } from '@/components/ui/draggable-tabs';
import { DraggableSidebar } from '@/components/ui/draggable-sidebar';
import { PresenceFacePile } from '@/components/ui/face-pile';
import { RightSidebarContent, RightSidebarContentRef } from '@/components/ui/right-sidebar';
import { Button } from '@/components/ui/button';
import { ChevronsDownUp, Frame, Settings, TableProperties, ChevronLeft, ChevronRight, ListTree, PanelRight, PanelRightClose, ArrowLeft } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import FrameComponent from '@/components/vision/frame';
import { useState, useEffect, useCallback, useRef } from 'react';
import Channel from '@/components/vision/channel';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { Vision } from '../../../../../convex/tables/visions';
import SettingsComponent from '@/components/vision/settings';
import { NodeUserCacheProvider } from '@/hooks/useUserCache';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

enum ViewMode {
    CHANNEL = "channel",
    FRAME = "frame",
    SETTINGS = "Settings"
}

type SidebarState = {
    leftWidth: number;
    rightWidth: number;
    leftCollapsed: boolean;
    rightCollapsed: boolean;
    leftOpen: boolean;
    rightOpen: boolean;
};

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
    const [tabs, setTabs] = useState<Map<string, { title: string, id: string, type: ViewMode }>>(new Map());
    const [selectedTab, setSelectedTab] = useState<{ title: string, id: string, type: ViewMode } | null>(null)
    const [tabOrder, setTabOrder] = useState<{ title: string, id: string, type: ViewMode }[]>([])
    const [openChannels, setOpenChannels] = useState<Set<string>>(new Set());
    const [framesByChannel, setFramesByChannel] = useState<Record<string, any[]>>({});
    const [optimisticChannels, setOptimisticChannels] = useState<any[]>([]);
    const [optimisticFrames, setOptimisticFrames] = useState<Record<string, any[]>>({});
    const [editingChannel, setEditingChannel] = useState<string | null>(null);
    const [editingChannelName, setEditingChannelName] = useState<string>('');
    const [editingFrame, setEditingFrame] = useState<string | null>(null);
    const [editingFrameName, setEditingFrameName] = useState<string>('');
    const [sidebarState, setSidebarState] = useState<SidebarState>(DEFAULT_SIDEBAR_STATE);
    const [isMobile, setIsMobile] = useState(false);
    const rightSidebarContentRef = useRef<RightSidebarContentRef>(null);
    const leftResizeRef = useRef<HTMLDivElement>(null);
    const rightResizeRef = useRef<HTMLDivElement>(null);
    const leftSidebarRef = useRef<HTMLDivElement>(null);
    const rightSidebarRef = useRef<HTMLDivElement>(null);
    const mobileHeaderRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
    const sidebarSaveTimeout = useRef<NodeJS.Timeout | null>(null);

    const vision = useQuery(
        api.visions.get,
        { id: visionId }
    );

    const channels = useQuery(
        api.channels.listByVision,
        { visionId }
    );

    const createChannel = useMutation(api.channels.create);
    const updateChannel = useMutation(api.channels.update);
    const reorderChannels = useMutation(api.channels.reorder);
    const createFrame = useMutation(api.frames.create);
    const updateFrame = useMutation(api.frames.update);
    const reorderFrames = useMutation(api.frames.reorder);

    const [channelsToFetchFrames, setChannelsToFetchFrames] = useState<string[]>([]);

    const framesToFetch = channelsToFetchFrames.length > 0 ? channelsToFetchFrames[0] : null;
    const frames = useQuery(
        api.frames.listByChannel,
        framesToFetch ? { channelId: framesToFetch as Id<"channels"> } : "skip"
    );

    useEffect(() => {
        if (frames && framesToFetch) {
            setFramesByChannel(prev => ({
                ...prev,
                [framesToFetch]: frames
            }));

            setChannelsToFetchFrames(prev => prev.slice(1));
        }
    }, [frames, framesToFetch]);

    useEffect(() => {
        if (channels) {
            setOptimisticChannels(channels);
        }
    }, [channels]);

    useEffect(() => {
        setOptimisticFrames(framesByChannel);
    }, [framesByChannel]);

    useEffect(() => {
        if (channels && channels.length > 0) {
            const openChannelIds = Array.from(openChannels).filter(id =>
                channels.some(c => c._id === id)
            );

            if (openChannelIds.length > 0) {
                setChannelsToFetchFrames(prev => {
                    const newQueue = [...prev];
                    openChannelIds.forEach(id => {
                        if (!newQueue.includes(id)) {
                            newQueue.unshift(id);
                        }
                    });
                    return newQueue;
                });
            }

            const timer = setTimeout(() => {
                const remainingChannelIds = channels
                    .filter(c => !openChannels.has(c._id))
                    .map(c => c._id);

                setChannelsToFetchFrames(prev => {
                    const newQueue = [...prev];
                    remainingChannelIds.forEach(id => {
                        if (!newQueue.includes(id)) {
                            newQueue.push(id);
                        }
                    });
                    return newQueue;
                });
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [channels, openChannels]);

    const prioritizeChannelFrames = useCallback((channelId: string) => {
        setChannelsToFetchFrames(prev => {
            if (prev.includes(channelId)) {
                return [channelId, ...prev.filter(id => id !== channelId)];
            } else {
                return [channelId, ...prev];
            }
        });
    }, []);

    const isLoading = vision === undefined;

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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTabs = localStorage.getItem(tabsStorageKey);
            if (savedTabs) {
                try {
                    const tabsData = JSON.parse(savedTabs);
                    const tabsMap = new Map(tabsData.map((tab: { title: string, id: string, type: ViewMode }) => [tab.id, tab])) as Map<string, { title: string, id: string, type: ViewMode }>;
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
                    setSelectedTab(selectedTabData);
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

        setFramesByChannel(prev => {
            const updated = { ...prev };
            delete updated[channelId];
            return updated;
        });

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

        setFramesByChannel(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(channelId => {
                updated[channelId] = updated[channelId].filter(frame => frame._id !== frameId);
            });
            return updated;
        });
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

        setFramesByChannel(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(channelId => {
                updated[channelId] = updated[channelId].filter(frame => !frameIds.includes(frame._id));
            });
            return updated;
        });
    }, [selectedTab]);

    const handleChannelReorder = useCallback((channelIds: string[]) => {
        setOptimisticChannels(prev => {
            const channelMap = new Map(prev.map(c => [c._id, c]));
            return channelIds.map(id => channelMap.get(id)).filter(Boolean);
        });
    }, []);

    const handleFrameReorder = useCallback((channelId: string, frameIds: string[]) => {
        setOptimisticFrames(prev => {
            const currentFrames = prev[channelId] || [];
            const frameMap = new Map(currentFrames.map(f => [f._id, f]));
            const reorderedFrames = frameIds.map(id => frameMap.get(id)).filter(Boolean);

            return {
                ...prev,
                [channelId]: reorderedFrames
            };
        });
    }, []);

    const syncChannelOrder = useCallback(async (channelIds: string[]) => {
        try {
            await reorderChannels({
                visionId,
                channelIds: channelIds as Id<"channels">[],
            });
        } catch (error) {
            console.error('Failed to reorder channels:', error);
            if (channels) {
                setOptimisticChannels(channels);
            }
        }
    }, [reorderChannels, visionId, channels]);

    const syncFrameOrder = useCallback(async (channelId: string, frameIds: string[]) => {
        try {
            await reorderFrames({
                channelId: channelId as Id<"channels">,
                frameIds: frameIds as Id<"frames">[],
            });
        } catch (error) {
            console.error('Failed to reorder frames:', error);
            setOptimisticFrames(framesByChannel);
        }
    }, [reorderFrames, framesByChannel]);

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
                            <Channel user={user} channelId={tab.id} onOpenChat={handleOpenChat} />
                        )}
                        {tab.type === ViewMode.FRAME && (
                            <FrameComponent />
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

    const openTab = (tab: ViewMode, id: string, title: string) => {
        if (tabs.has(id)) {
            const existingTab = tabs.get(id)!;
            setSelectedTab(existingTab);
            return;
        }

        newTab(tab, id, title);
    }

    const newTab = (tab: ViewMode, id: string, title: string) => {
        const newTabData = { title, id: id, type: tab };
        setTabs((t) => {
            const newMap = new Map(t);
            newMap.set(id, newTabData);
            return newMap;
        });
        setTabOrder(prev => {
            const newOrder = [...prev, newTabData];
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
        setSelectedTab(newTabData);
    }

    const toggleChannel = (channelId: string) => {
        setOpenChannels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(channelId)) {
                newSet.delete(channelId);
            } else {
                newSet.add(channelId);
                prioritizeChannelFrames(channelId);
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
                openTab(ViewMode.CHANNEL, channelId, "Untitled");
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
                setFramesByChannel(prev => ({
                    ...prev,
                    [channelId]: [...(prev[channelId] || []), {
                        _id: frameId,
                        title: defaultTitle,
                        channel: channelId
                    }]
                }));

                setEditingFrame(frameId);
                setEditingFrameName(defaultTitle);

                openTab(ViewMode.FRAME, frameId, defaultTitle);
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

            setFramesByChannel(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(channelId => {
                    updated[channelId] = updated[channelId].map(frame =>
                        frame._id === frameId
                            ? { ...frame, title: editingFrameName.trim() }
                            : frame
                    );
                });
                return updated;
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

    const removeTab = (id: string) => {
        setTabs((currentTabs) => {
            const newTabs = new Map(currentTabs);
            newTabs.delete(id);
            return newTabs;
        });

        setTabOrder(prev => {
            const newOrder = prev.filter(tab => tab.id !== id);

            if (newOrder.length === 0) {
                setSelectedTab(null);
            } else if (selectedTab?.id === id) {
                setSelectedTab(newOrder[newOrder.length - 1]);
            }

            return newOrder;
        });
    }

    const handleTabReorder = (newOrder: { title: string, id: string, type: string }[]) => {
        const convertedOrder = newOrder.map(tab => ({
            ...tab,
            type: tab.type as ViewMode
        }));
        setTabOrder(convertedOrder);
    }

    const handleTabSelect = (tab: { title: string, id: string, type: string }) => {
        const convertedTab = {
            ...tab,
            type: tab.type as ViewMode
        };
        setSelectedTab(convertedTab);
    }

    const tabsForDraggable = tabOrder.map(tab => ({
        ...tab,
        type: tab.type as string
    }));

    const selectedTabForDraggable = selectedTab ? {
        ...selectedTab,
        type: selectedTab.type as string
    } : null;

    const renderTabIconForDraggable = (type: string) => {
        return renderTabIcon(type as ViewMode);
    };

    return (
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
                                    <TitleCard
                                        OpenSettings={(id) => {
                                            openTab(ViewMode.SETTINGS, id, ViewMode.SETTINGS);
                                            setSidebarState(prev => ({ ...prev, leftOpen: false }));
                                        }}
                                        isLoading={isLoading}
                                        vision={vision}
                                    />

                                    <>
                                        <hr />
                                        <div className="px-3 w-full space-y-4">
                                            <div className="w-full flex items-center justify-between">
                                                <Button
                                                    variant={"outline"}
                                                    className="text-xs text-muted-foreground flex items-center gap-1"
                                                    onClick={handleCreateChannel}
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
                                            {optimisticChannels && optimisticChannels.length > 0 ? (
                                                <DraggableSidebar
                                                    channels={optimisticChannels}
                                                    framesByChannel={optimisticFrames}
                                                    openChannels={openChannels}
                                                    selectedTabId={selectedTab?.id}
                                                    editingChannel={editingChannel}
                                                    editingChannelName={editingChannelName}
                                                    editingFrame={editingFrame}
                                                    editingFrameName={editingFrameName}
                                                    onChannelReorder={handleChannelReorder}
                                                    onChannelReorderEnd={syncChannelOrder}
                                                    onFrameReorder={handleFrameReorder}
                                                    onFrameReorderEnd={syncFrameOrder}
                                                    onToggleChannel={toggleChannel}
                                                    onOpenTab={(type, id, title) => {
                                                        if (type === "channel") {
                                                            openTab(ViewMode.CHANNEL, id, title);
                                                        } else {
                                                            openTab(ViewMode.FRAME, id, title);
                                                        }
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
                                                    {channels === undefined ? 'Loading channels...' : 'No channels yet'}
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
                            <div className="flex-1 space-y-2 overflow-hidden">
                                <TitleCard
                                    OpenSettings={(id) => {
                                        openTab(ViewMode.SETTINGS, id, ViewMode.SETTINGS);
                                    }}
                                    isLoading={isLoading}
                                    vision={vision}
                                />

                                <>
                                    <hr />
                                    <div className="px-3 w-full space-y-4">
                                        <div className="w-full flex items-center justify-between">
                                            <Button
                                                variant={"outline"}
                                                className="text-xs text-muted-foreground flex items-center gap-1"
                                                onClick={handleCreateChannel}
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
                                        {optimisticChannels && optimisticChannels.length > 0 ? (
                                            <DraggableSidebar
                                                channels={optimisticChannels}
                                                framesByChannel={optimisticFrames}
                                                openChannels={openChannels}
                                                selectedTabId={selectedTab?.id}
                                                editingChannel={editingChannel}
                                                editingChannelName={editingChannelName}
                                                editingFrame={editingFrame}
                                                editingFrameName={editingFrameName}
                                                onChannelReorder={handleChannelReorder}
                                                onChannelReorderEnd={syncChannelOrder}
                                                onFrameReorder={handleFrameReorder}
                                                onFrameReorderEnd={syncFrameOrder}
                                                onToggleChannel={toggleChannel}
                                                onOpenTab={(type, id, title) => {
                                                    if (type === "channel") {
                                                        openTab(ViewMode.CHANNEL, id, title);
                                                    } else {
                                                        openTab(ViewMode.FRAME, id, title);
                                                    }
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
                                                {channels === undefined ? 'Loading channels...' : 'No channels yet'}
                                            </div>
                                        )}
                                    </div>
                                </>
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
                            tabs={tabsForDraggable}
                            selectedTab={selectedTabForDraggable}
                            TabSelectAction={handleTabSelect}
                            TabRemoveAction={removeTab}
                            TabReorderAction={handleTabReorder}
                            renderTabIconAction={renderTabIconForDraggable}
                        />
                    </motion.div>

                    <div className="flex-1 overflow-auto">
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
                                <div className="flex justify-between p-4 border-b shrink-0">
                                    <div className="">
                                        <PresenceFacePile visionId={visionId} />
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <ThemeSwitcher size="sm" />
                                        <Button className="text-xs" size={"sm"} variant={"outline"}>
                                            Share
                                        </Button>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={toggleRightSidebar}
                                                className={cn("p-2 bg-background")}
                                            >
                                                <PanelRightClose className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0">
                                    <RightSidebarContent ref={rightSidebarContentRef} visionId={visionId} />
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
                            <div className="flex justify-between p-4 border-b shrink-0">
                                <div className="">
                                    <PresenceFacePile visionId={visionId} />
                                </div>

                                <div className="flex items-center gap-1">
                                    <ThemeSwitcher size="sm" />
                                    <Button className="text-xs" size={"sm"} variant={"outline"}>
                                        Share
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0">
                                <RightSidebarContent ref={rightSidebarContentRef} visionId={visionId} />
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
            </NodeUserCacheProvider >
        </main>
    );
}

export default function VisionDetailPage() {
    const { isLoaded, isSignedIn } = useUser();

    if (!isLoaded || !isSignedIn) {
        return null;
    }

    return <VisionDetailPageContent />;
}
