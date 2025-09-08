import { v } from "convex/values";
import { connectionValidator, edgeChangeValidator } from "./reactflow/types";
import { mutation, query } from "./_generated/server";
import { rfEdge } from "./tables/edges";
import { addEdge, applyEdgeChanges } from "@xyflow/react";
import { Id } from "./_generated/dataModel";

export const get = query({
  args: { frameId: v.id("frames") },
  handler: async (ctx, args) => {
    // Do access checks here
    const all = await ctx.db
      .query("edges")
      .withIndex("frame", (q) => q.eq("frameId", args.frameId as Id<"frames">))
      .collect();
    // Modify data returned, join it, etc. here
    return all.map((edge) => edge.edge);
  },
});

export const update = mutation({
  args: {
    frameId: v.string(),
    changes: v.array(edgeChangeValidator(rfEdge)),
  },
  handler: async (ctx, args) => {
    // Do access checks here
    // Get the ids of the edges that are being changed
    const ids = args.changes.flatMap((change) =>
      change.type === "add" || change.type === "replace"
        ? change.item ? [change.item.id] : []
        : [change.id],
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
      if (change.type === 'add' || change.type === 'replace') {
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
            .query("nodes")
            .withIndex("id", (q) => q.eq("core.id", edge.source))
            .unique()
        )?._id;
        const target = (
          await ctx.db
            .query("nodes")
            .withIndex("id", (q) => q.eq("core.id", edge.target))
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

export const connect = mutation({
  args: {
    frameId: v.string(),
    connection: connectionValidator,
  },
  handler: async (ctx, args) => {
    // Do access checks here
    const { source, target, sourceHandle, targetHandle } = args.connection;
    if (!source || !target) {
      throw new Error("Source or target not specified");
    }
    const sourceDoc = await ctx.db
      .query("nodes")
      .withIndex("id", (q) => q.eq("core.id", source))
      .unique();
    const targetDoc = await ctx.db
      .query("nodes")
      .withIndex("id", (q) => q.eq("core.id", target))
      .unique();
    if (!sourceDoc || !targetDoc) {
      throw new Error("Source or target not found");
    }
    const existing = await ctx.db
      .query("edges")
      .withIndex("source", (q) =>
        q.eq("source", sourceDoc._id).eq("target", targetDoc._id),
      )
      .collect();
    if (
      existing.find(
        (e) =>
          e.edge.source === source &&
          e.edge.target === target &&
          e.edge.sourceHandle === sourceHandle &&
          e.edge.targetHandle === targetHandle,
      )
    ) {
      return;
    }
    const sourceNode = await ctx.db
      .query("nodes")
      .withIndex("id", (q) => q.eq("core.id", source))
      .unique();
    if (!sourceNode) {
      console.log("sourceNode doesn't exist", args.connection);
      return;
    }
    const targetNode =
      target &&
      (await ctx.db
        .query("nodes")
        .withIndex("id", (q) => q.eq("core.id", target))
        .unique());
    if (!targetNode) {
      console.log("targetNode doesn't exist", args.connection);
      return;
    }
    // Create edge with proper structure
    const newEdge = {
      id: `${source}-${target}`,
      source,
      target,
      sourceHandle,
      targetHandle,
      data: { bar: 0 }, // Match the expected edge data type
    };
    const edges = addEdge(newEdge, []);
    await Promise.all(
      edges.map(async (edge) => {
        // Ensure edge has proper data type
        const edgeWithData = {
          ...edge,
          data: edge.data || { bar: 0 }
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
