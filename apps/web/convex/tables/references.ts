import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";

export type Reference = {
  _id: Id<"references">;
  _creationTime: number;
  parent: Id<"nodes">;
  channel: Id<"channels">;
  frame: Id<"frames">;
  ref: Id<"nodes">;
  label: string;
  ref_title: string;
};

export type ReferencingNode = {
  nodeId: Id<"nodes">;
  label: string;
  refTitle: string;
  channel: Id<"channels">;
  frame?: Id<"frames">;
  parentNode: Doc<"nodes"> | null;
};

export type ReferencesMapItem = {
  nodeId: Id<"nodes">;
  referencingNodes: ReferencingNode[];
};

export class References {
    static TABLE_NAME = "references"
    static Table = defineTable({
        parent: v.id("nodes"),
        channel: v.id("channels"),
        frame: v.optional(v.id("frames")),
        ref: v.id("nodes"),
        label: v.string(), //The title of the Reference not the node 
        ref_title: v.string(),
    })
    .index("by_parent", ["parent"])
    .index("by_ref", ["ref"])
    .searchIndex("search_label", {
        searchField: "label",
    }).searchIndex("search_ref_title", {
        searchField: "ref_title",
    });
}
