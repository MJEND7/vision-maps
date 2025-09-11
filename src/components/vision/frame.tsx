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

function useLastValue<T>(value: T | undefined): T | undefined {
    const [last, setLast] = useState<T | undefined>();
    useEffect(() => {
        if (value !== undefined && value !== "skip") setLast(value);
    }, [value]);
    return last;
}

export default function FrameComponent({
    id,
    userId,
}: {
    id: Id<"frames">;
    userId: string;
}) {
    const [isDark, setIsDark] = useState(false);

    // Dynamic edge styling
    const defaultEdgeOptions = {
        animated: true,
        style: {
            stroke: isDark ? "#e5e5e5" : "#b1b1b7",
            strokeWidth: 2,
        },
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
    const [contextMenu, setContextMenu] = useState<{
        show: boolean;
        x: number;
        y: number;
    }>({ show: false, x: 0, y: 0 });
    const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    // === Convex data ===
    const frameQ = useQuery(api.frames.get, { id });
    const frame = useLastValue(frameQ);
    usePresence(api.presence as any, `vision:${id}:${frame?.vision}`, userId);

    const users = useQuery(api.presence.listRoom, {
        roomToken: `vision:${id}:${frame?.vision}`,
    });
    const isAlone = !(users?.find((u) => u.online));

    const createNode = useMutation(api.nodes.create);
    const updateEdges = useMutation(api.edges.update);

    const framedNodesQ = useQuery(api.frames.getFrameNodes, { frameId: id });
    const framedNodes = useLastValue(framedNodesQ);
    const edgesQ = useQuery(api.edges.get, { frameId: id });
    const nodeIds = framedNodes?.map((f) => f.node.data);
    const nodeDataListQ = useQuery(api.nodes.getMany, nodeIds ? { ids: nodeIds } : "skip");

    const edges = useLastValue(edgesQ);
    const nodeDataList = useLastValue(nodeDataListQ);


    // Movement queue
    const { setNodesMap, handleNodesChange } = useMovementQueue(
        id,
        isAlone,
        setNodes
    );

    // === Node data transformation ===
    useEffect(() => {
        if (!framedNodes || !nodeDataList) return;

        setNodes((current) => {
            const newMap = new Map(current.map((n) => [n.id, n])); // existing

            framedNodes.forEach((framedNode) => {
                const nodeId = framedNode.node.data;
                const nodeData = nodeDataList.find((n) => n?._id === nodeId);

                const reactNode: Node = {
                    ...(framedNode.node as any),
                    type: nodeData?.variant || "Text",
                    data: {
                        node:
                            nodeData ||
                            ({
                                _id: nodeId,
                                title: "Error loading node",
                                variant: "Text",
                                value: "",
                            } as any),
                        nodeUser: null,
                        frameId: id,
                        editingNodeId,
                        onEditComplete: () => setEditingNodeId(null),
                        onNodeRightClick: (nodeId: string, event: React.MouseEvent) => {
                            setSelectedNodes((sel) =>
                                sel.includes(nodeId) ? sel : [nodeId]
                            );
                            setContextMenu({
                                show: true,
                                x: event.clientX,
                                y: event.clientY,
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
    }, [nodeDataList, setNodesMap, editingNodeId, id]);

    // === Node updates (local + sync) ===
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
            handleNodesChange(changes);
        },
        [handleNodesChange]
    );

    // === Selection ===
    const onSelectionChange = useCallback(
        ({ nodes: selectedNodes }: { nodes: Node[] }) => {
            setSelectedNodes(selectedNodes.map((node) => node.id));
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

    // === Edge updates ===
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const avoidPending = changes.filter(
                (c) => !("id" in c && c.id.startsWith("pending-"))
            );
            updateEdges({ frameId: id, changes: avoidPending as any });
        },
        [updateEdges, id]
    );

    // === Edge connect ===
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

    // === Context Menu handlers ===
    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent | MouseEvent) => {
            event.preventDefault();
            setContextMenu({
                show: true,
                x: event.clientX,
                y: event.clientY,
            });
        },
        []
    );

    const closeContextMenu = useCallback(() => {
        setContextMenu({ show: false, x: 0, y: 0 });
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

    // === Node creation ===
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

    // === Loading ===
    if (!framedNodes || !edges || !frame || !nodeDataList) {
        return (
            <div className="w-full h-[93%] px-4 pt-4 flex items-center justify-center">
                <p>Loading frame...</p>
            </div>
        );
    }

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
