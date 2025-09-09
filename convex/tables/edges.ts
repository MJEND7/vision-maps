import { defineTable } from "convex/server";
import { v } from "convex/values";
import { edgeValidator } from "../reactflow/types";
import { Frame } from "./frame";

export const edgeData = v.object({
  name: v.optional(v.string()),
});

export const rfEdge = edgeValidator(edgeData);

export class Edges {
  static TABLE_NAME = "edges" as const;

  static Table = defineTable({
    source: v.id(Frame.POSITIONS_TABLE_NAME),
    target: v.id(Frame.POSITIONS_TABLE_NAME),
    frameId: v.id("frames"),
    edge: rfEdge,
  })
    .index("frame", ["frameId"])
    .index("id", ["edge.id"])
    .index("source", ["source", "target"])
    .index("target", ["target", "source"]);
}
