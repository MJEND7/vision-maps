/**
 * Permission system based on user subscription plans
 * Integrates with Clerk authentication and subscription management
 */

export enum Plan {
  FREE = "free",
  PRO = "pro",
  TEAMS = "teams",
}

export enum Permission {
  // Vision permissions
  READ_VISION = "read_vision",
  UPDATE_VISION = "update_vision",
  DELETE_VISION = "delete_vision",

  // Organization permissions
  CREATE_ORG = "create_org",
  READ_ORG = "read_org",
  UPDATE_ORG = "update_org",
  DELETE_ORG = "delete_org",

  // Channel permissions
  CREATE_CHANNEL = "create_channel",
  READ_CHANNEL = "read_channel",
  UPDATE_CHANNEL = "update_channel",
  DELETE_CHANNEL = "delete_channel",

  // Frame permissions
  CREATE_FRAME = "create_frame",
  READ_FRAME = "read_frame",
  UPDATE_FRAME = "update_frame",
  DELETE_FRAME = "delete_frame",

  // Notification permissions
  READ_NOTIFICATIONS = "read_notifications",

  // View mode (public tracking)
  VIEW_MODE = "view_mode",

  // Export permissions
  BASIC_EXPORT = "basic_export",
  ADVANCED_EXPORT = "advanced_export",

  // AI features
  AI_NODES = "ai_nodes",
  AI_LINKING = "ai_linking",
  AI_CONTEXT_MAPPING = "ai_context_mapping",

  // Collaboration features
  INVITE_USERS = "invite_users",
  COMMENTING = "commenting",
  LIVE_COLLABORATION = "live_collaboration",
}

/**
 * Base permissions for FREE plan
 */
const FREE_PERMISSIONS: Permission[] = [
  // Full CRUD on orgs, channels, frames
  Permission.CREATE_ORG,
  Permission.READ_ORG,
  Permission.UPDATE_ORG,
  Permission.DELETE_ORG,
  Permission.CREATE_CHANNEL,
  Permission.READ_CHANNEL,
  Permission.UPDATE_CHANNEL,
  Permission.DELETE_CHANNEL,
  Permission.CREATE_FRAME,
  Permission.READ_FRAME,
  Permission.UPDATE_FRAME,
  Permission.DELETE_FRAME,

  // Limited vision CRUD (will check count separately)
  Permission.READ_VISION,
  Permission.UPDATE_VISION,
  Permission.DELETE_VISION,

  // Basic features
  Permission.READ_NOTIFICATIONS,
  Permission.VIEW_MODE,
  Permission.BASIC_EXPORT,
];

/**
 * Additional permissions for PRO plan (on top of FREE)
 */
const PRO_ADDITIONAL_PERMISSIONS: Permission[] = [
  // AI features
  Permission.AI_NODES,
  Permission.AI_LINKING,
  Permission.AI_CONTEXT_MAPPING,

  // Advanced export
  Permission.ADVANCED_EXPORT,

  // Light collaboration (1 extra person per vision)
  Permission.INVITE_USERS,
  Permission.COMMENTING,
];

/**
 * Additional permissions for TEAMS plan (on top of PRO)
 */
const TEAMS_ADDITIONAL_PERMISSIONS: Permission[] = [
  // Full collaboration features
  Permission.LIVE_COLLABORATION,
];

/**
 * Permission definitions for each plan tier
 */
const PLAN_PERMISSIONS: Record<Plan, Permission[]> = {
  [Plan.FREE]: FREE_PERMISSIONS,
  [Plan.PRO]: [...FREE_PERMISSIONS, ...PRO_ADDITIONAL_PERMISSIONS],
  [Plan.TEAMS]: [...FREE_PERMISSIONS, ...PRO_ADDITIONAL_PERMISSIONS, ...TEAMS_ADDITIONAL_PERMISSIONS],
};

/**
 * Vision count limits per plan
 */
export const VISION_LIMITS: Record<Plan, number> = {
  [Plan.FREE]: 1,
  [Plan.PRO]: Infinity,
  [Plan.TEAMS]: Infinity,
};

/**
 * Collaboration limits per plan (users per vision)
 */
export const COLLABORATION_LIMITS: Record<Plan, number> = {
  [Plan.FREE]: 1, // Solo only (just the owner)
  [Plan.PRO]: 2, // Owner + 1 guest
  [Plan.TEAMS]: 20, // 1-20 users
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(plan: Plan, permission: Permission): boolean {
  const planPermissions = PLAN_PERMISSIONS[plan];
  return planPermissions.includes(permission);
}

/**
 * Check if a user can create a new vision based on their plan and current count
 */
export function canCreateVision(plan: Plan, currentVisionCount: number): boolean {
  const limit = VISION_LIMITS[plan];
  return currentVisionCount < limit;
}

/**
 * Check if a user can invite more users to a vision
 */
export function canInviteToVision(plan: Plan, currentMemberCount: number): boolean {
  if (!hasPermission(plan, Permission.INVITE_USERS)) {
    return false;
  }

  const limit = COLLABORATION_LIMITS[plan];
  return currentMemberCount < limit;
}

/**
 * Get all permissions for a plan
 */
export function getPlanPermissions(plan: Plan): Permission[] {
  return PLAN_PERMISSIONS[plan];
}

/**
 * Parse plan string from Clerk session claims
 * Expected format: "u:free", "o:pro", etc.
 */
export function parsePlan(rawPlan: string | undefined): Plan {
  if (!rawPlan) {
    return Plan.FREE;
  }

  const plan = rawPlan.replace("u:", "").replace("o:", "").toLowerCase();

  switch (plan) {
    case "pro":
      return Plan.PRO;
    case "teams":
      return Plan.TEAMS;
    case "free":
    default:
      return Plan.FREE;
  }
}

/**
 * Get readable plan name
 */
export function getPlanName(plan: Plan): string {
  switch (plan) {
    case Plan.FREE:
      return "Free";
    case Plan.PRO:
      return "Pro";
    case Plan.TEAMS:
      return "Teams";
  }
}

/**
 * Get plan features for display
 */
export function getPlanFeatures(plan: Plan): {
  visionLimit: number | string;
  collaborators: number | string;
  hasAI: boolean;
  hasComments: boolean;
  hasLiveCollab: boolean;
  exportType: "basic" | "advanced";
} {
  return {
    visionLimit: VISION_LIMITS[plan] === Infinity ? "Unlimited" : VISION_LIMITS[plan],
    collaborators: COLLABORATION_LIMITS[plan] === Infinity
      ? "Up to 20"
      : COLLABORATION_LIMITS[plan] === 1
      ? "Solo only"
      : `Up to ${COLLABORATION_LIMITS[plan]}`,
    hasAI: hasPermission(plan, Permission.AI_NODES),
    hasComments: hasPermission(plan, Permission.COMMENTING),
    hasLiveCollab: hasPermission(plan, Permission.LIVE_COLLABORATION),
    exportType: hasPermission(plan, Permission.ADVANCED_EXPORT) ? "advanced" : "basic",
  };
}
