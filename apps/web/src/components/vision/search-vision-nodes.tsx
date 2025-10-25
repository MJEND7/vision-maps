"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Search, Filter } from "lucide-react";
import { Input } from "../ui/input";
import { NODE_VARIANTS } from "@/lib/constants";
import useSmoothWheelScroll from "@/hooks/srcoll";
import { NodeVariants } from "@convex/tables/nodes";
import { PlatformIcon } from "./platform-icons";

// shadcn/ui
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface AddExistingNodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  frameId: Id<"frames">;
  channelId: Id<"channels">;
  onNodeAdded?: () => void;
  onAddNode: (nodeId: Id<"nodes">) => Promise<void>;
}

// ✅ Detect if device is mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);
  return isMobile;
}

// ✅ Helper: node subtitle
function getNodeSubtitle(node: any): string {
  const variant = node.variant as string;

  if (variant === NodeVariants.Text && node.value) {
    return node.value.split("\n")[0].substring(0, 80);
  }

  if (node.value?.startsWith("http")) return node.value;

  return variant;
}

// ✅ Component: Node preview card
function NodePreviewCard({
  node,
  onNodeClick,
}: {
  node: any;
  onNodeClick: (nodeId: Id<"nodes">) => void;
}) {
  const subtitle = getNodeSubtitle(node);
  return (
    <div
      onClick={() => onNodeClick(node._id)}
      className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer group"
    >
      <div className="flex-shrink-0">
        <PlatformIcon variant={node.variant} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium truncate">{node.title}</span>
          {subtitle && <span className="text-xs truncate">{subtitle}</span>}
        </div>
      </div>
      <div className="flex-shrink-0 transition-colors">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );
}

// ✅ Main Dialog Component
export function SearchVisionNodes({
  isOpen,
  onClose,
  frameId,
  channelId,
  onNodeAdded,
  onAddNode,
}: AddExistingNodeDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);

  const isMobile = useIsMobile();
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollVariantsRef = useRef<HTMLDivElement | null>(null);

  useSmoothWheelScroll(scrollVariantsRef, isMobile, isOpen);

  // 🔒 Close dialog when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // 🧠 Get channel's nodes
  const nodesResult = useQuery(
    api.nodes.listByChannel,
    isOpen
      ? {
          channelId,
          paginationOpts: { numItems: 20, cursor: null },
          filters: {
            search: searchTerm || undefined,
            variant: selectedVariant || undefined,
            sortBy: "oldest",
          },
        }
      : "skip"
  );

  const addExistingNodeToFrame = useMutation(api.nodes.addToFrame);
  const framedNodes = useQuery(api.frames.getFrameNodes, { frameId });

  // 💡 Filter out already-used nodes
  const availableNodes = useMemo(() => {
    if (!nodesResult?.page) return [];
    const existingNodeIds = new Set(
      framedNodes?.map((f) => f.node.data) || []
    );
    return nodesResult.page.filter((n) => !existingNodeIds.has(n._id));
  }, [nodesResult, framedNodes]);

  const handleNodeClick = useCallback(
    async (nodeId: Id<"nodes">) => {
      try {
        await onAddNode(nodeId);
        onNodeAdded?.();
        onClose();
      } catch (error) {
        console.error("Failed to add node to frame:", error);
      }
    },
    [addExistingNodeToFrame, frameId, onNodeAdded, onClose, onAddNode]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed z-[50] inset-0 flex items-center justify-center">
      <div
        ref={dialogRef}
        className="bg-background border rounded-xl w-screen h-screen sm:w-[750px] sm:h-[600px] flex flex-col shadow-lg"
      >
        {/* 🔍 Search Bar */}
        <div className="px-3 relative flex gap-2 items-center py-1.5 h-12">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-0 bg-transparent dark:bg-transparent border-none shadow-none focus-visible:ring-0"
          />

          {/* 🎛️ Filter Popover */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-muted-foreground hover:text-foreground"
                title="Filter"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              ref={scrollVariantsRef}
              className="w-56 p-2 bg-background"
              align={"end"}
              sideOffset={5}
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    setSelectedVariant("");
                    setFilterOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    selectedVariant === ""
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  All
                </button>

                {NODE_VARIANTS.map((variant) => (
                  <button
                    key={variant.value}
                    onClick={() => {
                      setSelectedVariant(variant.value);
                      setFilterOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      selectedVariant === variant.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <PlatformIcon variant={variant.value} size="sm" />
                    {variant.value}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 🧠 Node List */}
        <div className="flex-1 space-y-2 p-2 overflow-y-auto">
          {availableNodes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {nodesResult?.page?.length === 0
                ? "No nodes found in this channel"
                : "No available nodes to add"}
            </div>
          ) : (
            availableNodes.map((node) => (
              <NodePreviewCard
                key={node._id}
                node={node}
                onNodeClick={handleNodeClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
