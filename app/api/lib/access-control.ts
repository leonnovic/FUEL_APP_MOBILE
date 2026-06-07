/**
 * Access Control Service - Permission checking and enforcement
 * 
 * Features:
 * - Role-based permission checking
 * - Team-scoped access control
 * - Data type scoping
 * - Action limitations
 * - Permission inheritance
 */

import { getDb } from "@db/connection";
import {
  roles,
  teams,
  teamMembers,
  dataScopes,
  actionScopes,
} from "@db/schema";
import { eq, and, inArray } from "drizzle-orm";

const db = getDb();

// Permission codes
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard:view",
  
  // Sales
  SALES_CREATE: "sales:create",
  SALES_READ: "sales:read",
  SALES_UPDATE: "sales:update",
  SALES_DELETE: "sales:delete",
  SALES_EXPORT: "sales:export",
  
  // Inventory
  INVENTORY_CREATE: "inventory:create",
  INVENTORY_READ: "inventory:read",
  INVENTORY_UPDATE: "inventory:update",
  INVENTORY_DELETE: "inventory:delete",
  INVENTORY_EXPORT: "inventory:export",
  
  // Payments
  PAYMENTS_CREATE: "payments:create",
  PAYMENTS_READ: "payments:read",
  PAYMENTS_UPDATE: "payments:update",
  PAYMENTS_DELETE: "payments:delete",
  PAYMENTS_EXPORT: "payments:export",
  
  // Stations
  STATIONS_CREATE: "stations:create",
  STATIONS_READ: "stations:read",
  STATIONS_UPDATE: "stations:update",
  STATIONS_DELETE: "stations:delete",
  STATIONS_MANAGE: "stations:manage",
  
  // Users
  USERS_CREATE: "users:create",
  USERS_READ: "users:read",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_INVITE: "users:invite",
  
  // Reports
  REPORTS_VIEW: "reports:view",
  REPORTS_CREATE: "reports:create",
  REPORTS_EXPORT: "reports:export",
  
  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_UPDATE: "settings:update",
  SETTINGS_MANAGE: "settings:manage",
  
  // Audit
  AUDIT_VIEW: "audit:view",
  AUDIT_EXPORT: "audit:export",
  
  // Roles & Permissions
  ROLES_CREATE: "roles:create",
  ROLES_READ: "roles:read",
  ROLES_UPDATE: "roles:update",
  ROLES_DELETE: "roles:delete",
  
  // Teams
  TEAMS_CREATE: "teams:create",
  TEAMS_READ: "teams:read",
  TEAMS_UPDATE: "teams:update",
  TEAMS_DELETE: "teams:delete",
  TEAMS_MANAGE: "teams:manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Resource categories for UI grouping
export const RESOURCE_CATEGORIES = {
  dashboard: ["dashboard:view"],
  sales: ["sales:create", "sales:read", "sales:update", "sales:delete", "sales:export"],
  inventory: ["inventory:create", "inventory:read", "inventory:update", "inventory:delete", "inventory:export"],
  payments: ["payments:create", "payments:read", "payments:update", "payments:delete", "payments:export"],
  stations: ["stations:create", "stations:read", "stations:update", "stations:delete", "stations:manage"],
  users: ["users:create", "users:read", "users:update", "users:delete", "users:invite"],
  reports: ["reports:view", "reports:create", "reports:export"],
  settings: ["settings:view", "settings:update", "settings:manage"],
  audit: ["audit:view", "audit:export"],
  roles: ["roles:create", "roles:read", "roles:update", "roles:delete"],
  teams: ["teams:create", "teams:read", "teams:update", "teams:delete", "teams:manage"],
};

// Default roles to seed
export const DEFAULT_ROLES = [
  {
    name: "Admin",
    code: "admin",
    description: "Full system access with all permissions",
    level: 100,
    type: "system" as const,
    canManageUsers: true,
    canManageRoles: true,
    canViewAuditLogs: true,
    permissions: Object.values(PERMISSIONS),
  },
  {
    name: "Manager",
    code: "manager",
    description: "Station and team management with limited admin functions",
    level: 50,
    type: "system" as const,
    canManageUsers: true,
    canManageRoles: false,
    canViewAuditLogs: true,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_READ, PERMISSIONS.SALES_UPDATE, PERMISSIONS.SALES_EXPORT,
      PERMISSIONS.INVENTORY_CREATE, PERMISSIONS.INVENTORY_READ, PERMISSIONS.INVENTORY_UPDATE, PERMISSIONS.INVENTORY_EXPORT,
      PERMISSIONS.PAYMENTS_CREATE, PERMISSIONS.PAYMENTS_READ, PERMISSIONS.PAYMENTS_UPDATE,
      PERMISSIONS.STATIONS_READ, PERMISSIONS.STATIONS_UPDATE,
      PERMISSIONS.USERS_READ, PERMISSIONS.USERS_INVITE,
      PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_CREATE, PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_UPDATE,
      PERMISSIONS.AUDIT_VIEW,
    ],
  },
  {
    name: "Cashier",
    code: "cashier",
    description: "Point of sale and basic inventory access",
    level: 20,
    type: "system" as const,
    canManageUsers: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.PAYMENTS_CREATE, PERMISSIONS.PAYMENTS_READ,
    ],
  },
  {
    name: "Viewer",
    code: "viewer",
    description: "Read-only access to reports and dashboards",
    level: 10,
    type: "system" as const,
    canManageUsers: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SALES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.PAYMENTS_READ,
      PERMISSIONS.STATIONS_READ,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.SETTINGS_VIEW,
    ],
  },
];

export interface UserContext {
  userId: number;
  unionId: string;
  role: "user" | "admin";
  teamIds?: number[];
  currentTeamId?: number;
  currentStationId?: number;
}

export interface AccessCheckOptions {
  teamId?: number;
  stationId?: number;
  resourceId?: string;
  dataScope?: Record<string, any>;
}

export class AccessControlService {
  /**
   * Get all permissions for a user in a team context
   */
  async getUserPermissions(userId: number, teamId: number): Promise<string[]> {
    // Get user's team membership
    const memberships = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.status, "active")
        )
      );

    if (!memberships.length) {
      return [];
    }

    const allPermissions: Set<string> = new Set();

    for (const membership of memberships) {
      // Get role permissions
      const role = await db
        .select()
        .from(roles)
        .where(eq(roles.id, membership.roleId))
        .limit(1);

      if (role[0]?.permissions) {
        const rolePermissions = JSON.parse(role[0].permissions);
        rolePermissions.forEach((p: string) => allPermissions.add(p));
      }

      // Add custom permissions
      if (membership.customPermissions) {
        const customPerms = JSON.parse(membership.customPermissions);
        customPerms.forEach((p: string) => allPermissions.add(p));
      }

      // Remove denied permissions
      if (membership.deniedPermissions) {
        const deniedPerms = JSON.parse(membership.deniedPermissions);
        deniedPerms.forEach((p: string) => allPermissions.delete(p));
      }
    }

    return Array.from(allPermissions);
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: number,
    permission: string,
    options: AccessCheckOptions = {}
  ): Promise<boolean> {
    const { teamId } = options;

    if (!teamId) {
      return false;
    }

    const permissions = await this.getUserPermissions(userId, teamId);
    return permissions.includes(permission);
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: number,
    requiredPermissions: string[],
    options: AccessCheckOptions = {}
  ): Promise<boolean> {
    const { teamId } = options;

    if (!teamId) {
      return false;
    }

    const userPermissions = await this.getUserPermissions(userId, teamId);

    return requiredPermissions.every((p) => userPermissions.includes(p));
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: number,
    requiredPermissions: string[],
    options: AccessCheckOptions = {}
  ): Promise<boolean> {
    const { teamId } = options;

    if (!teamId) {
      return false;
    }

    const userPermissions = await this.getUserPermissions(userId, teamId);

    return requiredPermissions.some((p) => userPermissions.includes(p));
  }

  /**
   * Get data scopes for a user (what data they can access)
   */
  async getDataScopes(
    userId: number,
    teamId: number,
    resourceType: string
  ): Promise<dataScopes.$inferSelect[]> {
    // Get user's memberships
    const memberships = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.status, "active")
        )
      );

    if (!memberships.length) {
      return [];
    }

    const roleIds = memberships.map((m) => m.roleId);

    // Get scopes for user's roles
    const scopes = await db
      .select()
      .from(dataScopes)
      .where(
        and(
          eq(dataScopes.teamId, teamId),
          eq(dataScopes.resourceType, resourceType),
          eq(dataScopes.isActive, true),
          inArray(dataScopes.roleId, roleIds)
        )
      );

    // Also get user-specific scopes
    const userScopes = await db
      .select()
      .from(dataScopes)
      .where(
        and(
          eq(dataScopes.teamId, teamId),
          eq(dataScopes.resourceType, resourceType),
          eq(dataScopes.isActive, true),
          eq(dataScopes.userId, userId)
        )
      );

    return [...scopes, ...userScopes];
  }

  /**
   * Get action limitations for a user
   */
  async getActionLimitations(
    userId: number,
    teamId: number,
    permissionCode: string
  ): Promise<actionScopes.$inferSelect | null> {
    const memberships = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.status, "active")
        )
      );

    if (!memberships.length) {
      return null;
    }

    const roleIds = memberships.map((m) => m.roleId);

    // Check for user-specific limitations first (higher priority)
    const userLimit = await db
      .select()
      .from(actionScopes)
      .where(
        and(
          eq(actionScopes.teamId, teamId),
          eq(actionScopes.permissionCode, permissionCode),
          eq(actionScopes.userId, userId),
          eq(actionScopes.isActive, true)
        )
      )
      .limit(1);

    if (userLimit[0]) {
      return userLimit[0];
    }

    // Check role-level limitations
    const roleLimit = await db
      .select()
      .from(actionScopes)
      .where(
        and(
          eq(actionScopes.teamId, teamId),
          eq(actionScopes.permissionCode, permissionCode),
          inArray(actionScopes.roleId, roleIds),
          eq(actionScopes.isActive, true)
        )
      )
      .limit(1);

    return roleLimit[0] || null;
  }

  /**
   * Get user's teams
   */
  async getUserTeams(userId: number): Promise<teams.$inferSelect[]> {
    const memberships = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.status, "active")
        )
      );

    if (!memberships.length) {
      return [];
    }

    const teamIds = memberships.map((m) => m.teamId);

    return db.select().from(teams).where(inArray(teams.id, teamIds));
  }

  /**
   * Get user's role in a team
   */
  async getUserTeamRole(
    userId: number,
    teamId: number
  ): Promise<roles.$inferSelect | null> {
    const membership = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.status, "active")
        )
      )
      .limit(1);

    if (!membership[0]) {
      return null;
    }

    const role = await db
      .select()
      .from(roles)
      .where(eq(roles.id, membership[0].roleId))
      .limit(1);

    return role[0] || null;
  }

  /**
   * Seed default permissions and roles
   */
  async seedDefaults(): Promise<void> {
    // Seed permissions
    const allPermissions = Object.values(PERMISSIONS);
    const resourceCategories: Array<keyof typeof RESOURCE_CATEGORIES> = Object.keys(RESOURCE_CATEGORIES) as any;

    for (const perm of allPermissions) {
      const [category] = resourceCategories.filter((cat) =>
        RESOURCE_CATEGORIES[cat].includes(perm)
      );
      const actionType = perm.split(":")[1] as any;

      await db.insert(permissions).values({
        code: perm,
        name: perm.replace(":", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        resourceCategory: category || "settings",
        actionType: actionType || "manage",
      }).onDuplicateKeyIgnore();
    }

    // Seed roles
    for (const role of DEFAULT_ROLES) {
      await db.insert(roles).values({
        ...role,
        permissions: JSON.stringify(role.permissions),
      }).onDuplicateKeyIgnore();
    }
  }
}

export const accessControl = new AccessControlService();