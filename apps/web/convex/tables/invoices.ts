import { defineTable } from "convex/server";
import { v } from "convex/values";

export const Invoices = {
  Table: defineTable({
    // Owner of the invoice
    stripeCustomerId: v.string(),
    ownerType: v.union(v.literal("user"), v.literal("org")),
    ownerId: v.string(),

    // Stripe invoice details
    invoiceId: v.string(),
    subscriptionId: v.optional(v.string()),

    // Amount information
    amountPaid: v.number(), // Amount in cents
    currency: v.string(), // e.g., "usd"

    // Invoice metadata
    status: v.string(), // "paid", "open", "void", "uncollectible"
    invoiceNumber: v.optional(v.string()),
    invoicePdf: v.optional(v.string()),
    hostedInvoiceUrl: v.optional(v.string()),

    // Billing period
    periodStart: v.number(), // Unix timestamp
    periodEnd: v.number(), // Unix timestamp

    // Additional details for team plans
    quantity: v.optional(v.number()), // Number of seats for this invoice

    // Timestamps
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_customer", ["stripeCustomerId"])
    .index("by_owner", ["ownerType", "ownerId"])
    .index("by_invoice_id", ["invoiceId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),
};
