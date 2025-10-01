import { mutation, query } from "../_generated/server";
import { v, Infer } from "convex/values";
import { requireVisionAccess } from "../utils/auth";
import { nodeValidator } from "../reactflow/types";
import { Nodes } from "../nodes/table";

// Args schemas
const createArgs = v.object({
    channelId: v.id("channels"),
    title: v.string(),
});

const updateArgs = v.object({
    id: v.id("frames"),
    title: v.optional(v.string()),
});

const removeArgs = v.object({
    id: v.id("frames"),
});

const getArgs = v.object({
    id: v.id("frames"),
});

const listByChannelArgs = v.object({
    channelId: v.id("channels"),
});

const reorderArgs = v.object({
    channelId: v.id("channels"),
    frameIds: v.array(v.id("frames")),
});

const listByVisionArgs = v.object({
    visionId: v.id("visions"),
});

export const create = mutation({
    args: createArgs,
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel) {
            throw new Error("Channel not found");
        }

        if (channel.vision) {
            await requireVisionAccess(ctx, channel.vision);
        }

        const now = new Date().toISOString();

        // Get the next sort order for this channel
        const existingFrames = await ctx.db
            .query("frames")
            .withIndex("by_channel", (q) => q.eq("channel", args.channelId))
            .collect();

        const maxSortOrder = Math.max(0, ...existingFrames.map(f => f.sortOrder || 0));
        const newSortOrder = maxSortOrder + 1;

        const frameId = await ctx.db.insert("frames", {
            title: args.title,
            sortOrder: newSortOrder,
            channel: args.channelId,
            vision: channel.vision,
            createdAt: now,
            updatedAt: now,
        });

        return frameId;
    },
});

export const update = mutation({
    args: updateArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const updates: any = {
            updatedAt: new Date().toISOString(),
        };

        if (args.title !== undefined) updates.title = args.title;

        await ctx.db.patch(args.id, updates);
    },
});

export const remove = mutation({
    args: removeArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        // 1. Delete all framed_node entries
        const framedNodes = await ctx.db
            .query("framed_node")
            .withIndex("by_frame", (q) => q.eq("frameId", args.id))
            .collect();
        for (const fn of framedNodes) {
            await ctx.db.delete(fn._id);
        }

        // 2. Delete all frame_positions entries
        const framePositions = await ctx.db
            .query("frame_positions")
            .withIndex("by_frame", (q) => q.eq("frameId", args.id))
            .collect();
        for (const fp of framePositions) {
            await ctx.db.delete(fp._id);
        }

        // 3. Delete all edges
        const edges = await ctx.db
            .query("edges")
            .withIndex("frame", (q) => q.eq("frameId", args.id))
            .collect();
        for (const edge of edges) {
            await ctx.db.delete(edge._id);
        }

        // 4. Delete all nodes
        const nodes = await ctx.db
            .query("nodes")
            .withIndex("by_frame", (q) => q.eq("frame", args.id))
            .collect();
        for (const node of nodes) {
            await ctx.db.delete(node._id);
        }

        // 5. Finally delete the frame itself
        await ctx.db.delete(args.id);
    },
});

export const get = query({
    args: getArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        return frame;
    },
});

export const listByChannel = query({
    args: listByChannelArgs,
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel) {
            throw new Error("Channel not found");
        }

        if (channel.vision) {
            await requireVisionAccess(ctx, channel.vision);
        }

        const frames = await ctx.db
            .query("frames")
            .withIndex("by_channel", (q) => q.eq("channel", args.channelId))
            .collect();

        // Sort by sortOrder, fallback to creation time for legacy data
        frames.sort((a, b) => {
            const orderA = a.sortOrder ?? 0;
            const orderB = b.sortOrder ?? 0;
            return orderA - orderB;
        });

        return frames;
    },
});

export const reorder = mutation({
    args: reorderArgs,
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel) {
            throw new Error("Channel not found");
        }

        if (channel.vision) {
            await requireVisionAccess(ctx, channel.vision);
        }

        // Update sort order for each frame based on its position in the array
        for (let i = 0; i < args.frameIds.length; i++) {
            const frameId = args.frameIds[i];
            const frame = await ctx.db.get(frameId);

            if (!frame) {
                throw new Error(`Frame ${frameId} not found`);
            }

            if (frame.channel !== args.channelId) {
                throw new Error(`Frame ${frameId} does not belong to channel ${args.channelId}`);
            }

            await ctx.db.patch(frameId, {
                sortOrder: i + 1,
                updatedAt: new Date().toISOString(),
            });
        }
    },
});

export const listByVision = query({
    args: listByVisionArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.visionId);

        const frames = await ctx.db
            .query("frames")
            .withIndex("by_vision", (q) => q.eq("vision", args.visionId))
            .collect();

        // Sort by sortOrder, fallback to creation time for legacy data
        frames.sort((a, b) => {
            const orderA = a.sortOrder ?? 0;
            const orderB = b.sortOrder ?? 0;
            return orderA - orderB;
        });

        return frames;
    },
});

export const batchMovment = mutation({
    args: {
        frameId: v.id("frames"),
        batch: v.array(nodeValidator(v.id("nodes")))    ,
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Invalid frame");
        }

        // requireVisionAccess throws on failure, no need for conditional
        await requireVisionAccess(ctx, frame.vision);

        // Create a shared timestamp for this batch
        const batchTimestamp = Date.now();
        let batchId: string | null = null;
        // Process each node in the batch
        for (const batchNode of args.batch) {
            // Update framed_node with the newest state
            const existingFramedNode = await ctx.db
                .query("framed_node")
                .withIndex("id", (q) => q.eq("node.id", batchNode.id))
                .first();

            if (existingFramedNode) {
                await ctx.db.patch(existingFramedNode._id, {
                    node: batchNode
                });
            }

            // Create or update frame_positions for this specific node
            const existingFramePosition = await ctx.db
                .query("frame_positions")
                .withIndex("by_node_frame", (q) => q.eq("nodeId", batchNode.data).eq("frameId", args.frameId))
                .first();

            if (existingFramePosition) {
                // Patch existing frame_positions with new batch
                batchId = existingFramePosition._id.toString();
                await ctx.db.patch(existingFramePosition._id, {
                    batch: args.batch,
                    batchTimestamp,
                });
            } else {
                // Create new frame_positions entry for this node
                batchId = await ctx.db.insert("frame_positions", {
                    frameId: args.frameId,
                    nodeId: batchNode.data,
                    batch: args.batch,
                    batchTimestamp,
                });
            }
        }

        return `${batchId}-${batchTimestamp}`
    },
});

export const listMovments = query({
    args: {
        frameId: v.id("frames")
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Invalid frame");
        }

        // requireVisionAccess throws on failure, no need for conditional
        await requireVisionAccess(ctx, frame.vision);
        
        const framePositions = await ctx.db.query("frame_positions").withIndex("by_frame", (q) => q.eq("frameId", args.frameId)).collect()

        // Return batches sorted by timestamp
        return framePositions.sort((a, b) => 
            new Date(a.batchTimestamp).getTime() - new Date(b.batchTimestamp).getTime()
        )
    }
}) 

const getFrameNodesArgs = v.object({
    frameId: v.id("frames"),
});

export const getFrameNodes = query({
    args: getFrameNodesArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const framedNodes = await ctx.db
            .query("framed_node")
            .withIndex("by_frame", (q) => q.eq("frameId", args.frameId))
            .collect();

        // Enhance the nodes with proper type based on actual node data
        const enhancedNodes = (await Promise.all(framedNodes.map(async (framedNode) => {
            // Get the actual node data to access the variant
            const nodeData = await ctx.db.get(framedNode.node.data as any);
            if (nodeData && 'variant' in nodeData) {
                // Update the node type to match the variant
                const enhancedNode = {
                    ...framedNode,
                    node: {
                        ...framedNode.node,
                        _id: nodeData._id,
                        variant: nodeData.variant,
                        value: nodeData.value,
                        thought: nodeData.thought,
                        type: nodeData.variant || "Text"
                    }
                };
                return enhancedNode;
            }
            return null;
        }))).filter((n) => n !== null)

        return enhancedNodes;
    },
});

const updateFramedNodeArgs = v.object({
    frameId: v.id("frames"),
    nodeId: v.string(),
    node: nodeValidator(v.id("nodes")),
});

export const updateFramedNode = mutation({
    args: updateFramedNodeArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const existingFramedNode = await ctx.db
            .query("framed_node")
            .withIndex("id", (q) => q.eq("node.id", args.nodeId))
            .first();

        if (!existingFramedNode) {
            throw new Error("Framed node not found");
        }

        await ctx.db.patch(existingFramedNode._id, {
            node: args.node,
        });

        return existingFramedNode._id;
    },
});

const updateFramedNodePositionArgs = v.object({
    frameId: v.id("frames"),
    nodeId: v.string(),
    position: v.object({
        x: v.number(),
        y: v.number(),
    }),
});

export const updateFramedNodePosition = mutation({
    args: updateFramedNodePositionArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const existingFramedNode = await ctx.db
            .query("framed_node")
            .withIndex("id", (q) => q.eq("node.id", args.nodeId))
            .first();

        if (!existingFramedNode) {
            // Node was likely deleted, silently ignore the position update
            console.log(`Position update ignored for deleted node: ${args.nodeId}`);
            return null;
        }

        // Update only the position in the node
        const updatedNode = {
            ...existingFramedNode.node,
            position: args.position,
        };

        await ctx.db.patch(existingFramedNode._id, {
            node: updatedNode,
        });

        return existingFramedNode._id;
    },
});

const removeNodeFromFrameArgs = v.object({
    frameId: v.id("frames"),
    nodeId: v.string(), // The node.id (React Flow node ID)
});

const removeMultipleNodesFromFrameArgs = v.object({
    frameId: v.id("frames"),
    nodeIds: v.array(v.string()), // Array of React Flow node IDs
});

export const removeNodeFromFrame = mutation({
    args: removeNodeFromFrameArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        // 1. Find and remove the framed_node entry
        const framedNode = await ctx.db
            .query("framed_node")
            .withIndex("id", (q) => q.eq("node.id", args.nodeId))
            .first();

        if (framedNode) {
            await ctx.db.delete(framedNode._id);
        }

        // 2. Clean up frame_positions entries for this node in this frame
        const framePositions = await ctx.db
            .query("frame_positions")
            .withIndex("by_node_frame", (q) => 
                q.eq("nodeId", framedNode?.node.data as any).eq("frameId", args.frameId)
            )
            .collect();

        for (const position of framePositions) {
            await ctx.db.delete(position._id);
        }

        // 3. Remove connected edges
        const edges = await ctx.db
            .query("edges")
            .withIndex("frame", (q) => q.eq("frameId", args.frameId))
            .collect();

        const edgesToDelete = edges.filter(edge => 
            edge.source === args.nodeId || edge.target === args.nodeId
        );

        for (const edge of edgesToDelete) {
            await ctx.db.delete(edge._id);
        }

        // 4. Remove frameId from the actual node (don't delete the node itself)
        if (framedNode && framedNode.node.data) {
            const actualNode = await ctx.db.get(framedNode.node.data as any);
            if (actualNode && 'frame' in actualNode && actualNode.frame === args.frameId) {
                await ctx.db.patch(framedNode.node.data as any, {
                    frame: undefined,
                });
            }
        }

        return args.nodeId;
    },
});

export const removeMultipleNodesFromFrame = mutation({
    args: removeMultipleNodesFromFrameArgs,
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }

        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const deletedNodeIds: string[] = [];

        // Process each node for deletion
        for (const nodeId of args.nodeIds) {
            try {
                // 1. Find and remove the framed_node entry
                const framedNode = await ctx.db
                    .query("framed_node")
                    .withIndex("id", (q) => q.eq("node.id", nodeId))
                    .first();

                if (framedNode) {
                    await ctx.db.delete(framedNode._id);

                    // 2. Clean up frame_positions entries for this node in this frame
                    const framePositions = await ctx.db
                        .query("frame_positions")
                        .withIndex("by_node_frame", (q) => 
                            q.eq("nodeId", framedNode.node.data as any).eq("frameId", args.frameId)
                        )
                        .collect();

                    for (const position of framePositions) {
                        await ctx.db.delete(position._id);
                    }

                    // 3. Remove frameId from the actual node (don't delete the node itself)
                    if (framedNode.node.data) {
                        const actualNode = await ctx.db.get(framedNode.node.data as any);
                        if (actualNode && 'frame' in actualNode && actualNode.frame === args.frameId) {
                            await ctx.db.patch(framedNode.node.data as any, {
                                frame: undefined,
                            });
                        }
                    }

                    deletedNodeIds.push(nodeId);
                }
            } catch (error) {
                console.error(`Failed to delete node ${nodeId}:`, error);
                // Continue with other nodes even if one fails
            }
        }

        // 4. Remove connected edges for all deleted nodes in one go
        const edges = await ctx.db
            .query("edges")
            .withIndex("frame", (q) => q.eq("frameId", args.frameId))
            .collect();

        const edgesToDelete = edges.filter(edge => 
            deletedNodeIds.includes(edge.source) || deletedNodeIds.includes(edge.target)
        );

        for (const edge of edgesToDelete) {
            await ctx.db.delete(edge._id);
        }

        return {
            deletedCount: deletedNodeIds.length,
            deletedNodeIds,
            deletedEdgeCount: edgesToDelete.length
        };
    },
});

// Type exports
export type CreateFrameArgs = Infer<typeof createArgs>;
export type UpdateFrameArgs = Infer<typeof updateArgs>;
export type RemoveFrameArgs = Infer<typeof removeArgs>;
export type GetFrameArgs = Infer<typeof getArgs>;
export type ListFramesByChannelArgs = Infer<typeof listByChannelArgs>;
export type ReorderFramesArgs = Infer<typeof reorderArgs>;
export type ListFramesByVisionArgs = Infer<typeof listByVisionArgs>;
export type GetFrameNodesArgs = Infer<typeof getFrameNodesArgs>;
export type UpdateFramedNodeArgs = Infer<typeof updateFramedNodeArgs>;
export type UpdateFramedNodePositionArgs = Infer<typeof updateFramedNodePositionArgs>;
export type RemoveNodeFromFrameArgs = Infer<typeof removeNodeFromFrameArgs>;
export type RemoveMultipleNodesFromFrameArgs = Infer<typeof removeMultipleNodesFromFrameArgs>;
