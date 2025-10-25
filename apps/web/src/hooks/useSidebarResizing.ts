import { useState, useCallback, useEffect } from 'react';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;

/**
 * Hook for managing sidebar resize interactions
 * Handles mouse events and width constraints for both left and right sidebars
 */
export function useSidebarResizing(
    onLeftResize: (width: number) => void,
    onRightResize: (width: number) => void
) {
    const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);

    const handleLeftResize = useCallback((e: MouseEvent) => {
        if (isResizing !== 'left') return;

        const newWidth = Math.min(
            Math.max(e.clientX, MIN_SIDEBAR_WIDTH),
            MAX_SIDEBAR_WIDTH
        );
        onLeftResize(newWidth);
    }, [isResizing, onLeftResize]);

    const handleRightResize = useCallback((e: MouseEvent) => {
        if (isResizing !== 'right') return;

        const newWidth = Math.min(
            Math.max(window.innerWidth - e.clientX, MIN_SIDEBAR_WIDTH),
            MAX_SIDEBAR_WIDTH
        );
        onRightResize(newWidth);
    }, [isResizing, onRightResize]);

    const stopResize = useCallback(() => {
        setIsResizing(null);
    }, []);

    // Attach and detach mouse listeners when resizing
    useEffect(() => {
        if (isResizing) {
            const handler = isResizing === 'left' ? handleLeftResize : handleRightResize;
            document.addEventListener('mousemove', handler);
            document.addEventListener('mouseup', stopResize);

            return () => {
                document.removeEventListener('mousemove', handler);
                document.removeEventListener('mouseup', stopResize);
            };
        }
    }, [isResizing, handleLeftResize, handleRightResize, stopResize]);

    const startLeftResize = useCallback(() => {
        setIsResizing('left');
    }, []);

    const startRightResize = useCallback(() => {
        setIsResizing('right');
    }, []);

    return {
        isResizing,
        startLeftResize,
        startRightResize,
        stopResize
    };
}
