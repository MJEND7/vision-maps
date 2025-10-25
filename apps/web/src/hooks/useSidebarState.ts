import { useState, useEffect, useCallback, useRef } from 'react';
import { SidebarState } from '@/types/vision_page';

const DEFAULT_SIDEBAR_STATE: SidebarState = {
    leftWidth: 280,
    rightWidth: 400,
    leftCollapsed: false,
    rightCollapsed: false,
    leftOpen: false,
    rightOpen: false
};

/**
 * Hook for managing sidebar state with localStorage persistence
 * Handles opening/closing sidebars and managing collapsed states
 * On mobile, opening one sidebar closes the other (mutually exclusive)
 */
export function useSidebarState(visionId: string, isMobile: boolean) {
    const [sidebarState, setSidebarState] = useState<SidebarState>(DEFAULT_SIDEBAR_STATE);
    const sidebarSaveTimeout = useRef<NodeJS.Timeout | null>(null);
    const sidebarStorageKey = `vision-${visionId}-sidebar-state`;

    // Load saved state from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(sidebarStorageKey);
            if (saved) {
                try {
                    const savedState = JSON.parse(saved);
                    // Don't restore open state on page load, but keep other settings
                    setSidebarState(prev => ({
                        ...prev,
                        ...savedState,
                        leftOpen: false,
                        rightOpen: false
                    }));
                } catch (error) {
                    console.error('Failed to parse saved sidebar state:', error);
                }
            }
        }
    }, [sidebarStorageKey]);

    // Debounced save to localStorage
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
            // On mobile, closing other sidebar when opening left
            ...(isMobile ? { rightOpen: false } : {})
        }));
    }, [isMobile]);

    const toggleRightSidebar = useCallback(() => {
        setSidebarState(prev => ({
            ...prev,
            rightOpen: !prev.rightOpen,
            // On mobile, closing other sidebar when opening right
            ...(isMobile ? { leftOpen: false } : {})
        }));
    }, [isMobile]);

    const closeSidebars = useCallback(() => {
        setSidebarState(prev => ({
            ...prev,
            leftOpen: false,
            rightOpen: false
        }));
    }, []);

    const closeLeftSidebar = useCallback(() => {
        setSidebarState(prev => ({
            ...prev,
            leftOpen: false
        }));
    }, []);

    const closeRightSidebar = useCallback(() => {
        setSidebarState(prev => ({
            ...prev,
            rightOpen: false
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

    const setLeftWidth = useCallback((width: number) => {
        setSidebarState(prev => {
            const newState = {
                ...prev,
                leftWidth: width
            };
            saveSidebarStateDebounced(newState);
            return newState;
        });
    }, [saveSidebarStateDebounced]);

    const setRightWidth = useCallback((width: number) => {
        setSidebarState(prev => {
            const newState = {
                ...prev,
                rightWidth: width
            };
            saveSidebarStateDebounced(newState);
            return newState;
        });
    }, [saveSidebarStateDebounced]);

    return {
        sidebarState,
        toggleLeftSidebar,
        toggleRightSidebar,
        closeSidebars,
        closeLeftSidebar,
        closeRightSidebar,
        toggleLeftCollapse,
        toggleRightCollapse,
        setLeftWidth,
        setRightWidth,
        saveSidebarStateDebounced
    };
}
