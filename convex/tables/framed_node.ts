import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Frame } from "./frame";
import { nodeValidator } from "../reactflow/types";

export class FramedNode {
    static TABLE_NAME = "framed_node" as const;
    
    static Table = defineTable({
        frameId: v.id(Frame.TABLE_NAME),
        node: nodeValidator(v.id("nodes")),
    }).index("by_frame", ["frameId"])
      .index("id", ["node.id"]);
}
