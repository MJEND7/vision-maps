import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Nodes } from "./nodes";
import { defaultEdgeValidator, edgeValidator } from "../reactflow/types";

export const edgeData = v.object({
  bar: v.number(),
});

export const rfEdge = edgeValidator(edgeData);

export class Edges {
  static TABLE_NAME = "edges" as const;

  static Table = defineTable({
    source: v.id(Nodes.TABLE_NAME),
    target: v.id(Nodes.TABLE_NAME),
    frameId: v.id("frames"),
    edge: rfEdge,
  })
    .index("frame", ["frameId"])
    .index("id", ["edge.id"])
    .index("source", ["source", "target"])
    .index("target", ["target", "source"]);
}
