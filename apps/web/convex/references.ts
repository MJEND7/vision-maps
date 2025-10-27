import { query, internalMutation, internalQuery } from "./_generated/server";
import { v, Infer } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireVisionAccess } from "./utils/auth";

/**
 * Internal Mutation: Create References
 * Called on node creation to establish references to other nodes
 * Args: node_id_list (array of node IDs), vision (vision ID), channel (channel ID), frame (optional frame ID)
 */
const createReferencesArgs = v.object({
    nodeIdList: v.array(v.id("nodes")),
    vision: v.id("visions"),
    channel: v.id("channels"),
    frame: v.optional(v.id("frames")),
});

export const createReferences = internalMutation({
    args: createReferencesArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.vision);

        // Get all nodes to be referenced to extract their titles
        const referencedNodes = await Promise.all(
            args.nodeIdList.map((nodeId) => ctx.db.get(nodeId))
        );

        // Filter out null entries
        const validNodes = referencedNodes.filter(
            (node) => node !== null
        ) as Exclude<(typeof referencedNodes)[number], null>[];

        if (validNodes.length === 0) {
            throw new Error("No valid nodes found in nodeIdList");
        }

        // Create references for each node in the list
        // Each reference has the first node as the parent and points to the current node
        const referenceIds: Id<"references">[] = [];

        for (let i = 0; i < validNodes.length; i++) {
            for (let j = 0; j < validNodes.length; j++) {
                if (i !== j) {
                    // Create reference from node i to node j
                    const refId = await ctx.db.insert("references", {
                        parent: validNodes[i]._id,
                        ref: validNodes[j]._id,
                        channel: args.channel,
                        frame: args.frame,
                        label: validNodes[j].title,
                        ref_title: validNodes[j].title,
                    });
                    referenceIds.push(refId);
                }
            }
        }

        return referenceIds;
    },
});

export type CreateReferencesArgs = Infer<typeof createReferencesArgs>;

/**
 * Internal Mutation: Delete References
 * Called on node update & delete to clean up references
 * Args: reference_id_list (array of reference IDs), vision (vision ID)
 */
const deleteReferencesArgs = v.object({
    referenceIdList: v.array(v.id("references")),
    vision: v.id("visions"),
});

export const deleteReferences = internalMutation({
    args: deleteReferencesArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.vision);

        // Validate that all references exist and belong to the vision
        const references = await Promise.all(
            args.referenceIdList.map((refId) => ctx.db.get(refId))
        );

        const validReferenceIds = args.referenceIdList.filter(
            (_, index) => references[index] !== null
        );

        // Delete all valid references
        await Promise.all(
            validReferenceIds.map((refId) => ctx.db.delete(refId))
        );

        return {
            deletedCount: validReferenceIds.length,
            attemptedCount: args.referenceIdList.length,
        };
    },
});

export type DeleteReferencesArgs = Infer<typeof deleteReferencesArgs>;

/**
 * Internal Query: Get References
 * Fetches all the times nodes in a list have been referenced
 * Returns an array of referencing nodes for each node in the input list
 * Args: node_id_list (array of node IDs), vision (vision ID)
 *
 * Returns for each node: { nodeId, referencingNodes: [] }
 * referencingNodes contains all nodes that reference the given node with their reference metadata
 */
const getReferencesArgs = v.object({
    nodeIdList: v.array(v.id("nodes")),
    vision: v.id("visions"),
});

export const getReferences = internalQuery({
    args: getReferencesArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.vision);

        // For each node in the list, find all references where this node is being referenced (ref field)
        const nodeReferencesMap = await Promise.all(
            args.nodeIdList.map(async (nodeId) => {
                // Find all references where this node is the target (ref)
                const references = await ctx.db
                    .query("references")
                    .withIndex("by_ref", (q) => q.eq("ref", nodeId))
                    .collect();

                // Get the parent nodes that reference this node
                const referencingNodes = await Promise.all(
                    references.map(async (reference) => {
                        const parentNode = await ctx.db.get(reference.parent);
                        return {
                            nodeId: reference.parent,
                            label: reference.label,
                            refTitle: reference.ref_title,
                            channel: reference.channel,
                            frame: reference.frame,
                            parentNode: parentNode,
                        };
                    })
                );

                return {
                    nodeId,
                    referencingNodes,
                };
            })
        );

        return nodeReferencesMap;
    },
});

export type GetReferencesArgs = Infer<typeof getReferencesArgs>;

/**
 * External Query: Search By Reference
 * Fetches all references based on label and location (channel or frame)
 * Args: label (search term), vision (vision ID), channelTitle (optional), frameTitle (optional)
 */
const searchByReferenceArgs = v.object({
    label: v.string(),
    vision: v.id("visions"),
    channelTitle: v.optional(v.string()),
    frameTitle: v.optional(v.string()),
});

export const searchByReference = query({
    args: searchByReferenceArgs,
    handler: async (ctx, args) => {
        await requireVisionAccess(ctx, args.vision);

        // Search for references by label using search index
        const referencesByLabel = await ctx.db
            .query("references")
            .withSearchIndex("search_label", (q) =>
                q.search("label", args.label)
            )
            .collect();

        // Filter by channel if provided
        let filtered = referencesByLabel;

        if (args.channelTitle) {
            const channel = await ctx.db
                .query("channels")
                .filter((q) =>
                    q.and(
                        q.eq(q.field("title"), args.channelTitle),
                        q.eq(q.field("vision"), args.vision)
                    )
                )
                .first();

            if (channel) {
                filtered = filtered.filter((ref) => ref.channel === channel._id);
            } else {
                filtered = [];
            }
        }

        // Filter by frame if provided
        if (args.frameTitle) {
            const frame = await ctx.db
                .query("frames")
                .filter((q) =>
                    q.and(
                        q.eq(q.field("title"), args.frameTitle),
                        q.eq(q.field("channel"), filtered[0]?.channel)
                    )
                )
                .first();

            if (frame) {
                filtered = filtered.filter((ref) => ref.frame === frame._id);
            } else {
                filtered = [];
            }
        }

        // Enrich results with parent and ref node information
        const enrichedResults = await Promise.all(
            filtered.map(async (reference) => {
                const parentNode = await ctx.db.get(reference.parent);
                //const refNode = await ctx.db.get(reference.ref);
                const channel = await ctx.db.get(reference.channel);
                const frame = reference.frame
                    ? await ctx.db.get(reference.frame)
                    : null;

                return {
                    _id: reference._id,
                    _creationTime: reference._creationTime,
                    parent: reference.parent,
                    parentTitle: parentNode?.title || "Unknown",
                    ref: reference.ref,
                    refTitle: reference.ref_title,
                    label: reference.label,
                    channel: reference.channel,
                    channelTitle: channel?.title || "Unknown",
                    frame: reference.frame,
                    frameTitle: frame?.title || null,
                };
            })
        );

        return enrichedResults;
    },
});

export type SearchByReferenceArgs = Infer<typeof searchByReferenceArgs>;
