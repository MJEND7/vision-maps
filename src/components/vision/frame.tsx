"use client";

import {
    Background,
    BackgroundVariant,
    Controls,
    ReactFlow,
    addEdge,
    NodeChange,
    EdgeChange,
    Connection,
    Node,
    Edge,
    applyNodeChanges,
    DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useState, useEffect, useMemo } from "react";
import debounce from "lodash.debounce";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import PasteBin from "../channel/paste-bin";
import { CreateNodeArgs } from "../../../convex/nodes";
import { useMetadataCache } from "../../utils/ogMetadata";
import { useMovementQueue } from "../../hooks/useMovementQueue";
import nodeTypes from "./nodes";
import { CanvasContextMenu } from "./canvas-context-menu";
import { AddExistingNodeDialog } from "./add-existing-node-dialog";
import usePresence from "@convex-dev/presence/react";
import { useSidebar } from "../../contexts/sidebar-context";
import { useViewportCenter } from "../../hooks/useViewportCenter";

// Component that has access to ReactFlow context for viewport positioning
function ViewportAwareNodeManager({
    showAddNodeDialog,
    setShowAddNodeDialog,
    id,
    frame,
    addExistingNodeToFrame,
    onViewportCenterChange,
    onScreenToFlowPositionChange,
    rightClickPosition,
}: {
    showAddNodeDialog: boolean;
    setShowAddNodeDialog: (show: boolean) => void;
    id: Id<"frames">;
    frame: any;
    addExistingNodeToFrame: any;
    onViewportCenterChange: (getCenter: () => { x: number; y: number }) => void;
    onScreenToFlowPositionChange: (convert: (x: number, y: number) => { x: number; y: number }) => void;
    rightClickPosition: { x: number; y: number } | null;
}) {
    const { getViewportCenter, convertScreenToFlowPosition } = useViewportCenter();

    // Pass the viewport functions up to the parent
    useEffect(() => {
        onViewportCenterChange(getViewportCenter);
        onScreenToFlowPositionChange(convertScreenToFlowPosition);
    }, [getViewportCenter, convertScreenToFlowPosition, onViewportCenterChange, onScreenToFlowPositionChange]);

    const handleAddExistingNode = useCallback(async (nodeId: Id<"nodes">) => {
        let position: { x: number; y: number };

        if (rightClickPosition) {
            // Use the right-click position if available
            position = rightClickPosition;
        } else {
            // Fallback to viewport center with randomness
            const center = getViewportCenter();
            position = {
                x: center.x + (Math.random() - 0.5) * 200,
                y: center.y + (Math.random() - 0.5) * 200,
            };
        }

        await addExistingNodeToFrame({
            nodeId,
            frameId: id,
            position,
        });
    }, [getViewportCenter, addExistingNodeToFrame, id, rightClickPosition]);

    return (
        <AddExistingNodeDialog
            isOpen={showAddNodeDialog}
            onClose={() => setShowAddNodeDialog(false)}
            frameId={id}
            channelId={frame.channel}
            onNodeAdded={() => setShowAddNodeDialog(false)}
            onAddNode={handleAddExistingNode}
        />
    );
}

export default function FrameComponent({
    id,
    userId,
}: {
    id: Id<"frames">;
    userId: string;
}) {
    const { openChat } = useSidebar();
    const [isDark, setIsDark] = useState(false);
    const [getViewportCenter, setGetViewportCenter] = useState<(() => { x: number; y: number }) | null>(null);
    const { cacheMetadataForUrl } = useMetadataCache();
    const [convertScreenToFlowPosition, setConvertScreenToFlowPosition] = useState<((x: number, y: number) => { x: number; y: number }) | null>(null);
    const [rightClickPosition, setRightClickPosition] = useState<{ x: number; y: number } | null>(null);

    // Dynamic edge styling - memoized to prevent unnecessary re-renders
    const defaultEdgeOptions: DefaultEdgeOptions = useMemo(() => ({
        animated: true,
        style: {
            stroke: isDark ? "#e5e5e5" : "#b1b1b7",
            strokeWidth: 2,
        },
        markerEnd: { type: 'arrow', color: isDark ? "#e5e5e5" : "#b1b1b7" },
    }), [isDark]);

    // Detect dark mode from Tailwind
    useEffect(() => {
        const checkDarkMode = () => {
            const isDarkMode =
                document.documentElement.classList.contains("dark");
            setIsDark(isDarkMode);
        };
        checkDarkMode();

        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    const [nodes, setNodes] = useState<Node[]>([]);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
    const [contextMenu, setContextMenu] = useState<{
        show: boolean;
        x: number;
        y: number;
        type: 'node' | 'edge' | 'pane';
    }>({ show: false, x: 0, y: 0, type: 'pane' });
    const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    // === Convex data ===
    const frame = useQuery(api.frames.get, { id });
    usePresence(api.presence as any, `vision:${id}:${frame?.vision}`, userId);

    const users = useQuery(api.presence.listRoom, {
        roomToken: `vision:${id}:${frame?.vision}`,
    });
    const isAlone = !(users?.find((u) => u.online));

    const createNode = useMutation(api.nodes.create);
    const updateEdges = useMutation(api.edges.update);
    const addExistingNodeToFrame = useMutation(api.nodes.addToFrame);
    const updateChatNodeId = useMutation(api.chats.updateChatNodeId);

    const framedNodes = useQuery(api.frames.getFrameNodes, { frameId: id });
    const edges = useQuery(api.edges.get, { frameId: id });

    // Movement queue
    const { setNodesMap, handleNodesChange } = useMovementQueue(
        id,
        isAlone,
        setNodes
    );

    // === Node data transformation ===
    useEffect(() => {
        if (!framedNodes) return;

        setNodes((current) => {
            const newMap = new Map(current.map((n) => [n.id, n])); // existing

            // Get the current set of node IDs from framedNodes
            const framedNodeIds = new Set(framedNodes.map(fn => fn.node.id));

            // Remove nodes that are no longer in framedNodes
            const currentNodeIds = Array.from(newMap.keys());
            currentNodeIds.forEach(nodeId => {
                if (!framedNodeIds.has(nodeId)) {
                    newMap.delete(nodeId);
                }
            });


            // Add/update nodes from framedNodes
            framedNodes.forEach((framedNode) => {
                if (newMap.get(framedNode.node.id)) {
                    return
                }
                const reactNode: Node = {
                    ...(framedNode.node as any),
                    type: framedNode.node.variant || "Text",
                    data: {
                        node:
                            framedNode.node ||
                            ({
                                _id: "",
                                title: "Error loading node",
                                variant: "Text",
                                value: "",
                            } as any),
                        nodeUser: null,
                        frameId: id,
                        editingNodeId,
                        onEditComplete: () => setEditingNodeId(null),
                        onOpenChat: openChat,
                        onNodeRightClick: (nodeId: string, event: React.MouseEvent) => {
                            setSelectedNodes((sel) =>
                                sel.includes(nodeId) ? sel : [nodeId]
                            );
                            setSelectedEdges([]);
                            setContextMenu({
                                show: true,
                                x: event.clientX,
                                y: event.clientY,
                                type: 'node',
                            });
                        },
                    },
                };

                newMap.set(reactNode.id, reactNode); // add/replace
            });

            const nextNodes = Array.from(newMap.values());
            setNodesMap(newMap);
            return nextNodes;
        });
    }, [framedNodes, setNodesMap, editingNodeId, id, openChat]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
            handleNodesChange(changes);
        },
        [handleNodesChange]
    );

    // Debounce selection changes to prevent excessive re-renders
    const debouncedSelectionChange = useMemo(
        () => debounce(({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
            setSelectedNodes(nodes.map((node) => node.id));
            setSelectedEdges(edges.map((edge) => edge.id));
        }, 16), // ~60fps
        []
    );

    const onSelectionChange = useCallback(
        (selection: { nodes: Node[]; edges: Edge[] }) => {
            debouncedSelectionChange(selection);
        },
        [debouncedSelectionChange]
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const avoidPending = changes.filter(
                (c) => !("id" in c && c.id.startsWith("pending-"))
            );
            updateEdges({ frameId: id, changes: avoidPending as any });
        },
        [updateEdges, id]
    );

    const connect = useMutation(api.edges.connect).withOptimisticUpdate(
        (store, args) => {
            const currentEdges =
                store.getQuery(api.edges.get, { frameId: id }) ?? [];
            const connection = {
                source: args.connection.source || "",
                target: args.connection.target || "",
                sourceHandle: args.connection.sourceHandle || null,
                targetHandle: args.connection.targetHandle || null,
            };
            const updated = addEdge(connection, currentEdges);
            store.setQuery(api.edges.get, { frameId: id }, updated);
        }
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            if (
                connection.source?.startsWith("pending-") ||
                connection.target?.startsWith("pending-")
            ) {
                console.warn("Ignoring pending connection", { connection });
                return;
            }
            connect({ frameId: id, connection });
        },
        [connect, id]
    );

    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent | MouseEvent) => {
            event.preventDefault();
            setSelectedNodes([]);
            setSelectedEdges([]);

            // Convert screen coordinates to world coordinates for node positioning
            if (convertScreenToFlowPosition) {
                try {
                    const flowPosition = convertScreenToFlowPosition(event.clientX, event.clientY);
                    setRightClickPosition(flowPosition);
                } catch (error) {
                    console.warn('Failed to calculate right-click position:', error);
                    setRightClickPosition(null);
                }
            } else {
                setRightClickPosition(null);
            }

            setContextMenu({
                show: true,
                x: event.clientX,
                y: event.clientY,
                type: 'pane',
            });
        },
        [convertScreenToFlowPosition]
    );

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            event.preventDefault();
            event.stopPropagation();
            setSelectedNodes([]);
            setSelectedEdges([edge.id]);
            setContextMenu({
                show: true,
                x: event.clientX,
                y: event.clientY,
                type: 'edge',
            });
        },
        []
    );

    const closeContextMenu = useCallback(() => {
        setContextMenu({ show: false, x: 0, y: 0, type: 'pane' });
    }, []);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            const target = event.target as Element;
            if (target?.closest("[data-context-menu]")) return;
            closeContextMenu();
        };
        if (contextMenu.show) {
            document.addEventListener("click", handleClick);
            return () => document.removeEventListener("click", handleClick);
        }
    }, [contextMenu.show, closeContextMenu]);

    // Selection rectangle right-click
    useEffect(() => {
        const handleSelectionRectContextMenu = (event: MouseEvent) => {
            const target = event.target as Element;
            if (
                target?.classList.contains("react-flow__nodesselection-rect") &&
                selectedNodes.length > 0
            ) {
                event.preventDefault();
                event.stopPropagation();
                setContextMenu({
                    show: true,
                    x: event.clientX,
                    y: event.clientY,
                    type: 'node',
                });
            }
        };
        document.addEventListener(
            "contextmenu",
            handleSelectionRectContextMenu,
            true
        );
        return () => {
            document.removeEventListener(
                "contextmenu",
                handleSelectionRectContextMenu,
                true
            );
        };
    }, [selectedNodes.length]);


    const handleNodeCreation = useCallback(async (data: Omit<CreateNodeArgs, "channel">) => {
        if (!frame) throw new Error("Failed to get a frame");

        // Cache OG metadata for URLs
        if (data.value) {
            await cacheMetadataForUrl(data.value);
        }

        // Use viewport center if available, otherwise fallback to reasonable center
        let centerX, centerY;
        if (getViewportCenter) {
            const center = getViewportCenter();
            centerX = center.x + (Math.random() - 0.5) * 200;
            centerY = center.y + (Math.random() - 0.5) * 200;
        } else {
            centerX = 300 + (Math.random() - 0.5) * 400;
            centerY = 300 + (Math.random() - 0.5) * 400;
        }

        const nodeId = await createNode({
            ...data,
            channel: frame.channel,
            frameId: frame._id,
            position: {
                id: crypto.randomUUID(),
                position: {
                    x: centerX,
                    y: centerY
                },
                type: data.variant || "Text",
                data: "",
            },
        });

        // If this is an AI node and the value looks like a chatId, update the chat to link to this node
        if (data.variant === "AI" && data.value) {
            try {
                await updateChatNodeId({
                    chatId: data.value as Id<"chats">,
                    nodeId: nodeId,
                });
            } catch (error) {
                console.error("Failed to link chat to node:", error);
            }
        }
    }, [frame, cacheMetadataForUrl, getViewportCenter, createNode, updateChatNodeId]);

    if (!framedNodes || !edges || !frame) {
        return (
            <div className="w-full h-[93%] px-4 pt-4 flex items-center justify-center">
                <p>Loading frame...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full px-4 pt-4">
            <div className="relative h-[calc(100%-4rem)]">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onSelectionChange={onSelectionChange}
                    onPaneContextMenu={onPaneContextMenu}
                    onEdgeContextMenu={onEdgeContextMenu}
                    onMove={closeContextMenu}
                    onMoveStart={closeContextMenu}
                    nodeTypes={nodeTypes as any}
                    defaultEdgeOptions={defaultEdgeOptions}
                    fitView
                    colorMode={isDark ? "dark" : "light"}
                    className="rounded-xl w-full h-full"
                    multiSelectionKeyCode="Meta"
                    panOnDrag={true}
                    selectionOnDrag={true}
                    selectNodesOnDrag={false}
                    panOnScroll={true}
                    zoomOnScroll={false}
                    zoomOnPinch={true}
                    zoomOnDoubleClick={false}
                    zoomActivationKeyCode="Shift"
                >
                    <Controls />
                    <Background
                        key={id}
                        variant={BackgroundVariant.Dots}
                        id={`background-${id}`}
                        gap={10}
                        size={0.9}
                    />

                    <ViewportAwareNodeManager
                        showAddNodeDialog={showAddNodeDialog}
                        setShowAddNodeDialog={setShowAddNodeDialog}
                        id={id}
                        frame={frame}
                        addExistingNodeToFrame={addExistingNodeToFrame}
                        onViewportCenterChange={(getCenter) => setGetViewportCenter(() => getCenter)}
                        onScreenToFlowPositionChange={(convert) => setConvertScreenToFlowPosition(() => convert)}
                        rightClickPosition={rightClickPosition}
                    />
                </ReactFlow>

                <CanvasContextMenu
                    frameId={id}
                    selectedNodes={selectedNodes}
                    selectedEdges={selectedEdges}
                    contextType={contextMenu.type}
                    selectedNodeData={selectedNodes
                        .map((nodeId) => {
                            const node = nodes.find((n) => n.id === nodeId);
                            return node
                                ? {
                                    id: nodeId,
                                    type: node.type || "Text",
                                    data: node.data,
                                }
                                : null;
                        })
                        .filter(Boolean) as { id: string; type: string; data: any }[]}
                    onDeleteSelected={() => {
                        // Clear selections after deletion
                        setSelectedNodes([]);
                        setSelectedEdges([]);
                        closeContextMenu();
                    }}
                    onAddNodeClick={() => {
                        setShowAddNodeDialog(true);
                        closeContextMenu();
                    }}
                    onEditNode={(nodeId) => {
                        setEditingNodeId(nodeId);
                        closeContextMenu();
                    }}
                    isOpen={contextMenu.show}
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={closeContextMenu}
                />
            </div>
            <PasteBin
                onCreateNode={handleNodeCreation}
                channelId={frame?.channel as string}
                visionId={frame?.vision as string}
            />
        </div>
    );
}
