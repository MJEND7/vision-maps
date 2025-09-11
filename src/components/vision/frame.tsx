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
import { useCallback, useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import PasteBin from "../channel/paste-bin";
import { CreateNodeArgs } from "../../../convex/nodes";
import { useMovementQueue } from "../../hooks/useMovementQueue";
import nodeTypes from "./nodes";
import { CanvasContextMenu } from "./canvas-context-menu";
import { AddExistingNodeDialog } from "./add-existing-node-dialog";
import usePresence from "@convex-dev/presence/react";
import { useSidebar } from "../../contexts/sidebar-context";

export default function FrameComponent({
    id,
    userId,
}: {
    id: Id<"frames">;
    userId: string;
}) {
    const { openChat } = useSidebar();
    const [isDark, setIsDark] = useState(false);

    // Dynamic edge styling
    const defaultEdgeOptions: DefaultEdgeOptions = {
        animated: true,
        style: {
            stroke: isDark ? "#e5e5e5" : "#b1b1b7",
            strokeWidth: 2,
        },
        markerEnd: { type: 'arrow', color: isDark ? "#e5e5e5" : "#b1b1b7" },
    };

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
        console.log("framed NODES", framedNodes)
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
                const reactNode: Node = {
                    ...(framedNode.node as any),
                    type: framedNode.node.type || "Text",
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

    const onSelectionChange = useCallback(
        ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
            setSelectedNodes(selectedNodes.map((node) => node.id));
            setSelectedEdges(selectedEdges.map((edge) => edge.id));
        },
        []
    );

    useEffect(() => {
        setNodes((current) =>
            current.map((node) => ({
                ...node,
                selected: selectedNodes.includes(node.id),
            }))
        );
    }, [selectedNodes]);

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
            setContextMenu({
                show: true,
                x: event.clientX,
                y: event.clientY,
                type: 'pane',
            });
        },
        []
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

    const handleNodeCreation = async (data: Omit<CreateNodeArgs, "channel">) => {
        if (!frame) throw new Error("Failed to get a frame");
        await createNode({
            ...data,
            channel: frame.channel,
            frameId: frame._id,
            position: {
                id: crypto.randomUUID(),
                position: { x: Math.random() * 400, y: Math.random() * 400 },
                type: data.variant || "Text",
                data: "",
            },
        });
    };

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
                >
                    <Controls />
                    <Background
                        key={id}
                        variant={BackgroundVariant.Dots}
                        gap={10}
                        size={0.9}
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

                <AddExistingNodeDialog
                    isOpen={showAddNodeDialog}
                    onClose={() => setShowAddNodeDialog(false)}
                    frameId={id}
                    channelId={frame.channel}
                    onNodeAdded={() => setShowAddNodeDialog(false)}
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
