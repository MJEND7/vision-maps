"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Search, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface AddExistingNodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  frameId: Id<"frames">;
  channelId: Id<"channels">;
  onNodeAdded?: () => void;
  onAddNode?: (nodeId: Id<"nodes">) => Promise<void>;
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


export function AddExistingNodeDialog({ 
  isOpen, 
  onClose, 
  frameId, 
  channelId, 
  onNodeAdded,
  onAddNode
}: AddExistingNodeDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const isMobile = useIsMobile();

  // Get existing nodes from channel
  const nodesResult = useQuery(
    api.nodes.listByChannel,
    isOpen ? {
      channelId,
      paginationOpts: { numItems: 50, cursor: null },
      filters: {
        search: searchTerm || undefined,
        variant: selectedVariant || undefined,
        sortBy: "latest",
      },
    } : "skip"
  );

  // Mutation to add existing node to frame
  const addExistingNodeToFrame = useMutation(api.nodes.addToFrame);

  // Get existing framed nodes to filter out nodes already in this frame
  const framedNodes = useQuery(api.frames.getFrameNodes, { frameId });

  // Filter out nodes that are already in this frame
  const availableNodes = useMemo(() => {
    if (!nodesResult?.page) return [];
    
    // Get IDs of nodes already in this frame
    const existingNodeIds = new Set(
      framedNodes?.map(framedNode => framedNode.node.data) || []
    );
    
    // Filter out nodes that are already in the current frame
    return nodesResult.page.filter(node => 
      !existingNodeIds.has(node._id)
    );
  }, [nodesResult, framedNodes]);

  // Get unique variants for filtering
  const variants = useMemo(() => {
    if (!nodesResult?.page) return [];
    const uniqueVariants = [...new Set(nodesResult.page.map(node => node.variant))];
    return uniqueVariants.sort();
  }, [nodesResult]);

  const handleAddNode = useCallback(async (nodeId: Id<"nodes">) => {
    try {
      if (onAddNode) {
        // Use the custom handler passed from parent (with viewport positioning)
        await onAddNode(nodeId);
      } else {
        // Fallback to basic positioning
        await addExistingNodeToFrame({
          nodeId,
          frameId,
          position: {
            x: Math.random() * 400,
            y: Math.random() * 400,
          },
        });
      }
      
      onNodeAdded?.();
      onClose();
    } catch (error) {
      console.error("Failed to add node to frame:", error);
    }
  }, [addExistingNodeToFrame, frameId, onNodeAdded, onClose, onAddNode]);

  const dialogContent = (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Variant Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedVariant("")}
          className={`px-3 py-1 rounded-full text-xs ${
            selectedVariant === "" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          All
        </button>
        {variants.map((variant) => (
          <button
            key={variant}
            onClick={() => setSelectedVariant(variant)}
            className={`px-3 py-1 rounded-full text-xs ${
              selectedVariant === variant
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {variant}
          </button>
        ))}
      </div>

      {/* Nodes List */}
      <div className="max-h-60 overflow-y-auto space-y-2">
        {availableNodes.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {nodesResult?.page?.length === 0 ? "No nodes found in this channel" : "No available nodes to add"}
          </div>
        ) : (
          availableNodes.map((node) => (
            <div
              key={node._id}
              className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent"
            >
              <div className="">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {node.variant}
                  </span>
                  {node.frameTitle && (
                    <span className="text-xs text-muted-foreground truncate">
                      in {node.frameTitle}
                    </span>
                  )}
                </div>
                <h4 className="max-w-[300px] font-medium text-sm truncate">{node.title}</h4>
                {node.thought && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {node.thought}
                  </p>
                )}
                <p className="max-w-[300px] text-xs text-muted-foreground mt-1 truncate">
                  {node.value}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleAddNode(node._id)}
                className="ml-2 shrink-0"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {nodesResult && !nodesResult.isDone && (
        <div className="text-center">
          <Button variant="outline" size="sm">
            Load More
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>Add Existing Node</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            {dialogContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Existing Node</DialogTitle>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
