import { useState, useCallback, useEffect } from 'react';
import { TabStore, ViewMode } from '@/types/vision_page';

/**
 * Hook for managing tabs (channels, frames, settings views) with localStorage persistence
 * Handles tab creation, selection, removal, and reordering
 * Limits max open tabs to 10
 */
export function useTabManagement(visionId: string) {
    const [tabs, setTabs] = useState<Map<string, TabStore>>(new Map());
    const [selectedTab, setSelectedTab] = useState<TabStore | null>(null);
    const [tabOrder, setTabOrder] = useState<TabStore[]>([]);

    const tabsStorageKey = `vision-${visionId}-tabs`;
    const selectedTabStorageKey = `vision-${visionId}-selected-tab`;

    // Load tabs and selected tab from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTabs = localStorage.getItem(tabsStorageKey);
            if (savedTabs) {
                try {
                    const tabsData = JSON.parse(savedTabs);
                    const tabsMap = new Map(
                        tabsData.map((tab: TabStore) => [tab.id, tab])
                    ) as Map<string, TabStore>;
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

    // Persist tabs to localStorage whenever they change
    useEffect(() => {
        if (typeof window !== 'undefined' && tabs.size > 0) {
            localStorage.setItem(tabsStorageKey, JSON.stringify(tabOrder));
        } else if (typeof window !== 'undefined' && tabs.size === 0) {
            localStorage.removeItem(tabsStorageKey);
        }
    }, [tabOrder, tabsStorageKey, tabs.size]);

    // Persist selected tab to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined' && selectedTab) {
            localStorage.setItem(selectedTabStorageKey, JSON.stringify(selectedTab));
        } else if (typeof window !== 'undefined' && !selectedTab) {
            localStorage.removeItem(selectedTabStorageKey);
        }
    }, [selectedTab, selectedTabStorageKey]);

    const openTab = useCallback((tab: TabStore) => {
        // If tab already exists, just select it
        if (tabs.has(tab.id)) {
            setSelectedTab(tabs.get(tab.id)!);
            return;
        }
        // Otherwise create new tab
        newTab(tab);
    }, [tabs]);

    const newTab = (tab: TabStore) => {
        setTabs(t => {
            const newMap = new Map(t);
            newMap.set(tab.id, tab);
            return newMap;
        });

        setTabOrder(prev => {
            const newOrder = [...prev, tab];
            // Enforce max 10 tabs - remove oldest if exceeded
            if (newOrder.length > 10) {
                const tabToRemove = newOrder[0];
                setTabs(currentTabs => {
                    const updatedTabs = new Map(currentTabs);
                    updatedTabs.delete(tabToRemove.id);
                    return updatedTabs;
                });
                return newOrder.slice(1);
            }
            return newOrder;
        });

        setSelectedTab(tab);
    };

    const removeTab = useCallback((id: string) => {
        setTabs(currentTabs => {
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
    }, [selectedTab]);

    const handleTabReorder = useCallback((newOrder: TabStore[]) => {
        setTabOrder(newOrder);
    }, []);

    const updateTabTitle = useCallback((id: string, newTitle: string) => {
        setTabs(currentTabs => {
            if (currentTabs.has(id)) {
                const updatedTabs = new Map(currentTabs);
                const existingTab = updatedTabs.get(id)!;
                updatedTabs.set(id, { ...existingTab, title: newTitle });
                return updatedTabs;
            }
            return currentTabs;
        });

        setTabOrder(prev =>
            prev.map(tab =>
                tab.id === id ? { ...tab, title: newTitle } : tab
            )
        );

        if (selectedTab?.id === id) {
            setSelectedTab(prev => prev ? { ...prev, title: newTitle } : prev);
        }
    }, [selectedTab]);

    // Handle when a channel is deleted - remove its tab and related frame tabs
    const handleChannelDeleted = useCallback(
        (channelId: string, framesByChannel: Record<string, any[]>) => {
            setTabs(currentTabs => {
                const newTabs = new Map(currentTabs);
                newTabs.delete(channelId);
                return newTabs;
            });

            setTabOrder(prev => {
                const updatedOrder = prev.filter(tab => {
                    if (tab.id === channelId) return false;

                    // Also remove frames that belong to this channel
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

                // If the selected tab was deleted, select the last remaining tab or none
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
        },
        [selectedTab]
    );

    // Handle when a single frame is deleted
    const handleFrameDeleted = useCallback((frameId: string) => {
        setTabs(currentTabs => {
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
    }, [selectedTab]);

    // Handle when multiple frames are deleted at once
    const handleFramesDeleted = useCallback((frameIds: string[]) => {
        setTabs(currentTabs => {
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
    }, [selectedTab]);

    return {
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
    };
}
