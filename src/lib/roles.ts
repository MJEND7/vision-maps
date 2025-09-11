/**
 * Global organization role definitions
 */
export enum OrgRole {
  ADMIN = "org:admin",
  MEMBER = "org:member"
}

/**
 * Helper functions for role management
 */
export class RoleUtils {
  /**
   * Check if a role is admin
   */
  static isAdmin(role: string): boolean {
    return role === OrgRole.ADMIN;
  }

  /**
   * Check if a role is member
   */
  static isMember(role: string): boolean {
    return role === OrgRole.MEMBER;
  }

  /**
   * Get display name for role
   */
  static getDisplayName(role: string): string {
    switch (role) {
      case OrgRole.ADMIN:
        return "Admin";
      case OrgRole.MEMBER:
        return "Member";
      default:
        return "Unknown";
    }
  }

  /**
   * Get all available roles
   */
  static getAllRoles(): { value: string; label: string }[] {
    return [
      { value: OrgRole.MEMBER, label: "Member" },
      { value: OrgRole.ADMIN, label: "Admin" }
    ];
  }
}