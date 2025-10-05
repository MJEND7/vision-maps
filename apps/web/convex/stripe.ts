import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

// Export the internal mutation for processing Stripe events
export { processStripeEvent } from "./stripe/processEvent";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

const ALLOWED_STRIPE_EVENTS: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];

/**
 * Stripe webhook handler for Convex
 * This allows you to use: stripe listen --forward-to https://your-deployment.convex.site/stripe/webhook
 */
export const webhook = httpAction(async (ctx, request) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[STRIPE WEBHOOK CONVEX] No signature provided");
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    // SECURITY: Log detailed error information for webhook signature failures
    // This helps detect potential webhook spoofing attempts
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[STRIPE WEBHOOK CONVEX] Signature verification failed", {
      error: errorMessage,
      stack: errorStack,
      signatureLength: signature.length,
      bodyLength: body.length,
      timestamp: new Date().toISOString(),
      // Don't log the actual signature or body for security
    });

    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // Skip processing if the event isn't one we're tracking
  if (!ALLOWED_STRIPE_EVENTS.includes(event.type)) {
    console.log(`[STRIPE WEBHOOK CONVEX] Skipping event type: ${event.type}`);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  console.log(`[STRIPE WEBHOOK CONVEX] Processing event ${event.type}`);

  try {
    // Process the event asynchronously via action (actions can call Stripe API)
    await ctx.runAction(internal.stripe.processEvent.processStripeEvent, {
      event: JSON.stringify(event),
    });

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    // SECURITY: Enhanced error logging for webhook processing failures
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[STRIPE WEBHOOK CONVEX] Error processing event", {
      eventId: event.id,
      eventType: event.type,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });

    return new Response("Error processing event", { status: 500 });
  }
});
