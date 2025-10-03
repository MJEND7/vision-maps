import { stripe } from "./client";
import { redis } from "../redis";
import { STRIPE_SUB_CACHE, STRIPE_ORG_SUB_CACHE } from "./types";

/**
 * Syncs user plan data from Stripe to Redis
 * This is the single source of truth for subscription state
 */
export async function syncUserStripeDataToKV(
  customerId: string
): Promise<STRIPE_SUB_CACHE> {
  try {
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });

    if (subscriptions.data.length === 0) {
      const subData: STRIPE_SUB_CACHE = { status: "none" };
      await redis.set(`stripe:customer:${customerId}`, JSON.stringify(subData));
      return subData;
    }

    // If a user can have multiple subscriptions, that's your problem
    const subscription = subscriptions.data[0];

    // Store complete subscription state
    const subData: STRIPE_SUB_CACHE = {
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: subscription.items.data[0]?.price.id ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      paymentMethod:
        subscription.defaultPaymentMethod &&
        typeof subscription.defaultPaymentMethod !== "string"
          ? {
              brand: subscription.defaultPaymentMethod.card?.brand ?? null,
              last4: subscription.defaultPaymentMethod.card?.last4 ?? null,
            }
          : null,
    };

    // Store the data in Redis
    await redis.set(`stripe:customer:${customerId}`, JSON.stringify(subData));
    return subData;
  } catch (error) {
    console.error(
      `[STRIPE SYNC] Error syncing user data for customer ${customerId}:`,
      error
    );
    throw error;
  }
}

/**
 * Syncs organization plan data from Stripe to Redis (seat-based billing)
 * This is the single source of truth for org subscription state
 */
export async function syncOrgStripeDataToKV(
  customerId: string
): Promise<STRIPE_ORG_SUB_CACHE> {
  try {
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });

    if (subscriptions.data.length === 0) {
      const subData: STRIPE_ORG_SUB_CACHE = { status: "none" };
      await redis.set(
        `stripe:org:customer:${customerId}`,
        JSON.stringify(subData)
      );
      return subData;
    }

    const subscription = subscriptions.data[0];

    // Get the seat count from the subscription quantity
    const seats = subscription.items.data[0]?.quantity ?? 1;

    // Store complete subscription state with seat info
    const subData: STRIPE_ORG_SUB_CACHE = {
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: subscription.items.data[0]?.price.id ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      seats,
      paymentMethod:
        subscription.defaultPaymentMethod &&
        typeof subscription.defaultPaymentMethod !== "string"
          ? {
              brand: subscription.defaultPaymentMethod.card?.brand ?? null,
              last4: subscription.defaultPaymentMethod.card?.last4 ?? null,
            }
          : null,
    };

    // Store the data in Redis
    await redis.set(
      `stripe:org:customer:${customerId}`,
      JSON.stringify(subData)
    );
    return subData;
  } catch (error) {
    console.error(
      `[STRIPE SYNC] Error syncing org data for customer ${customerId}:`,
      error
    );
    throw error;
  }
}

/**
 * Helper to get user subscription data from Redis
 */
export async function getUserStripeDataFromKV(
  customerId: string
): Promise<STRIPE_SUB_CACHE | null> {
  try {
    const data = await redis.get<string>(`stripe:customer:${customerId}`);
    if (!data) return null;
    return JSON.parse(data) as STRIPE_SUB_CACHE;
  } catch (error) {
    console.error(
      `[STRIPE SYNC] Error getting user data from KV for customer ${customerId}:`,
      error
    );
    return null;
  }
}

/**
 * Helper to get org subscription data from Redis
 */
export async function getOrgStripeDataFromKV(
  customerId: string
): Promise<STRIPE_ORG_SUB_CACHE | null> {
  try {
    const data = await redis.get<string>(`stripe:org:customer:${customerId}`);
    if (!data) return null;
    return JSON.parse(data) as STRIPE_ORG_SUB_CACHE;
  } catch (error) {
    console.error(
      `[STRIPE SYNC] Error getting org data from KV for customer ${customerId}:`,
      error
    );
    return null;
  }
}
