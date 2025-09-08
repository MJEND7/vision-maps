"use client";

import {
    Background,
    BackgroundVariant,
    Controls,
    ReactFlow,
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import PasteBin from "../channel/paste-bin";
import { CreateNodeArgs } from "../../../convex/nodes";
import debounce from "lodash.debounce";

export default function FrameComponent({ id }: { id: Id<"frames"> }) {
    const [isDark, setIsDark] = useState(false);

    // === Convex data ===
    const frame = useQuery(api.frames.get, { id: id as Id<"frames"> });
    const createNode = useMutation(
        api.nodes.create,
    ).withOptimisticUpdate((store, args) => {
        const nodes = store.getQuery(api.frames.getNodes, { frameId: id }) ?? [];
        if (!args.core) return
        const newNode = {
            id: "pending-" + crypto.randomUUID(),
            position: args.core.position,
            data: {},
            type: "default",
        };
        store.setQuery(api.frames.getNodes, { frameId: id }, [...nodes, newNode]);
        const sourceNode = args.sourceNode;
        if (sourceNode) {
            const source = nodes.find((node) => node.id === sourceNode.id);
            if (source) {
                const targetHandle =
                    source.position.y > args.core.position.y ? "top" : "bottom";
                const newEdges = addEdge(
                    {
                        id: "pending-" + crypto.randomUUID(),
                        source: source.id,
                        target: newNode.id,
                        sourceHandle: sourceNode.handlepos,
                        targetHandle,
                    },
                    [],
                );
                const edges =
                    store.getQuery(api.edges.get, { frameId: id }) ?? [];
                store.setQuery(api.edges.get, { frameId: id }, [
                    ...edges,
                    ...newEdges,
                ]);
            }
        }
    });

    // === Local state for smoother drag ===
    const rawNodes = useQuery(api.frames.getNodes, { frameId: id });
    const rawEdges = useQuery(api.edges.get, { frameId: id });
    
    // Transform nodes to ensure width/height are undefined instead of null
    const nodes = rawNodes?.map(node => ({
        ...node,
        width: node.width === null ? undefined : node.width,
        height: node.height === null ? undefined : node.height,
    }));
    
    // Transform edges to ensure proper data structure
    const edges = rawEdges?.map(edge => ({
        ...edge,
        data: edge.data || { bar: 0 },
    }));

    const updateNodes = useMutation(
        api.frames.updateNodes,
    ).withOptimisticUpdate((store, args) => {
        const nodes = store.getQuery(api.frames.getNodes, { frameId: id }) ?? [];
        const updated = applyNodeChanges(args.changes, nodes);
        store.setQuery(api.frames.getNodes, { frameId: id }, updated);
    });

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // Separate out data to sync here
            console.log("onNodesChange", { changes });
            const avoidPending = changes.filter((change) => {
                if ("id" in change && change.id.startsWith("pending-")) {
                    console.warn("ignoring pending node change", { change });
                    return false;
                }
                return true;
            });
            updateNodes({
                frameId: id,
                changes: avoidPending as any,
            });
        },
        [updateNodes],
    );


    const updateEdges = useMutation(
        api.edges.update,
    ).withOptimisticUpdate((store, args) => {
        const rawEdges = store.getQuery(api.edges.get, { frameId: id }) ?? [];
        // Transform edges to match ReactFlow EdgeBase type for applyEdgeChanges
        const reactFlowEdges = rawEdges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            data: { bar: 0 }, // Default EdgeBase data structure
            type: edge.type,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
        }));
        const updated = applyEdgeChanges(args.changes, reactFlowEdges as any);
        // Transform back to store format with proper data structure
        const transformedUpdated = updated.map(edge => ({
            ...edge,
            data: { bar: 0 }, // Always use the expected data structure
        }));
        store.setQuery(api.edges.get, { frameId: id }, transformedUpdated as any);
    });

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            // Separate out data to sync here
            const avoidPending = changes.filter((change) => {
                if ("id" in change && change.id.startsWith("pending-")) {
                    console.warn("ignoring pending edge change", { change });
                    return false;
                }
                return true;
            });
            console.log("onEdgesChange", { changes });
            // Transform EdgeChange[] to match custom validator expectations
            const transformedChanges = avoidPending.map(change => {
                if (change.type === 'add' && 'item' in change) {
                    return {
                        type: change.type,
                        item: {
                            ...change.item,
                            data: { bar: 0 }, // Ensure proper data structure
                        },
                    };
                }
                return change;
            });
            updateEdges({ frameId: id, changes: transformedChanges as any });
        },
        [updateEdges],
    );


    const connect = useMutation(api.edges.connect).withOptimisticUpdate(
        (store, args) => {
            const edges =
                store.getQuery(api.edges.get, { frameId: id }) ?? [];
            // Convert null values to proper types for ReactFlow compatibility
            const connection = {
                source: args.connection.source || "",
                target: args.connection.target || "",
                sourceHandle: args.connection.sourceHandle || null,
                targetHandle: args.connection.targetHandle || null,
            };
            const updated = addEdge(connection, edges);
            store.setQuery(api.edges.get, { frameId: id }, updated);
        },
    );
    const onConnect = useCallback(
        (connection: Connection) => {
            console.log("onConnect", { connection });
            if (
                connection.source?.startsWith("pending-") ||
                connection.target?.startsWith("pending-")
            ) {
                console.warn("ignoring pending connection", { connection });
                return;
            }
            connect({ frameId: id, connection });
        },
        [connect],
    );

    // === Node creation ===
    const handleNodeCreation = async (
        data: Omit<CreateNodeArgs, "channel">
    ) => {
        if (!frame) {
            throw new Error("Failed to get a frame");
        }

        // Local optimistic core data for React Flow
        const coreData = {
            id: crypto.randomUUID(),
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400,
            },
            data: {},
        };

        // Persist to Convex
        await createNode({
            ...data,
            channel: frame?.channel,
            frameId: frame?._id,
            core: coreData,
        });
    };

    // === Loading state ===
    if (
        nodes === undefined ||
        edges === undefined ||
        frame === undefined
    ) {
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
