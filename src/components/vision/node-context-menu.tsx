"use client";

import React, { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "../ui/drawer";
import { Button } from "../ui/button";

interface NodeContextMenuProps {
  frameId: Id<"frames">;
  nodeId: string;
  children: React.ReactNode;
  onDelete?: () => void;
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

export function NodeContextMenu({ frameId, nodeId, children, onDelete }: NodeContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMobile = useIsMobile();
  
  const removeNodeFromFrame = useMutation(api.frames.removeNodeFromFrame);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      await removeNodeFromFrame({
        frameId,
        nodeId,
      });
      
      // Call optional callback
      onDelete?.();
      
      // Close menu/drawer
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to delete node:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [removeNodeFromFrame, frameId, nodeId, onDelete, isDeleting]);

  if (isMobile) {
    // Mobile: Use Drawer
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <div onClick={() => setIsOpen(true)}>
          {children}
        </div>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Node Actions</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete Node"}
            </Button>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use DropdownMenu
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom">
        <DropdownMenuItem
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting ? "Deleting..." : "Delete Node"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export a trigger component for easier use
export function NodeContextMenuTrigger({ frameId, nodeId, onDelete }: Omit<NodeContextMenuProps, 'children'>) {
  return (
    <NodeContextMenu frameId={frameId} nodeId={nodeId} onDelete={onDelete}>
      <button
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background border rounded p-1 hover:bg-accent"
        onContextMenu={(e) => e.preventDefault()}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </NodeContextMenu>
  );
}