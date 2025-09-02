"use client";

import { useParams } from 'next/navigation';
import { DraggableTabs } from '@/components/ui/draggable-tabs';
import { DraggableSidebar } from '@/components/ui/draggable-sidebar';
import { PresenceFacePile } from '@/components/ui/face-pile';
import { Button } from '@/components/ui/button';
import { ChevronsDownUp, Frame, Play, Settings, TableProperties } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import FrameComponent from '@/components/vision/frame';
import { useState, useEffect, useCallback } from 'react';
import Channel from '@/components/vision/channel';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { Vision } from '../../../../../convex/tables/visions';
import SettingsComponent from '@/components/vision/settings';
import { NodeUserCacheProvider } from '@/hooks/useUserCache';
import ThemeSwitcher from '@/components/ThemeSwitcher';

enum ViewMode {
    CHANNEL = "channel",
    FRAME = "frame",
    SETTINGS = "Settings"
}

function TitleCard({ isLoading, vision, OpenSettings }: { isLoading: boolean, vision?: Vision, OpenSettings: (id: string) => void }) {
    if (isLoading || !vision) {
        return (
            <div>

            </div>
        )
    }

    return (
        <div className='w-full flex flex-col gap-1 p-4'>
            <div className="w-full flex justify-between items-center">
                <h1 className="flex gap-1 items-center text-left text-lg font-semibold">
                    {vision?.title}
                </h1>
                <button onClick={() => OpenSettings(vision._id.toString())}>
                    <Settings size={18} />
                </button>
            </div>
            <h2 className="text-left text-xs text-muted-foreground truncate">
                {vision?.description || "No description provided"}
            </h2>
        </div>
    )
}

export default function VisionDetailPage() {
    const { isLoaded, isSignedIn, user } = useUser();
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


    // ✅ Always call useQuery, but only pass params if ready
    const vision = useQuery(
        api.visions.get,
        isLoaded && isSignedIn ? { id: visionId } : "skip"
    );

    const channels = useQuery(
        api.channels.listByVision,
        isLoaded && isSignedIn && visionId ? { visionId } : "skip"
    );

    const createChannel = useMutation(api.channels.create);
    const updateChannel = useMutation(api.channels.update);
    const reorderChannels = useMutation(api.channels.reorder);
    const createFrame = useMutation(api.frames.create);
    const updateFrame = useMutation(api.frames.update);
    const reorderFrames = useMutation(api.frames.reorder);

    const [channelsToFetchFrames, setChannelsToFetchFrames] = useState<string[]>([]);

    // Fetch frames for channels that are in our fetch list
    const framesToFetch = channelsToFetchFrames.length > 0 ? channelsToFetchFrames[0] : null;
    const frames = useQuery(
        api.frames.listByChannel,
        framesToFetch ? { channelId: framesToFetch as Id<"channels"> } : "skip"
    );

    // Update frames in state when query completes
    useEffect(() => {
        if (frames && framesToFetch) {
            setFramesByChannel(prev => ({
                ...prev,
                [framesToFetch]: frames
            }));

            // Remove the processed channel from the queue
            setChannelsToFetchFrames(prev => prev.slice(1));
        }
    }, [frames, framesToFetch]);

    // Sync optimistic state with server data
    useEffect(() => {
        if (channels) {
            setOptimisticChannels(channels);
        }
    }, [channels]);

    useEffect(() => {
        setOptimisticFrames(framesByChannel);
    }, [framesByChannel]);

    // Manage frame fetching priority: open channels first, others after delay
    useEffect(() => {
        if (channels && channels.length > 0) {
            // Immediately queue open channels for frame fetching
            const openChannelIds = Array.from(openChannels).filter(id =>
                channels.some(c => c._id === id)
            );

            if (openChannelIds.length > 0) {
                setChannelsToFetchFrames(prev => {
                    const newQueue = [...prev];
                    openChannelIds.forEach(id => {
                        if (!newQueue.includes(id)) {
                            newQueue.unshift(id); // Add to front of queue
                        }
                    });
                    return newQueue;
                });
            }

            // After 2 seconds, queue remaining channels
            const timer = setTimeout(() => {
                const remainingChannelIds = channels
                    .filter(c => !openChannels.has(c._id))
                    .map(c => c._id);

                setChannelsToFetchFrames(prev => {
                    const newQueue = [...prev];
                    remainingChannelIds.forEach(id => {
                        if (!newQueue.includes(id)) {
                            newQueue.push(id); // Add to end of queue
                        }
                    });
                    return newQueue;
                });
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [channels, openChannels]);

    // When a channel is opened, prioritize its frame fetching
    const prioritizeChannelFrames = useCallback((channelId: string) => {
        setChannelsToFetchFrames(prev => {
            if (prev.includes(channelId)) {
                // Move to front if already in queue
                return [channelId, ...prev.filter(id => id !== channelId)];
            } else {
                // Add to front of queue
                return [channelId, ...prev];
            }
        });
    }, []);

    const isLoading = vision === undefined;

    // localStorage key for opened channels
    const storageKey = `vision-${visionId}-opened-channels`;
    const tabsStorageKey = `vision-${visionId}-tabs`;
    const selectedTabStorageKey = `vision-${visionId}-selected-tab`;

    // Load opened channels from localStorage on mount
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

    // Save opened channels to localStorage when they change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(openChannels)));
        }
    }, [openChannels, storageKey]);

    // Load tabs and selected tab from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Load tabs
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

            // Load selected tab
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

    // Save tabs to localStorage when they change
    useEffect(() => {
        if (typeof window !== 'undefined' && tabs.size > 0) {
            localStorage.setItem(tabsStorageKey, JSON.stringify(tabOrder));
        } else if (typeof window !== 'undefined' && tabs.size === 0) {
            // Clear localStorage when no tabs
            localStorage.removeItem(tabsStorageKey);
        }
    }, [tabOrder, tabsStorageKey, tabs.size]);

    // Save selected tab to localStorage when it changes
    useEffect(() => {
        if (typeof window !== 'undefined' && selectedTab) {
            localStorage.setItem(selectedTabStorageKey, JSON.stringify(selectedTab));
        } else if (typeof window !== 'undefined' && !selectedTab) {
            // Clear localStorage when no tab selected
            localStorage.removeItem(selectedTabStorageKey);
        }
    }, [selectedTab, selectedTabStorageKey]);

    // Tab cleanup callbacks (must be before early return to maintain hook order)
    const handleChannelDeleted = useCallback((channelId: string) => {
        // Close the channel tab if it exists
        setTabs((currentTabs) => {
            const newTabs = new Map(currentTabs);
            newTabs.delete(channelId);
            return newTabs;
        });
        
        setTabOrder(prev => {
            // Filter out the channel tab and any frame tabs that belong to this channel
            const updatedOrder = prev.filter(tab => {
                // Remove if it's the channel being deleted
                if (tab.id === channelId) return false;
                
                // Remove if it's a frame that belongs to this channel
                if (tab.type === ViewMode.FRAME && framesByChannel[channelId]?.some(frame => frame._id === tab.id)) {
                    // Also remove from tabs Map
                    setTabs(current => {
                        const updated = new Map(current);
                        updated.delete(tab.id);
                        return updated;
                    });
                    return false;
                }
                
                return true;
            });
            
            // Update selected tab if needed
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

        // Remove the entire channel from framesByChannel to update sidebar
        setFramesByChannel(prev => {
            const updated = { ...prev };
            delete updated[channelId];
            return updated;
        });

        // Also remove from openChannels if it was open
        setOpenChannels(prev => {
            const newSet = new Set(prev);
            newSet.delete(channelId);
            return newSet;
        });
    }, [selectedTab, framesByChannel]);

    const handleFrameDeleted = useCallback((frameId: string) => {
        // Remove from tabs
        setTabs((currentTabs) => {
            const newTabs = new Map(currentTabs);
            newTabs.delete(frameId);
            return newTabs;
        });
        
        // Remove from tab order
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

        // Remove from framesByChannel to update sidebar
        setFramesByChannel(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(channelId => {
                updated[channelId] = updated[channelId].filter(frame => frame._id !== frameId);
            });
            return updated;
        });
    }, [selectedTab]);

    const handleFramesDeleted = useCallback((frameIds: string[]) => {
        // Remove from tabs
        setTabs((currentTabs) => {
            const newTabs = new Map(currentTabs);
            frameIds.forEach(frameId => newTabs.delete(frameId));
            return newTabs;
        });
        
        // Remove from tab order
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

        // Remove from framesByChannel to update sidebar
        setFramesByChannel(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(channelId => {
                updated[channelId] = updated[channelId].filter(frame => !frameIds.includes(frame._id));
            });
            return updated;
        });
    }, [selectedTab]);

    const handleChannelReorder = useCallback((channelIds: string[]) => {
        // Optimistic update - reorder locally first
        setOptimisticChannels(prev => {
            const channelMap = new Map(prev.map(c => [c._id, c]));
            return channelIds.map(id => channelMap.get(id)).filter(Boolean);
        });

        // Debounced server sync will happen on drag end
    }, []);

    const handleFrameReorder = useCallback((channelId: string, frameIds: string[]) => {
        // Optimistic update - reorder locally first
        setOptimisticFrames(prev => {
            const currentFrames = prev[channelId] || [];
            const frameMap = new Map(currentFrames.map(f => [f._id, f]));
            const reorderedFrames = frameIds.map(id => frameMap.get(id)).filter(Boolean);
            
            return {
                ...prev,
                [channelId]: reorderedFrames
            };
        });

        // Debounced server sync will happen on drag end
    }, []);

    // Server sync functions (called on drag end)
    const syncChannelOrder = useCallback(async (channelIds: string[]) => {
        try {
            await reorderChannels({
                visionId,
                channelIds: channelIds as Id<"channels">[],
            });
        } catch (error) {
            console.error('Failed to reorder channels:', error);
            // Revert optimistic update on error
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
            // Revert optimistic update on error
            setOptimisticFrames(framesByChannel);
        }
    }, [reorderFrames, framesByChannel]);

    if (!isLoaded || !isSignedIn) {
        return (
            null
        );
    }

    const renderContent = () => {
        switch (selectedTab?.type) {
            case ViewMode.CHANNEL:
                return <Channel user={user} channelId={selectedTab.id} />;
            case ViewMode.FRAME:
                return <FrameComponent />;
            case ViewMode.SETTINGS:
                return (
                    <SettingsComponent 
                        id={selectedTab.id} 
                        onChannelDeleted={handleChannelDeleted}
                        onFrameDeleted={handleFrameDeleted}
                        onFramesDeleted={handleFramesDeleted}
                    />
                );
            default:
                return (
                    <p className="flex h-full w-full items-center justify-center text-center text-sm text-primary/70 bg-accent">
                        No file selected
                    </p>
                );
        }
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
        setTabOrder(prev => [...prev, newTabData]);
        setSelectedTab(newTabData);
    }

    const toggleChannel = (channelId: string) => {
        setOpenChannels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(channelId)) {
                newSet.delete(channelId);
            } else {
                newSet.add(channelId);
                // Prioritize fetching frames for this channel
                prioritizeChannelFrames(channelId);
                // Open the channel tab when expanding
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

            // Automatically open the newly created channel
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

    // Convert tabs for DraggableTabs component
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
        <NodeUserCacheProvider visionId={visionId}>
            <main className="h-screen flex">
                {/* Left bar */}
                <div className="h-full flex flex-col gap-2 justify-between">
                    <div
                        className="h-full w-[280px] bg-card border border-border space-y-2"
                    >
                        <TitleCard
                        OpenSettings={(id) => {
                            openTab(ViewMode.SETTINGS, id, ViewMode.SETTINGS)
                        }}
                        isLoading={isLoading}
                        vision={vision}
                    />
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
                </div>
            </div>

            {/* Middle */}
            <div className="overflow-hidden w-full bg-background">
                <DraggableTabs
                    tabs={tabsForDraggable}
                    selectedTab={selectedTabForDraggable}
                    TabSelectAction={handleTabSelect}
                    TabRemoveAction={removeTab}
                    TabReorderAction={handleTabReorder}
                    renderTabIconAction={renderTabIconForDraggable}
                />
                {renderContent()}
            </div>

            {/* Right bar */}
            <div className="h-full w-[400px] bg-card border border-border p-4">
                <div className="flex justify-between">
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
            </div>
        </main>
        </NodeUserCacheProvider>
    );
}
