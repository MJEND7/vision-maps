import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

export function useViewportCenter() {
  const { getViewport, screenToFlowPosition } = useReactFlow();

  const getViewportCenter = useCallback(() => {
    try {
      const viewport = getViewport();
      // Calculate the center of the current viewport in world coordinates
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      return { x: centerX, y: centerY };
    } catch (error) {
      console.warn('Failed to get viewport center, using fallback:', error);
      return { x: 200, y: 200 };
    }
  }, [getViewport]);

  const convertScreenToFlowPosition = useCallback((screenX: number, screenY: number) => {
    try {
      return screenToFlowPosition({ x: screenX, y: screenY });
    } catch (error) {
      console.warn('Failed to convert screen to flow position:', error);
      return { x: 200, y: 200 };
    }
  }, [screenToFlowPosition]);

  return { getViewportCenter, convertScreenToFlowPosition };
}