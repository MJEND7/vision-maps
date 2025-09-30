import { v } from "convex/values";
import { connectionValidator, edgeChangeValidator } from "./reactflow/types";
import { mutation, query } from "./_generated/server";
import { rfEdge } from "./tables/edges";
import { addEdge, applyEdgeChanges } from "@xyflow/react";
import { Id } from "./_generated/dataModel";
import { requireVisionAccess } from "./utils/auth";

export const get = query({
    args: { frameId: v.id("frames") },
    handler: async (ctx, args) => {
        // Verify access to the frame's vision
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }
        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const all = await ctx.db
            .query("edges")
            .withIndex("frame", (q) => q.eq("frameId", args.frameId as Id<"frames">))
            .collect();
        return all.map((edge) => edge.edge);
    },
});

export const update = mutation({
    args: {
        frameId: v.string(),
        changes: v.array(edgeChangeValidator(rfEdge)),
    },
    handler: async (ctx, args) => {
        // Verify access to the frame's vision
        const frame = await ctx.db.get(args.frameId as Id<"frames">);
        if (!frame) {
            throw new Error("Frame not found");
        }
        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        // Get the ids of the edges that are being changed
        const ids = args.changes.flatMap((change) =>
            change.type === "add" && change.item
                ? [change.item.id] : []
        );
        // Only fetch the edges that are being changed
        const edges = (
            await Promise.all(
                ids.map(async (id) =>
                    ctx.db
                        .query("edges")
                        .withIndex("id", (q) => q.eq("edge.id", id))
                        .unique(),
                ),
            )
        ).flatMap((n) => (n ? [n] : []));
        const edgesById = new Map(edges.map((n) => [n.edge.id, n]));

        // Filter out add/reset changes with undefined items
        const validChanges = args.changes.filter(change => {
            if (change.type === 'add') {
                return change.item !== undefined;
            }
            return true;
        });

        const updatedEdges = applyEdgeChanges(
            validChanges as any, // Type assertion needed due to custom validator
            edges.map((edge) => edge.edge),
        );
        const updatedIds = new Set(updatedEdges.map((n) => n.id));

        await Promise.all(
            updatedEdges.map(async (edge) => {
                const existing = edgesById.get(edge.id);
                const source = (
                    await ctx.db
                        .query("framed_node")
                        .withIndex("id", (q) => q.eq("node.id", edge.source))
                        .unique()
                )?._id;
                const target = (
                    await ctx.db
                        .query("framed_node")
                        .withIndex("id", (q) => q.eq("node.id", edge.target))
                        .unique()
                )?._id;
                if (!source || !target) {
                    throw new Error("Source or target node not found");
                }
                // Remove this line since label property doesn't exist in the validator
                if (existing) {
                    await ctx.db.patch(existing._id, { edge, source, target });
                } else {
                    await ctx.db.insert("edges", {
                        frameId: args.frameId as Id<"frames">,
                        edge,
                        source,
                        target,
                    });
                }
            }),
        );
        // Handle deletions
        await Promise.all(
            edges.map(async (edge) => {
                if (!updatedIds.has(edge.edge.id)) {
                    await ctx.db.delete(edge._id);
                }
            }),
        );
    },
});

export const deleteEdge = mutation({
    args: {
        frameId: v.id("frames"),
        edgeId: v.string(),
    },
    handler: async (ctx, args) => {
        // Verify access to the frame's vision
        const frame = await ctx.db.get(args.frameId);
        if (!frame) {
            throw new Error("Frame not found");
        }
        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const edges = await ctx.db
            .query("edges")
            .withIndex("frame", (q) => q.eq("frameId", args.frameId))
            .filter((q) => q.eq(q.field("edge.id"), args.edgeId))
            .collect();
        
        if (edges.length > 0) {
            // Delete all edges with this ID (in case there are duplicates)
            await Promise.all(edges.map(edge => ctx.db.delete(edge._id)));
            return { success: true, deletedCount: edges.length };
        }
        
        return { success: false, error: "Edge not found" };
    },
});

export const connect = mutation({
    args: {
        frameId: v.string(),
        connection: connectionValidator,
    },
    handler: async (ctx, args) => {
        // Verify access to the frame's vision
        const frame = await ctx.db.get(args.frameId as Id<"frames">);
        if (!frame) {
            throw new Error("Frame not found");
        }
        if (frame.vision) {
            await requireVisionAccess(ctx, frame.vision);
        }

        const { source, target, sourceHandle, targetHandle } = args.connection;
        if (!source || !target) {
            throw new Error("Source or target not specified");
        }
        const sourceDoc = await ctx.db
            .query("framed_node")
            .withIndex("id", (q) => q.eq("node.id", source))
            .unique();
        const targetDoc = await ctx.db
            .query("framed_node")
            .withIndex("id", (q) => q.eq("node.id", target))
            .unique();
        if (!sourceDoc || !targetDoc) {
            throw new Error("Source or target not found");
        }
        // Check for existing edges between these nodes and delete them
        // This ensures only one edge can exist per source-target pair
        const existing = await ctx.db
            .query("edges")
            .withIndex("source", (q) =>
                q.eq("source", sourceDoc._id).eq("target", targetDoc._id),
            )
            .collect();
        
        // Delete all existing edges between these nodes
        if (existing.length > 0) {
            await Promise.all(existing.map(edge => ctx.db.delete(edge._id)));
        }
        const sourceNode = await ctx.db
            .query("framed_node")
            .withIndex("id", (q) => q.eq("node.id", source))
            .unique();
        if (!sourceNode) {
            console.log("sourceNode doesn't exist", args.connection);
            return;
        }
        const targetNode =
            target &&
            (await ctx.db
                .query("framed_node")
                .withIndex("id", (q) => q.eq("node.id", target))
                .unique())
        if (!targetNode) {
            console.log("targetNode doesn't exist", args.connection);
            return;
        }
        // Create edge with proper structure
        const newEdge = {
            id: `${source}-${target}`,
            source,
            target,
            sourceHandle: sourceHandle || "bottom", // Default to bottom if no sourceHandle provided
            targetHandle: targetHandle || "left", // Default to left if no targetHandle provided
            data: { name: undefined }, // Match the expected edge data type
        };
        const edges = addEdge(newEdge, []);
        await Promise.all(
            edges.map(async (edge) => {
                // Ensure edge has proper data type
                const edgeWithData = {
                    ...edge,
                    data: edge.data || { name: undefined }
                };
                await ctx.db.insert("edges", {
                    frameId: args.frameId as Id<"frames">,
                    edge: edgeWithData,
                    source: sourceDoc._id,
                    target: targetDoc._id,
                });
            }),
        );
    },
});
