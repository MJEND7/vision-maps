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
import { useCallback, useState, useEffect, useRef } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import PasteBin from "../channel/paste-bin";
import { CreateNodeArgs } from "../../../convex/nodes";

export default function FrameComponent({ id }: { id: Id<"frames"> }) {
    const [isDark, setIsDark] = useState(false);
    const [batch, setBatch] = useState<any[]>([]);
    const batchRef = useRef<any[]>([]);
    const [lastBatch, setLastBatch] = useState<string | null>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [nodesMap, setNodesMap] = useState<Map<string, Node>>(new Map());
    const [isInitial, setIsInitial] = useState(false);

    // === Convex data ===
    const frame = useQuery(api.frames.get, { id });
    const createNode = useMutation(api.nodes.create);
    const batchMovment = useMutation(api.frames.batchMovment);
    const updateEdges = useMutation(api.edges.update);

    // Get initial nodes for this frame - you may need to adjust this query
    const convex = useConvex();
    const movment = useQuery(api.frames.listMovments, { frameId: id });
    const edges = useQuery(api.edges.get, { frameId: id });

    useEffect(() => {
        if (isInitial) return;

        const fetchInitialNodes = async () => {
            try {
                const initialNodes = await convex.query(api.frames.getFrameNodes, { frameId: id });

                const newMap = new Map();
                setNodes(initialNodes.map((n) => {
                    const node = (n.node as any) as Node;
                    newMap.set(node.id, node);
                    return node;
                }));

                setNodesMap(newMap);
                setIsInitial(true);
            } catch (error) {
                console.error("Failed to fetch initial nodes:", error);
            }
        };

        fetchInitialNodes();
    }, [id, convex, isInitial]);

    // 🔑 Keep batchRef synced with batch state
    useEffect(() => {
        batchRef.current = batch;
    }, [batch]);

    // === Interval to flush batch every 3 seconds ===
    useEffect(() => {
        const interval = setInterval(async () => {
            if (batchRef.current.length > 0) {
                console.log("Sending batch:", batchRef.current);
                let curr = batchRef.current;
                setBatch([]); // clear state
                batchRef.current = []; // clear ref
                let batchId = await batchMovment({
                    frameId: id,
                    batch: curr,
                });
                if (batchId) {
                    setLastBatch(batchId);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [id, batchMovment]);

    // === Handle incoming movement updates ===
    useEffect(() => {
        if (!movment || movment.length === 0) return;
        let m = movment[movment.length - 1];
        if (m._id.toString() === lastBatch) return;

        // Update the nodes map for reference
        m.batch.forEach((b) => {
            setNodesMap((nm) => {
                const existingNode = nm.get(b.id);
                if (existingNode) {
                    const updatedNode = {
                        ...existingNode,
                        position: b.position,
                        type: b.type || existingNode.type,
                        // Keep existing data, don't overwrite with ID string
                        data: existingNode.data
                    };
                    return new Map(nm.set(b.id, updatedNode));
                }
                return nm;
            });
        });

        // Apply movements in sequence with proper ReactFlow updates
        const applyBatchSequentially = (batch: any[], index = 0) => {
            if (index >= batch.length) return;

            const b = batch[index];

            // Apply the movement update
            setNodes((currentNodes) => {
                const existingNodeIndex = currentNodes.findIndex(node => node.id === b.id);

                if (existingNodeIndex === -1) {
                    console.warn(`Node ${b.id} not found in current nodes`);
                    return currentNodes;
                }

                // Create the proper NodeChange object
                const nodeChange: NodeChange = {
                    id: b.id,
                    type: 'position',
                    position: b.position,
                };

                return applyNodeChanges([nodeChange], currentNodes);
            });

            // Continue with next item after delay
            setTimeout(() => {
                applyBatchSequentially(batch, index + 1);
            }, 20); // 75ms between each movement
        };

        applyBatchSequentially(m.batch);
    }, [movment, lastBatch]);

    // === Node updates (batched) ===
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const avoidPending = changes.map((change) => {
                if (!("id" in change) || !("position" in change)) return null;
                const node = nodesMap.get(change.id);
                if (!node) return null;
                return {
                    ...change,
                    data: node.data
                };
            }).filter((change) => {
                if (!change || !("id" in change) || !("position" in change)) return false;
                if (change.id.startsWith("pending-") || change.type !== "position") {
                    console.warn("ignoring pending node change", { change });
                    return false;
                }
                return true;
            });

            // Apply changes to local state immediately for responsiveness
            setNodes((nds) => applyNodeChanges(changes, nds));

            // Update nodes map
            changes.forEach(change => {
                if (change.type === 'position' && 'position' in change) {
                    setNodesMap(prev => {
                        const existing = prev.get(change.id);
                        if (existing && change.position) {
                            return new Map(prev.set(change.id, {
                                ...existing,
                                position: change.position
                            }));
                        }
                        return prev;
                    });
                }
            });

            // Add valid changes to batch for syncing with other users
            if (avoidPending.length > 0) {
                setBatch((prev) => {
                    const updated = [...prev, ...avoidPending];
                    batchRef.current = updated; // keep ref in sync
                    return updated;
                });
            }
        },
        [nodesMap]
    );

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
                type: "default",
                data: "", // handled on backend
            },
        });
    };

    // === Loading state ===
    if (!nodes || !edges || !frame) {
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
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                colorMode={isDark ? "dark" : "light"}
                className="rounded-xl"
            >
                <Controls />
                <Background
                    key={id}
                    variant={BackgroundVariant.Dots}
                    gap={10}
                    size={0.9}
                />
            </ReactFlow>
            <PasteBin
                onCreateNode={handleNodeCreation}
                channelId={frame?.channel as string}
                visionId={frame?.vision as string}
            />
        </div>
    );
}
