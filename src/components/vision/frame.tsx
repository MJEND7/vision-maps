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
    applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useState, useEffect } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import PasteBin from "../channel/paste-bin";
import { CreateNodeArgs } from "../../../convex/nodes";
import { useMovementQueue } from "../../hooks/useMovementQueue";
import nodeTypes from "./nodes";
import { CanvasContextMenu } from "./canvas-context-menu";
import { AddExistingNodeDialog } from "./add-existing-node-dialog";

export default function FrameComponent({ id }: { id: Id<"frames"> }) {
    const [isDark, setIsDark] = useState(false);
    const defaultEdgeOptions = {
        animated: true,
    };

    // Detect dark mode from Tailwind
    useEffect(() => {
        const checkDarkMode = () => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            setIsDark(isDarkMode);
        };

        // Check initially
        checkDarkMode();

        // Set up observer to watch for class changes
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [isInitial, setIsInitial] = useState(false);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [contextMenu, setContextMenu] = useState<{
        show: boolean;
        x: number;
        y: number;
    }>({ show: false, x: 0, y: 0 });
    const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    // === Convex data ===
    const frame = useQuery(api.frames.get, { id });
    const users = useQuery(
        api.presence.listRoom,
        { roomToken: `vision:${frame?.vision}` }
    );
    const createNode = useMutation(api.nodes.create).withOptimisticUpdate(
        (store, args) => {
            if (!args.frameId) return;

            // Get current framed nodes and frame data
            const currentFramedNodes = store.getQuery(api.frames.getFrameNodes, { frameId: args.frameId }) || [];
            const frameData = store.getQuery(api.frames.get, { id: args.frameId });

            // Create optimistic node
            const optimisticNodeId = `optimistic-${crypto.randomUUID()}`;
            const optimisticNode = {
                _id: optimisticNodeId as Id<"framed_node">,
                _creationTime: Date.now(),
                frameId: args.frameId,
                node: {
                    ...args.position,
                    id: args.position?.id || crypto.randomUUID(),
                    type: args.variant || "Text",
                    position: args.position?.position || { x: 0, y: 0 },
                    data: {
                        node: {
                            _id: optimisticNodeId,
                            _creationTime: Date.now(),
                            title: args.title,
                            variant: args.variant,
                            value: args.value,
                            thought: args.thought,
                            frame: args.frameId,
                            channel: args.channel,
                            vision: frameData?.vision,
                            userId: "optimistic",
                            updatedAt: new Date().toISOString(),
                        },
                        nodeUser: null,
                        frameId: args.frameId,
                        editingNodeId: null, // optimistic nodes can't be edited immediately
                        onNodeRightClick: (nodeId: string, event: React.MouseEvent) => {
                            console.log('Node right-clicked:', nodeId);

                            // If the right-clicked node is not already selected, 
                            // clear selection and select only this node
                            setSelectedNodes(currentSelection => {
                                if (!currentSelection.includes(nodeId)) {
                                    console.log('Node not in selection, selecting only:', nodeId);
                                    return [nodeId];
                                } else {
                                    console.log('Node already selected, keeping current selection:', currentSelection);
                                    return currentSelection;
                                }
                            });

                            setContextMenu({
                                show: true,
                                x: event.clientX,
                                y: event.clientY,
                            });
                        },
                    }
                }
            };

            // Add to framed nodes
            store.setQuery(api.frames.getFrameNodes, { frameId: args.frameId }, [
                ...currentFramedNodes,
                optimisticNode
            ]);
        }
    );
    const updateEdges = useMutation(api.edges.update);

    // Get nodes and edges for this frame reactively
    const framedNodes = useQuery(api.frames.getFrameNodes, { frameId: id });
    const edges = useQuery(api.edges.get, { frameId: id });
    const convex = useConvex();

    // === Movement Queue Hook ===
    const {
        setNodesMap,
        handleNodesChange,
        processMovementQueue,
    } = useMovementQueue(id, users || undefined);

    // Convert framed nodes to React Flow nodes whenever they change
    useEffect(() => {
        if (!framedNodes) return;

        const convertToReactFlowNodes = async () => {
            const newMap = new Map();
            const nodesWithData = await Promise.all(framedNodes.map(async (framedNode) => {
                const node = (framedNode.node as any) as Node;

                // If the node already has the data structure (from optimistic update)
                if (node.data?.node) {
                    newMap.set(node.id, node);
                    return node;
                }

                // For existing nodes, fetch the actual node data
                try {
                    const nodeData = await convex.query(api.nodes.get, { id: node.data as any });

                    if (nodeData) {
                        const reactFlowNode: Node = {
                            ...node,
                            type: nodeData.variant || "Text",
                            data: {
                                node: nodeData,
                                nodeUser: null,
                                frameId: id,
                                editingNodeId: editingNodeId,
                                onEditComplete: () => setEditingNodeId(null),
                                onNodeRightClick: (nodeId: string, event: React.MouseEvent) => {
                                    console.log('Node right-clicked:', nodeId);

                                    // If the right-clicked node is not already selected, 
                                    // clear selection and select only this node
                                    setSelectedNodes(currentSelection => {
                                        if (!currentSelection.includes(nodeId)) {
                                            console.log('Node not in selection, selecting only:', nodeId);
                                            return [nodeId];
                                        } else {
                                            console.log('Node already selected, keeping current selection:', currentSelection);
                                            return currentSelection;
                                        }
                                    });

                                    // Show context menu at mouse position
                                    setContextMenu({
                                        show: true,
                                        x: event.clientX,
                                        y: event.clientY,
                                    });
                                },
                            }
                        };
                        newMap.set(node.id, reactFlowNode);
                        return reactFlowNode;
                    }
                } catch (error) {
                    console.error("Failed to fetch node data:", error);
                }

                // Fallback for nodes that failed to load
                const fallbackNode: Node = {
                    ...node,
                    type: node.type || "Text",
                    data: {
                        node: {
                            _id: node.data,
                            title: "Error loading node",
                            variant: node.type || "Text",
                            value: "",
                        },
                        nodeUser: null,
                        frameId: id,
                        editingNodeId: editingNodeId,
                        onEditComplete: () => setEditingNodeId(null),
                        onNodeRightClick: (nodeId: string, event: React.MouseEvent) => {
                            console.log('Node right-clicked:', nodeId);

                            // If the right-clicked node is not already selected, 
                            // clear selection and select only this node
                            setSelectedNodes(currentSelection => {
                                if (!currentSelection.includes(nodeId)) {
                                    console.log('Node not in selection, selecting only:', nodeId);
                                    return [nodeId];
                                } else {
                                    console.log('Node already selected, keeping current selection:', currentSelection);
                                    return currentSelection;
                                }
                            });

                            setContextMenu({
                                show: true,
                                x: event.clientX,
                                y: event.clientY,
                            });
                        },
                    }
                };
                newMap.set(node.id, fallbackNode);
                return fallbackNode;
            }));

            setNodes(nodesWithData);
            setNodesMap(newMap);
            setIsInitial(true);
        };

        convertToReactFlowNodes();
    }, [framedNodes, setNodesMap, convex, editingNodeId]);

    // === Process movement queue ===
    const isAlone = !users || users.length === 0;
    useEffect(() => {
        if (isInitial && !isAlone) {
            // Only process movement queue in multi-user mode
            processMovementQueue(nodes, setNodes);
        }
    }, [processMovementQueue, isInitial, isAlone]);

    // === Node updates (batched) ===
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // Apply changes to local state immediately for responsiveness
            setNodes((nds) => applyNodeChanges(changes, nds));

            // Use hook to handle batching and syncing
            handleNodesChange(changes);
        },
        [handleNodesChange]
    );

    // === Selection handling ===
    const onSelectionChange = useCallback(
        ({ nodes: selectedNodes }: { nodes: Node[] }) => {
            setSelectedNodes(selectedNodes.map(node => node.id));
        },
        []
    );

    // === Sync programmatic selection with ReactFlow ===
    useEffect(() => {
        // Update node selection state in ReactFlow when selectedNodes changes
        setNodes(currentNodes =>
            currentNodes.map(node => ({
                ...node,
                selected: selectedNodes.includes(node.id)
            }))
        );
    }, [selectedNodes]);

    // === Edge updates ===
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const avoidPending = changes.filter(
                (change) => !("id" in change && change.id.startsWith("pending-"))
            );

            const transformedChanges = avoidPending.map((change) => {
                if (change.type === "add" && "item" in change) {
                    return {
                        type: change.type,
                        item: {
                            ...change.item,
                            data: { bar: 0 }, // ensure valid data structure
                        },
                    };
                }
                return change;
            });

            updateEdges({ frameId: id, changes: transformedChanges as any });
        },
        [updateEdges, id]
    );

    // === Connecting edges ===
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

    // === Canvas Right Click Handler ===
    const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
        console.log('Right click detected!', event);
        event.preventDefault();
        setContextMenu({
            show: true,
            x: event.clientX,
            y: event.clientY,
        });
    }, []);

    // === Close context menu ===
    const closeContextMenu = useCallback(() => {
        setContextMenu({ show: false, x: 0, y: 0 });
    }, []);

    // === Click outside to close ===
    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            // Don't close if clicking inside the context menu
            const target = event.target as Element;
            if (target?.closest('[data-context-menu]')) {
                return;
            }
            closeContextMenu();
        };
        if (contextMenu.show) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [contextMenu.show, closeContextMenu]);

    // === Selection rectangle right-click handler ===
    useEffect(() => {
        const handleSelectionRectContextMenu = (event: MouseEvent) => {
            const target = event.target as Element;

            // Check if the right-click is on the selection rectangle
            if (target?.classList.contains('react-flow__nodesselection-rect') && selectedNodes.length > 0) {
                event.preventDefault();
                event.stopPropagation();

                setContextMenu({
                    show: true,
                    x: event.clientX,
                    y: event.clientY,
                });
            }
        };

        // Add context menu listener to document
        document.addEventListener('contextmenu', handleSelectionRectContextMenu, true);

        return () => {
            document.removeEventListener('contextmenu', handleSelectionRectContextMenu, true);
        };
    }, [selectedNodes.length]);

    // === Node creation ===
    const handleNodeCreation = async (data: Omit<CreateNodeArgs, "channel">) => {
        if (!frame) throw new Error("Failed to get a frame");

        await createNode({
            ...data,
            channel: frame.channel,
            frameId: frame._id,
            position: {
                id: crypto.randomUUID(),
                position: {
                    x: Math.random() * 400,
                    y: Math.random() * 400,
                },
                type: data.variant || "Text",
                data: "", // handled on backend
            },
        });
    };

    // === Loading state ===
    if (!framedNodes || !edges || !frame) {
        return (
            <div className="w-full h-[93%] px-4 pt-4 flex items-center justify-center">
                <p>Loading frame...</p>
            </div>
        );
    }

    // === Render ===
    return (
        <div className="w-full h-[93%] px-4 pt-4">
            <h2 className="text-xl font-semibold mb-4">
                {frame?.title || "Loading..."}
            </h2>
            <div className="relative h-[calc(100%-4rem)]">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onSelectionChange={onSelectionChange}
                    onPaneContextMenu={onPaneContextMenu}
                    onMove={closeContextMenu}
                    onMoveStart={closeContextMenu}
                    nodeTypes={nodeTypes}
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

                {/* Context Menu */}
                <CanvasContextMenu
                    frameId={id}
                    selectedNodes={selectedNodes}
                    selectedNodeData={selectedNodes.map(nodeId => {
                        const node = nodes.find(n => n.id === nodeId);
                        return node ? { id: nodeId, type: node.type || 'Text', data: node.data } : null;
                    }).filter(Boolean) as { id: string; type: string; data: any }[]}
                    onDeleteSelected={() => {
                        setSelectedNodes([]);
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

                {/* Add Existing Node Dialog */}
                <AddExistingNodeDialog
                    isOpen={showAddNodeDialog}
                    onClose={() => setShowAddNodeDialog(false)}
                    frameId={id}
                    channelId={frame.channel}
                    onNodeAdded={() => {
                        setShowAddNodeDialog(false);
                    }}
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
