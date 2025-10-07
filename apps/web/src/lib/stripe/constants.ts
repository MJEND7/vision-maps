/**
 * Stripe Configuration Constants
 */

/**
 * Trial period duration in days
 * This applies to both user (pro) and organization (team) subscriptions
 */
export const TRIAL_PERIOD_DAYS = 7;

/**
 * Price IDs from environment variables
 * These are used to determine plan types
 */
export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;
export const STRIPE_TEAM_PRICE_ID = process.env.STRIPE_TEAM_PRICE_ID;
