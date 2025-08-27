import { defineTable } from "convex/server";
import { v } from "convex/values";

export class User {
    static TABLE_NAME = "users"
    static Table = defineTable({
        name: v.string(),
        email: v.optional(v.string()),
        tokenIdentifier: v.string(),
        externalId: v.string(),
        picture: v.optional(v.string()),
    }).index("by_token", ["tokenIdentifier"])
     .index("byExternalId", ["externalId"]);
}
