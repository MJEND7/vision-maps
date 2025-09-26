"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Trash2, Plus, Edit, MessageSquare, Send } from "lucide-react";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
} from "../ui/drawer";
import { Button } from "../ui/button";
import { motion, AnimatePresence } from "motion/react";

interface CanvasContextMenuProps {
    frameId: Id<"frames">;
    selectedNodes: string[];
    selectedEdges: string[];
    contextType: "node" | "edge" | "pane";
    selectedNodeData?: { id: string; type: string; data: any }[];
    visionId?: Id<"visions">;
    onDeleteSelected?: () => void;
    onAddNodeClick?: () => void;
    onEditNode?: (nodeId: string) => void;
    onComment?: () => void;
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
}

// Hook to detect if device is mobile
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    React.useEffect(() => {
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

export function CanvasContextMenu({
    frameId,
    selectedNodes,
    selectedEdges,
    contextType,
    selectedNodeData,
    visionId,
    onDeleteSelected,
    onAddNodeClick,
    onEditNode,
    onComment,
    isOpen,
    position,
    onClose,
}: CanvasContextMenuProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreatingComment, setIsCreatingComment] = useState(false);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentText, setCommentText] = useState("");
    const isMobile = useIsMobile();

    const removeMultipleNodesFromFrame = useMutation(
        api.frames.removeMultipleNodesFromFrame
    );
    const createCommentChat = useMutation(api.comments.createCommentChat);

    const deleteEdge = useMutation(api.edges.deleteEdge).withOptimisticUpdate(
        (store, args) => {
            const currentEdges =
                store.getQuery(api.edges.get, { frameId: args.frameId }) ?? [];
            const updatedEdges = currentEdges.filter(
                (edge) => edge.id !== args.edgeId
            );
            store.setQuery(api.edges.get, { frameId: args.frameId }, updatedEdges);
        }
    );

    const handleDeleteSelected = useCallback(async () => {
        if (
            isDeleting ||
            (selectedNodes.length === 0 && selectedEdges.length === 0)
        )
            return;

        setIsDeleting(true);
        try {
            if (selectedNodes.length > 0) {
                await removeMultipleNodesFromFrame({
                    frameId,
                    nodeIds: selectedNodes,
                });
            }

            if (selectedEdges.length > 0) {
                await Promise.all(
                    selectedEdges.map((edgeId) =>
                        deleteEdge({
                            frameId,
                            edgeId,
                        })
                    )
                );
            }

            onDeleteSelected?.();
            onClose();
        } catch (error) {
            console.error("Failed to delete selected items:", error);
        } finally {
            setIsDeleting(false);
        }
    }, [
        removeMultipleNodesFromFrame,
        deleteEdge,
        frameId,
        selectedNodes,
        selectedEdges,
        onDeleteSelected,
        isDeleting,
        onClose,
    ]);

    const handleCreateComment = useCallback(async () => {
        if (
            isCreatingComment ||
            !commentText.trim() ||
            selectedNodes.length !== 1 ||
            !visionId
        )
            return;

        const selectedNode = selectedNodeData?.find(
            (node) => node.id === selectedNodes[0]
        );
        if (!selectedNode) return;

        setIsCreatingComment(true);
        try {
            const result = await createCommentChat({
                nodeId: selectedNode.data.node._id as Id<"nodes">,
                visionId,
                initialComment: commentText.trim(),
                title: `Comment on node`,
            });

            if (result.success && result.chatId) {
                onComment?.();
            }

            setCommentText("");
            setShowCommentInput(false);
            onClose();
        } catch (error) {
            console.error("Failed to create comment:", error);
        } finally {
            setIsCreatingComment(false);
        }
    }, [
        createCommentChat,
        selectedNodes,
        selectedNodeData,
        visionId,
        onComment,
        isCreatingComment,
        commentText,
        onClose,
    ]);

    const handleCancelComment = useCallback(() => {
        setCommentText("");
        setShowCommentInput(false);
    }, []);

    const handleKeyPress = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                handleCreateComment();
            } else if (e.key === "Escape") {
                handleCancelComment();
            }
        },
        [handleCreateComment, handleCancelComment]
    );

    const hasSelectedNodes = selectedNodes.length > 0;
    const hasSelectedEdges = selectedEdges.length > 0;
    const hasSelectedItems = hasSelectedNodes || hasSelectedEdges;
    const hasTextNode =
        selectedNodeData?.some((node) => node.type === "Text") || false;
    const singleTextNode =
        selectedNodes.length === 1 && hasTextNode ? selectedNodes[0] : null;
    const singleNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

    useEffect(() => {
        if (!isOpen || (contextType !== "node" && showCommentInput)) {
            setShowCommentInput(false)
        }
    }, [isOpen, contextType])

    const mobileMenu = (
        <Drawer open={isOpen} onOpenChange={onClose}>
            <DrawerContent data-context-menu>
                <DrawerHeader>
                    <DrawerTitle>Canvas Actions</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-2">
                    {!showCommentInput ? (
                        <>
                            {singleTextNode && contextType === "node" && (
                                <Button
                                    variant="default"
                                    onClick={() => {
                                        onEditNode?.(singleTextNode);
                                        onClose();
                                    }}
                                    className="w-full"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Text
                                </Button>
                            )}
                            {singleNode && contextType === "node" && visionId && (
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowCommentInput(true);
                                    }}
                                    disabled={isCreatingComment}
                                    className="w-full"
                                >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Comment
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
                                        : contextType === "edge"
                                            ? `Delete Edge${selectedEdges.length > 1 ? "s" : ""}`
                                            : `Delete ${selectedNodes.length + selectedEdges.length
                                            } item${selectedNodes.length + selectedEdges.length > 1
                                                ? "s"
                                                : ""
                                            }`}
                                </Button>
                            )}
                            {!hasSelectedItems && contextType === "pane" && (
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
                        </>
                    ) : (
                        <div className="space-y-2">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Write your comment..."
                                className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleCreateComment}
                                    disabled={isCreatingComment || !commentText.trim()}
                                    size="sm"
                                    className="flex-1"
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    {isCreatingComment ? "Creating..." : "Send"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCancelComment}
                                    size="sm"
                                    disabled={isCreatingComment}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <DrawerFooter>
                    <DrawerClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );

    const desktopMenu = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="context-menu"
                    data-context-menu
                    className="fixed z-50 bg-popover border rounded-md shadow-md p-1"
                    style={{
                        left: position.x,
                        top: position.y,
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    layout       // 👈 outer background smoothly resizes
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                    <motion.div layout className="min-w-[220px] max-w-[360px]">
                        {!showCommentInput ? (
                            <>
                                {singleTextNode && contextType === "node" && (
                                    <>
                                        <button
                                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm 
                            rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                            onClick={() => {
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
                                {singleNode && contextType === "node" && visionId && (
                                    <>
                                        <button
                                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm 
                            rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                e.nativeEvent.stopImmediatePropagation?.();
                                                setShowCommentInput(true);
                                            }}
                                            disabled={isCreatingComment}
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                            Comment
                                        </button>
                                        <div className="h-px bg-border my-1" />
                                    </>
                                )}
                                {hasSelectedItems ? (
                                    <button
                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm 
                          rounded-sm text-destructive hover:bg-destructive hover:text-white cursor-pointer"
                                        onClick={handleDeleteSelected}
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {isDeleting
                                            ? "Deleting..."
                                            : contextType === "edge"
                                                ? `Delete Edge${selectedEdges.length > 1 ? "s" : ""}`
                                                : `Delete ${selectedNodes.length + selectedEdges.length} item${selectedNodes.length + selectedEdges.length > 1 ? "s" : ""
                                                }`}
                                    </button>
                                ) : contextType === "pane" ? (
                                    <button
                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm 
                          rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                        onClick={() => {
                                            onAddNodeClick?.();
                                            onClose();
                                        }}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Existing Node
                                    </button>
                                ) : null}
                            </>
                        ) : (
                            <motion.div
                                className="p-2 space-y-2 w-80"    // 👈 forces expanded width nicely
                                onClick={(e) => e.stopPropagation()}
                            >
                                <textarea
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Write your comment..."
                                    className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md 
                        resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleCancelComment}
                                        size="sm"
                                        disabled={isCreatingComment}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateComment}
                                        disabled={isCreatingComment || !commentText.trim()}
                                        size="sm"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        {isCreatingComment ? "Creating..." : "Send"}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return isMobile ? mobileMenu : desktopMenu;
}
