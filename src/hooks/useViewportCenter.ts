import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

export function useViewportCenter() {
  const { getViewport, screenToFlowPosition } = useReactFlow();

  const getViewportCenter = useCallback(() => {
    try {
      // Check if we're in a valid React context before calling getViewport
      if (typeof window === 'undefined') {
        return { x: 200, y: 200 };
      }
      
      const viewport = getViewport();
      if (!viewport) {
        return { x: 200, y: 200 };
      }
      
      // Calculate the center of the current viewport in world coordinates
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      return { x: centerX, y: centerY };
    } catch (error) {
      // Silently handle React Fiber errors
      if (error instanceof Error && error.message.includes('deletedFiber')) {
        return { x: 200, y: 200 };
      }
      console.warn('Failed to get viewport center, using fallback:', error);
      return { x: 200, y: 200 };
    }
  }, [getViewport]);

  const convertScreenToFlowPosition = useCallback((screenX: number, screenY: number) => {
    try {
      // Check if we're in a valid React context
      if (typeof window === 'undefined') {
        return { x: 200, y: 200 };
      }
      
      return screenToFlowPosition({ x: screenX, y: screenY });
    } catch (error) {
      // Silently handle React Fiber errors
      if (error instanceof Error && error.message.includes('deletedFiber')) {
        return { x: 200, y: 200 };
      }
      console.warn('Failed to convert screen to flow position:', error);
      return { x: 200, y: 200 };
    }
  }, [screenToFlowPosition]);

  return { getViewportCenter, convertScreenToFlowPosition };
}