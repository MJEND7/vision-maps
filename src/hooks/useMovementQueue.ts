import { useCallback, useState, useEffect, useRef } from "react";
import { Node, NodeChange, applyNodeChanges } from "@xyflow/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface QueuedMovement {
    id: string;
    position: { x: number; y: number };
    type?: string;
    data?: any;
}

interface MovementQueueState {
    isProcessing: boolean;
    queue: QueuedMovement[][];
    currentBatchId: string | null;
}


export function useMovementQueue(frameId: Id<"frames">) {
    const [batch, setBatch] = useState<any[]>([]);
    const batchRef = useRef<any[]>([]);
    const [processedBatches, setProcessedBatches] = useState<Set<string>>(new Set());
    const [isUserMoving, setIsUserMoving] = useState(false);
    const [userMovedNodes, setUserMovedNodes] = useState<Set<string>>(new Set());
    const userMovedNodesRef = useRef<Set<string>>(new Set());
    
    // Queue state for incoming movements
    const [queueState, setQueueState] = useState<MovementQueueState>({
        isProcessing: false,
        queue: [],
        currentBatchId: null
    });
    const [nodesMap, setNodesMap] = useState<Map<string, Node>>(new Map());


    const batchMovement = useMutation(api.frames.batchMovment);
    const movement = useQuery(api.frames.listMovments, { frameId });

    // Keep refs synced with state
    useEffect(() => {
        batchRef.current = batch;
    }, [batch]);
    
    useEffect(() => {
        userMovedNodesRef.current = userMovedNodes;
    }, [userMovedNodes]);

    // Interval to flush batch every 1 second
    useEffect(() => {
        const interval = setInterval(async () => {
            if (batchRef.current.length > 0) {
                console.log("Sending batch:", batchRef.current);
                let curr = batchRef.current;
                setBatch([]);
                batchRef.current = [];
                setIsUserMoving(true);
                
                // Track nodes we're about to send
                const nodeIds = new Set(curr.map(node => node.id));
                setUserMovedNodes(prev => new Set([...prev, ...nodeIds]));
                
                try {
                    let movmentId = await batchMovement({
                        frameId,
                        batch: curr,
                    });
                    setProcessedBatches(prev => new Set([...prev, movmentId]));
                    
                    // Clear user moved nodes after a delay to prevent echo
                    setTimeout(() => {
                        setUserMovedNodes(prev => {
                            const updated = new Set(prev);
                            nodeIds.forEach(id => updated.delete(id));
                            return updated;
                        });
                    }, 2000);
                } finally {
                    setIsUserMoving(false);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [frameId, batchMovement]);

    // Process incoming movement queue with smooth animations
    const processMovementQueue = useCallback((nodes: Node[], setNodes: (updater: (nodes: Node[]) => Node[]) => void) => {
        if (queueState.isProcessing || queueState.queue.length === 0) return;

        setQueueState(prev => ({ ...prev, isProcessing: true }));

        const nextBatch = queueState.queue[0];
        const remainingQueue = queueState.queue.slice(1);
        const batchId = `batch-${Date.now()}`;

        // Apply movements in sequence with proper ReactFlow updates
        const applyBatchSequentially = (batch: QueuedMovement[], index = 0): Promise<void> => {
            return new Promise((resolve) => {
                if (index >= batch.length) {
                    // Batch complete, update queue and resolve
                    setQueueState(prev => ({
                        ...prev,
                        isProcessing: false,
                        queue: remainingQueue,
                        currentBatchId: null
                    }));
                    resolve();
                    return;
                }

                const b = batch[index];
                
                // Skip if this node was moved by the local user recently
                if (userMovedNodesRef.current.has(b.id)) {
                    console.log(`Skipping echo for user-moved node: ${b.id}`);
                    // Continue to next item immediately
                    setTimeout(() => applyBatchSequentially(batch, index + 1), 10);
                    return;
                }

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

                // Continue with next item after reduced delay for smoother animation
                setTimeout(() => {
                    applyBatchSequentially(batch, index + 1);
                }, 15);
            });
        };

        // Start processing the batch
        setQueueState(prev => ({ ...prev, currentBatchId: batchId }));
        applyBatchSequentially(nextBatch).then(() => {
            // Process next batch if queue has more items
            if (remainingQueue.length > 0) {
                // Reduced delay between batches for better performance
                setTimeout(() => {
                    processMovementQueue(nodes, setNodes);
                }, 25);
            }
        });
    }, [queueState.isProcessing, queueState.queue]);

    // Handle incoming movement updates
    useEffect(() => {
        if (!movement || movement.length === 0 || isUserMoving) return;
        
        let m = movement[movement.length - 1];
        let movmentTime = m.batchTimestamp;
        let movmentId = `${m._id.toString()}-${movmentTime}`;
        
        if (processedBatches.has(movmentId)) return;
        
        // Mark as processed immediately to prevent duplicates
        setProcessedBatches(prev => new Set([...prev, movmentId]));

        // Update the nodes map for reference
        m.batch.forEach((b: any) => {
            setNodesMap((nm) => {
                const existingNode = nm.get(b.id);
                if (existingNode) {
                    const updatedNode = {
                        ...existingNode,
                        position: b.position,
                        type: "default",
                        data: existingNode.data
                    };
                    return new Map(nm.set(b.id, updatedNode));
                }
                return nm;
            });
        });

        // Add to queue for smooth processing
        setQueueState(prev => ({
            ...prev,
            queue: [...prev.queue, m.batch]
        }));
    }, [movement, processedBatches, isUserMoving]);

    // Handle node changes (for user interactions)
    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const avoidPending = changes.map((change) => {
                if (!("id" in change) || !("position" in change)) return null;
                const node = nodesMap.get(change.id);
                if (!node) return null;
                return {
                    ...change,
                    data: node.data?.node?._id || node.data
                };
            }).filter((change) => {
                if (!change || !("id" in change) || !("position" in change)) return false;
                if (change.id.startsWith("pending-") || change.type !== "position") {
                    console.warn("ignoring pending node change", { change });
                    return false;
                }
                return true;
            });

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
                // Mark nodes as user-moved immediately
                const nodeIds = avoidPending.map(change => change.id).filter(id => typeof id === 'string');
                setUserMovedNodes(prev => new Set([...prev, ...nodeIds]));
                
                setBatch((prev) => {
                    const updated = [...prev, ...avoidPending];
                    batchRef.current = updated;
                    return updated;
                });
            }
        },
        [nodesMap]
    );

    return {
        nodesMap,
        setNodesMap,
        handleNodesChange,
        processMovementQueue,
        isProcessingQueue: queueState.isProcessing,
        queueLength: queueState.queue.length
    };
}
