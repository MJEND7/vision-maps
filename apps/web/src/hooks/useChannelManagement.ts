import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for managing channel expand/collapse state with localStorage persistence
 * Handles toggling channels open/closed and persisting the state
 */
export function useChannelManagement(visionId: string) {
    const [openChannels, setOpenChannels] = useState<Set<string>>(new Set());
    const [editingChannel, setEditingChannel] = useState<string | null>(null);
    const [editingChannelName, setEditingChannelName] = useState<string>('');

    const storageKey = `vision-${visionId}-opened-channels`;

    // Load saved opened channels from localStorage on mount
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

    // Persist opened channels to localStorage whenever they change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(openChannels)));
        }
    }, [openChannels, storageKey]);

    const toggleChannel = useCallback((channelId: string, open?: boolean) => {
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
    }, []);

    const collapseAllChannels = useCallback(() => {
        setOpenChannels(new Set());
    }, []);

    const expandAllChannels = useCallback((channelIds: string[]) => {
        setOpenChannels(new Set(channelIds));
    }, []);

    const startEditingChannel = useCallback((channelId: string, currentTitle: string) => {
        setEditingChannel(channelId);
        setEditingChannelName(currentTitle);
    }, []);

    const setChannelName = useCallback((name: string) => {
        setEditingChannelName(name);
    }, []);

    const cancelEditingChannel = useCallback(() => {
        setEditingChannel(null);
        setEditingChannelName('');
    }, []);

    return {
        openChannels,
        editingChannel,
        editingChannelName,
        toggleChannel,
        collapseAllChannels,
        expandAllChannels,
        startEditingChannel,
        setChannelName,
        cancelEditingChannel,
        setOpenChannels
    };
}
