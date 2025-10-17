import { defineTable } from "convex/server";
import { v } from "convex/values";
import { edgeValidator } from "../reactflow/types";
import { FramedNode } from "./framed_node";

export const edgeData = v.object({
  name: v.optional(v.string()),
});

export const rfEdge = edgeValidator(edgeData);

export class Edges {
  static TABLE_NAME = "edges" as const;

  static Table = defineTable({
    source: v.id(FramedNode.TABLE_NAME),
    target: v.id(FramedNode.TABLE_NAME),
    frameId: v.id("frames"),
    edge: rfEdge,
  })
    .index("frame", ["frameId"])
    .index("id", ["edge.id"])
    .index("source", ["source", "target"])
    .index("target", ["target", "source"]);
}
