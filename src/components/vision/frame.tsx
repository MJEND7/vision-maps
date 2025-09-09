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

export default function FrameComponent({ id }: { id: Id<"frames"> }) {
    const [isDark, setIsDark] = useState(false);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [isInitial, setIsInitial] = useState(false);

    // === Convex data ===
    const frame = useQuery(api.frames.get, { id });
    const createNode = useMutation(api.nodes.create).withOptimisticUpdate(
        (store, args) => {
            if (!args.frameId) return;
            
            // Get current framed nodes and frame data
            const currentFramedNodes = store.getQuery(api.frames.getFrameNodes, { frameId: args.frameId }) || [];
            const frameData = store.getQuery(api.frames.get, { id: args.frameId });
            
            // Create optimistic node
            const optimisticNodeId = `optimistic-${crypto.randomUUID()}`;
            const optimisticNode = {
                _id: optimisticNodeId,
                _creationTime: Date.now(),
                node: {
                    ...args.position,
                    id: args.position?.id || crypto.randomUUID(),
                    type: args.variant || "Text",
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
    } = useMovementQueue(id);

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
    }, [framedNodes, setNodesMap, convex]);

    // === Process movement queue ===
    useEffect(() => {
        if (isInitial) {
            processMovementQueue(nodes, setNodes);
        }
    }, [processMovementQueue, isInitial]);

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
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
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
