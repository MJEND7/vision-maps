"use client";

import React, { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Trash2, Plus, Edit } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "../ui/drawer";
import { Button } from "../ui/button";

interface CanvasContextMenuProps {
  frameId: Id<"frames">;
  selectedNodes: string[];
  selectedEdges: string[];
  contextType: 'node' | 'edge' | 'pane';
  selectedNodeData?: { id: string; type: string; data: any }[]; // Add node data for editing
  onDeleteSelected?: () => void;
  onAddNodeClick?: () => void;
  onEditNode?: (nodeId: string) => void;
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

// Hook to detect if device is mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  return isMobile;
}

export function CanvasContextMenu({ frameId, selectedNodes, selectedEdges, contextType, selectedNodeData, onDeleteSelected, onAddNodeClick, onEditNode, isOpen, position, onClose }: CanvasContextMenuProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isMobile = useIsMobile();
  
  const removeMultipleNodesFromFrame = useMutation(api.frames.removeMultipleNodesFromFrame);
  
  const deleteEdge = useMutation(api.edges.deleteEdge).withOptimisticUpdate((store, args) => {
    const currentEdges = store.getQuery(api.edges.get, { frameId: args.frameId }) ?? [];
    const updatedEdges = currentEdges.filter(edge => edge.id !== args.edgeId);
    store.setQuery(api.edges.get, { frameId: args.frameId }, updatedEdges);
  });

  const handleDeleteSelected = useCallback(async () => {
    if (isDeleting || (selectedNodes.length === 0 && selectedEdges.length === 0)) return;
    
    setIsDeleting(true);
    try {
      if (selectedNodes.length > 0) {
        const result = await removeMultipleNodesFromFrame({
          frameId,
          nodeIds: selectedNodes,
        });
        
        console.log(`Deleted ${result.deletedCount} nodes and ${result.deletedEdgeCount} edges`);
      }
      
      if (selectedEdges.length > 0) {
        await Promise.all(
          selectedEdges.map(edgeId =>
            deleteEdge({
              frameId,
              edgeId,
            })
          )
        );
        
        console.log(`Deleted ${selectedEdges.length} edges`);
      }
      
      // Call optional callback
      onDeleteSelected?.();
      
      // Close menu/drawer
      onClose();
    } catch (error) {
      console.error("Failed to delete selected items:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [removeMultipleNodesFromFrame, deleteEdge, frameId, selectedNodes, selectedEdges, onDeleteSelected, isDeleting, onClose]);

  const hasSelectedNodes = selectedNodes.length > 0;
  const hasSelectedEdges = selectedEdges.length > 0;
  const hasSelectedItems = hasSelectedNodes || hasSelectedEdges;
  const hasTextNode = selectedNodeData?.some(node => node.type === 'Text') || false;
  const singleTextNode = selectedNodes.length === 1 && hasTextNode ? selectedNodes[0] : null;

  if (!isOpen) return null;

  const contextMenu = isMobile ? (
    // Mobile: Use Drawer
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent data-context-menu>
        <DrawerHeader>
          <DrawerTitle>Canvas Actions</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-2">
          {singleTextNode && contextType === 'node' && (
            <Button
              variant="default"
              onClick={() => {
                console.log('Mobile edit button clicked for node:', singleTextNode);
                onEditNode?.(singleTextNode);
                onClose();
              }}
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Text
            </Button>
          )}
          {hasSelectedItems && (
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting 
                ? "Deleting..." 
                : contextType === 'edge' 
                  ? `Delete Edge${selectedEdges.length > 1 ? 's' : ''}`
                  : `Delete ${selectedNodes.length + selectedEdges.length} item${(selectedNodes.length + selectedEdges.length) > 1 ? 's' : ''}`
              }
            </Button>
          )}
          {!hasSelectedItems && contextType === 'pane' && (
            <Button
              variant="default"
              onClick={() => {
                onAddNodeClick?.();
                onClose();
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Existing Node
            </Button>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ) : (
    // Desktop: Fixed positioned menu
    <div
      data-context-menu
      className="fixed z-50 bg-popover border rounded-md shadow-md p-1 min-w-[8rem]"
      style={{
        left: position.x,
        top: position.y,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {singleTextNode && contextType === 'node' && (
        <>
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            onClick={() => {
              console.log('Edit button clicked for node:', singleTextNode);
              onEditNode?.(singleTextNode);
              onClose();
            }}
          >
            <Edit className="h-4 w-4" />
            Edit Text
          </button>
          <div className="h-px bg-border my-1" />
        </>
      )}
      {hasSelectedItems ? (
        <button
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-destructive hover:bg-destructive/10"
          onClick={handleDeleteSelected}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting 
            ? "Deleting..." 
            : contextType === 'edge' 
              ? `Delete Edge${selectedEdges.length > 1 ? 's' : ''}`
              : `Delete ${selectedNodes.length + selectedEdges.length} item${(selectedNodes.length + selectedEdges.length) > 1 ? 's' : ''}`
          }
        </button>
      ) : contextType === 'pane' ? (
        <button
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
          onClick={() => {
            onAddNodeClick?.();
            onClose();
          }}
        >
          <Plus className="h-4 w-4" />
          Add Existing Node
        </button>
      ) : null}
    </div>
  );

  return contextMenu;
}
