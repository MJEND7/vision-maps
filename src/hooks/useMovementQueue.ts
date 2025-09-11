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
  queue: QueuedMovement[][]; // batches of movements
  currentBatchId: string | null;
}

export function useMovementQueue(
  frameId: Id<"frames">,
  isAlone: boolean,
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
) {
  const batchRef = useRef<any[]>([]);
  const processedBatches = useRef<Set<string>>(new Set());

  const [isUserMoving, setIsUserMoving] = useState(false);
  const [nodesMap, setNodesMap] = useState<Map<string, Node>>(new Map());

  const BATCH_LIMIT = 100;

  const [queueState, setQueueState] = useState<MovementQueueState>({
    isProcessing: false,
    queue: [],
    currentBatchId: null,
  });

  const batchMovement = useMutation(api.frames.batchMovment);
  const updateFramedNodePosition = useMutation(
    api.frames.updateFramedNodePosition
  );
  const movement = useQuery(api.frames.listMovments, { frameId });

  // === Multi-user: Batch send ===
  const sendBatch = useCallback(
    async (batchToSend: any[]) => {
      if (batchToSend.length === 0) return;

      console.log("Sending batch:", batchToSend);
      setIsUserMoving(true);

      try {
        const movmentId = await batchMovement({
          frameId,
          batch: batchToSend,
        });
        processedBatches.current.add(movmentId);
      } finally {
        setIsUserMoving(false);
      }
    },
    [frameId, batchMovement]
  );

  // === Single-user: Direct updates ===
  const sendPositionUpdate = useCallback(
    async (nodeId: string, position: { x: number; y: number }) => {
      console.log("Sending direct position update:", { nodeId, position });

      try {
        await updateFramedNodePosition({
          frameId,
          nodeId,
          position,
        });
      } catch (error) {
        console.error("Failed to update node position:", error);
      }
    },
    [frameId, updateFramedNodePosition]
  );

  // Debounced updates: solo mode
  const pendingUpdatesRef =
    useRef<Map<string, { position: { x: number; y: number }; timer: NodeJS.Timeout }>>(
      new Map()
    );

  const schedulePositionUpdate = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      const existing = pendingUpdatesRef.current.get(nodeId);
      if (existing) clearTimeout(existing.timer);

      const timer = setTimeout(() => {
        sendPositionUpdate(nodeId, position);
        pendingUpdatesRef.current.delete(nodeId);
      }, 2000);

      pendingUpdatesRef.current.set(nodeId, { position, timer });
    },
    [sendPositionUpdate]
  );

  // Multi-user: Send batch on interval
  useEffect(() => {
    if (isAlone) return;

    const interval = setInterval(async () => {
      if (batchRef.current.length > 0) {
        let curr = batchRef.current;

        if (curr.length > BATCH_LIMIT) {
          curr = curr.slice(0, BATCH_LIMIT);
        }

        batchRef.current = [];
        await sendBatch(curr);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isAlone, sendBatch]);

  // === Movement Queue Processor ===
  useEffect(() => {
    if (isAlone || queueState.isProcessing || queueState.queue.length === 0) return;

    const nextBatch = queueState.queue[0];
    setQueueState((prev) => ({ ...prev, isProcessing: true }));

    const applyBatchSequentially = (
      batch: QueuedMovement[],
      index = 0
    ): Promise<void> => {
      return new Promise((resolve) => {
        if (index >= batch.length) {
          resolve();
          return;
        }

        const b = batch[index];

        // Update nodesMap immutably
        setNodesMap((nm) => {
          const newMap = new Map(nm);
          const existingNode = newMap.get(b.id);
          if (existingNode) {
            newMap.set(b.id, { ...existingNode, position: b.position });
          }
          return newMap;
        });

        // Also update actual ReactFlow nodes (ensures rendering updates)
        setNodes((nodes) => {
          const idx = nodes.findIndex((n) => n.id === b.id);
          if (idx === -1) return nodes;
          const updated = [...nodes];
          updated[idx] = { ...updated[idx], position: b.position };
          return updated;
        });

        setTimeout(() => {
          applyBatchSequentially(batch, index + 1).then(resolve);
        }, 15);
      });
    };

    applyBatchSequentially(nextBatch).then(() => {
      setQueueState((prev) => ({
        ...prev,
        isProcessing: false,
        queue: prev.queue.slice(1),
      }));
    });
  }, [queueState.isProcessing, queueState.queue, setNodes]);

  // === Handle incoming movements (from backend) ===
  useEffect(() => {
    if (isAlone) return;
    if (!movement || movement.length === 0 || isUserMoving) return;

    const m = movement[movement.length - 1];
    const movmentTime = m.batchTimestamp;
    const movmentId = `${m._id.toString()}-${movmentTime}`;

    if (processedBatches.current.has(movmentId)) return;
    //processedBatches.current.delete(movmentId);

    // Push batch into queue
    setQueueState((prev) => ({
      ...prev,
      queue: [...prev.queue, m.batch],
      currentBatchId: movmentId,
    }));
  }, [movement, isUserMoving, isAlone]);

  // === Node Change Handling (user moves nodes) ===
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const validChanges = changes
        .map((change) => {
          if (!("id" in change) || !("position" in change)) return null;
          const node = nodesMap.get(change.id);
          if (!node) return null;
          return {
            ...change,
            data: (node.data as any)?.node?._id || node.data,
          };
        })
        .filter((change) => {
          if (!change) return false;
          if (change.id.startsWith("pending-")) return false;
          if (change.type !== "position") return false;
          return true;
        });

      // Update local nodesMap positions
      changes.forEach((ch) => {
        if (ch.type === "position" && "position" in ch) {
          setNodesMap((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(ch.id);
            if (existing && ch.position) {
              newMap.set(ch.id, { ...existing, position: ch.position });
            }
            return newMap;
          });
        }
      });

      // Sync with backend
      if (validChanges.length > 0) {
        if (isAlone) {
          validChanges.forEach((ch) => {
            if (ch && ch.type === "position" && "position" in ch && ch.position) {
              schedulePositionUpdate(ch.id, ch.position);
            }
          });
        } else {
          batchRef.current = [...batchRef.current, ...validChanges];
        }
      }
    },
    [nodesMap, isAlone, schedulePositionUpdate]
  );

  return {
    nodesMap,
    setNodesMap,
    handleNodesChange,
  };
}
