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
    Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useState, useEffect, useMemo } from "react";
import debounce from "lodash.debounce";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import PasteBin from "../channel/paste-bin";
import { useMovementQueue } from "../../hooks/frames/useMovementQueue";
import nodeTypes from "./nodes";
import { CanvasContextMenu } from "./canvas-context-menu";
import { SearchVisionNodes } from "./search-vision-nodes";
import usePresence from "@convex-dev/presence/react";
import { useSidebar } from "../../contexts/sidebar-context";
import { useViewportCenter } from "../../hooks/frames/useViewportCenter";
import { ReactFlowErrorBoundary } from "./ReactFlowErrorBoundary";
import useCreateNode from "@/hooks/nodes/useCreateNode";

export function ViewportAwareNodeManager({
    onViewportCenterChange,
    onScreenToFlowPositionChange,
}: {
    onViewportCenterChange: (getCenter: () => { x: number; y: number }) => void;
    onScreenToFlowPositionChange: (
        convert: (x: number, y: number) => { x: number; y: number }
    ) => void;
}) {
    const { getViewportCenter, convertScreenToFlowPosition } = useViewportCenter();

    useEffect(() => {
        onViewportCenterChange(getViewportCenter);
        onScreenToFlowPositionChange(convertScreenToFlowPosition);
    }, [
        getViewportCenter,
        convertScreenToFlowPosition,
        onViewportCenterChange,
        onScreenToFlowPositionChange,
    ]);

    return null; // purely hooks, no visible UI element
}
export default function FrameComponent({
    id,
    userId,
    visionId,
    onShowUpgradeDialog,
}: {
    id: Id<"frames">;
    userId: string;
    visionId: string;
    onShowUpgradeDialog: (show: boolean) => void;
}) {
    const { openChat, rightSidebarContentRef } = useSidebar();
    const [isDark, setIsDark] = useState(false);
    const [getViewportCenter, setViewportCenter] = useState<() => { x: number; y: number }>(() => ({ x: 0, y: 0 }));
    const [convertScreenToFlowPosition, setConvertScreenToFlowPosition] = useState<((x: number, y: number) => { x: number; y: number }) | null>(null);
    const [rightClickPosition, setRightClickPosition] = useState<{ x: number; y: number } | null>(null);

    // === styling ===
    const defaultEdgeOptions: DefaultEdgeOptions = useMemo(
        () => ({
            animated: true,
            style: {
                stroke: isDark ? "#e5e5e5" : "#b1b1b7",
                strokeWidth: 2,
            },
            markerEnd: { type: "arrow", color: isDark ? "#e5e5e5" : "#b1b1b7" },
        }),
        [isDark]
    );

    // track system dark mode
    useEffect(() => {
        const checkDarkMode = () => {
            const isDarkMode = document.documentElement.classList.contains("dark");
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

    // === main state ===
    const [nodes, setNodes] = useState<Node[]>([]);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
    const [contextMenu, setContextMenu] = useState({
        show: false,
        x: 0,
        y: 0,
        type: "pane" as "node" | "edge" | "pane",
    });
    const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);

    // === Convex data ===
    const frame = useQuery(api.frames.get, { id });
    usePresence(api.presence as any, `vision:${id}:${frame?.vision}`, userId);

    const users = useQuery(api.presence.listRoom, {
        roomToken: `vision:${id}:${frame?.vision}`,
    });
    const isAlone = !(users?.find((u) => u.online));

    const createNode = useCreateNode({ visionId });
    const updateEdges = useMutation(api.edges.update);
    const addExistingNodeToFrame = useMutation(api.nodes.addToFrame);

    const framedNodes = useQuery(api.frames.getFrameNodes, { frameId: id });
    const edges = useQuery(api.edges.get, { frameId: id });

    // Movement queue
    const { setNodesMap, handleNodesChange } = useMovementQueue(id, isAlone, setNodes);

    const updateEditingNodeId = useCallback((nodeId: string | null) => {
        setNodes((cur) => cur.map((n) => ({
            ...n,
            data: { ...n.data, editingNodeId: nodeId },
        })));
    }, []);

    const updateNodeContent = useCallback((nodeId: string, newValue: string) => {
        setNodes((cur) =>
            cur.map((n) =>
                n.id === nodeId
                    ? {
                        ...n,
                        data: {
                            ...n.data,
                            node: { ...(n.data.node || {}), value: newValue },
                        },
                    }
                    : n
            )
        );
    }, []);

    // === Node data sync ===
    useEffect(() => {
        if (!framedNodes) return;
        setNodes((current) => {
            const newMap = new Map(current.map((n) => [n.id, n]));
            const framedNodeIds = new Set(framedNodes.map((fn) => fn.node.id));

            Array.from(newMap.keys()).forEach((nodeId) => {
                if (!framedNodeIds.has(nodeId)) newMap.delete(nodeId);
            });

            framedNodes.forEach((framedNode) => {
                if (newMap.get(framedNode.node.id)) return;
                const reactNode: Node = {
                    ...(framedNode.node as any),
                    type: framedNode.node.variant || "Text",
                    data: {
                        node: framedNode.node,
                        nodeUser: null,
                        frameId: id,
                        visionId: frame?.vision,
                        onEditComplete: () => updateEditingNodeId(null),
                        onUpdateNodeContent: updateNodeContent,
                        onOpenChat: openChat,
                        onComment: () => {
                            rightSidebarContentRef?.current?.openNodeComments?.(
                                framedNode.node._id
                            );
                        },
                        onNodeRightClick: (nodeId: string, event: React.MouseEvent) => {
                            setSelectedNodes((sel) =>
                                sel.includes(nodeId) ? sel : [nodeId]
                            );
                            setSelectedEdges([]);
                            setContextMenu({
                                show: true,
                                x: event.clientX,
                                y: event.clientY,
                                type: "node",
                            });
                        },
                    },
                };
                newMap.set(reactNode.id, reactNode);
            });

            const nextNodes = Array.from(newMap.values());
            setNodesMap(newMap);
            return nextNodes;
        });
    }, [
        framedNodes,
        setNodesMap,
        id,
        openChat,
        updateEditingNodeId,
        updateNodeContent,
        rightSidebarContentRef,
        frame?.vision,
    ]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
            handleNodesChange(changes);
        },
        [handleNodesChange]
    );

    const debouncedSelectionChange = useMemo(
        () =>
            debounce(({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
                setSelectedNodes(nodes.map((node) => node.id));
                setSelectedEdges(edges.map((edge) => edge.id));
            }, 16),
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
            const currentEdges = store.getQuery(api.edges.get, { frameId: id }) ?? [];
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
            )
                return;
            const connectionWithDefaults = {
                ...connection,
                sourceHandle: connection.sourceHandle || Position.Bottom,
                targetHandle: connection.targetHandle || Position.Left,
            };
            connect({ frameId: id, connection: connectionWithDefaults });
        },
        [connect, id]
    );

    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent | MouseEvent) => {
            event.preventDefault();
            setSelectedNodes([]);
            setSelectedEdges([]);
            if (convertScreenToFlowPosition) {
                try {
                    const flowPos = convertScreenToFlowPosition(
                        event.clientX,
                        event.clientY
                    );
                    setRightClickPosition(flowPos);
                } catch (err) {
                    console.warn(err);
                    setRightClickPosition(null);
                }
            }
            setContextMenu({
                show: true,
                x: event.clientX,
                y: event.clientY,
                type: "pane",
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
                type: "edge",
            });
        },
        []
    );

    const closeContextMenu = useCallback(() => {
        setContextMenu({ show: false, x: 0, y: 0, type: "pane" });
    }, []);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if ((e.target as Element)?.closest("[data-context-menu]")) return;
            closeContextMenu();
        };
        if (contextMenu.show) {
            document.addEventListener("click", handleClick);
            return () => document.removeEventListener("click", handleClick);
        }
    }, [contextMenu.show, closeContextMenu]);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
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
                    type: "node",
                });
            }
        };
        document.addEventListener("contextmenu", handler, true);
        return () => document.removeEventListener("contextmenu", handler, true);
    }, [selectedNodes.length]);

    if (!framedNodes || !edges || !frame) {
        return (
            <div className="w-full h-[93%] px-4 pt-4 flex items-center justify-center">
                <p>Loading frame...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full px-4 pt-4">
            <div className="relative h-[calc(100%-1rem)]">
                <ReactFlowErrorBoundary>
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
                        panOnDrag
                        selectionOnDrag
                        selectNodesOnDrag={false}
                        panOnScroll
                        zoomOnScroll={false}
                        zoomOnPinch
                        zoomOnDoubleClick={false}
                        zoomActivationKeyCode="Shift"
                    >
                        <Controls position="top-left"  />
                        <Background
                            key={id}
                            variant={BackgroundVariant.Dots}
                            id={`background-${id}`}
                            gap={40}
                            size={2}
                        />
                        {/* viewport manager now just reports data */}
                        <ViewportAwareNodeManager
                            onViewportCenterChange={(getCenter) =>
                                setViewportCenter(() => getCenter)
                            }
                            onScreenToFlowPositionChange={(convert) =>
                                setConvertScreenToFlowPosition(() => convert)
                            }
                        />
                    </ReactFlow>
                </ReactFlowErrorBoundary>


                {/* context menu */}
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
                    visionId={frame?.vision}
                    onDeleteSelected={() => {
                        setSelectedNodes([]);
                        setSelectedEdges([]);
                        closeContextMenu();
                    }}
                    onAddNodeClick={() => {
                        setShowAddNodeDialog(true);
                        closeContextMenu();
                    }}
                    onEditNode={(nodeId) => {
                        updateEditingNodeId(nodeId);
                        closeContextMenu();
                    }}
                    onComment={() => {
                        if (selectedNodes.length === 1) {
                            const selectedNode = selectedNodes
                                .map((nodeId) => {
                                    const node = nodes.find((n) => n.id === nodeId);
                                    if (!node?.data?.node || typeof node.data.node !== "object")
                                        return null;
                                    return (node.data.node as { _id: Id<"nodes"> })._id;
                                })
                                .filter(Boolean)[0];
                            if (selectedNode) {
                                rightSidebarContentRef?.current?.openNodeComments?.(
                                    selectedNode
                                );
                            }
                        }
                        closeContextMenu();
                    }}
                    isOpen={contextMenu.show}
                    onClose={closeContextMenu}
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                />
            </div>

            <PasteBin
                onCreateNode={(n) => createNode(n, { id, center: getViewportCenter() })}
                onShowUpgradeDialog={onShowUpgradeDialog}
                channelId={frame.channel}
                visionId={visionId}
            />

            <SearchVisionNodes
                isOpen={showAddNodeDialog}
                onClose={() => setShowAddNodeDialog(false)}
                frameId={id}
                channelId={frame.channel}
                onNodeAdded={() => setShowAddNodeDialog(false)}
                onAddNode={async (nodeId) => {
                    let position: { x: number; y: number };
                    if (rightClickPosition) {
                        position = rightClickPosition;
                    } else {
                        const center = getViewportCenter();
                        position = { x: center.x, y: center.y };
                    }
                    await addExistingNodeToFrame({
                        nodeId,
                        frameId: id,
                        position,
                    });
                }}
            />
        </div>
    );
}
