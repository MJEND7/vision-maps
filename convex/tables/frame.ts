import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Visions } from "./visions";
import { Channel } from "./channel";
import { nodeValidator } from "../reactflow/types";

// A frame is a place where you can group nodes and we automaticly 
// order them for the best view experience.
export class Frame {
    static TABLE_NAME = "frames"
    static Table = defineTable({
        title: v.string(),
        sortOrder: v.optional(v.number()),
        updatedAt: v.string(),
        createdAt: v.string(),
        channel: v.id(Channel.TABLE_NAME),
        vision: v.id(Visions.TABLE_NAME)
    }).index("by_channel", ["channel"])
        .index("by_vision", ["vision"]);

    static POSITIONS_TABLE_NAME = "frame_positions"
    static PositionsTable = defineTable({
        frameId: v.id(Frame.TABLE_NAME),
        nodeId: v.id("nodes"),
        batch: v.array(nodeValidator(v.id("nodes"))),
        batchTimestamp: v.number(),
    }).index("by_frame", ["frameId"])
      .index("by_node_frame", ["nodeId", "frameId"])
      .index("by_batch_timestamp", ["frameId", "batchTimestamp"]);
}
