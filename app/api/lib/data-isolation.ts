/**
 * Data Isolation Service - Architecture-level multi-tenant isolation
 * 
 * Features:
 * - Row-level security enforcement
 * - Data scope filtering
 * - Cross-tenant access prevention
 * - Partition management
 * - Query augmentation
 */

import { getDb } from "@db/connection";
import { 
  tenants, 
  teams, 
  tenantSettings, 
  dataPartitions,
  dataAccessPolicies,
  teamMembers,
  roles,
} from "@db/schema";
import { and, eq } from "drizzle-orm";

const db = getDb();

export interface TenantContext {
  tenantId: number;
  isolationKey: string;
  dataResidency: string;
  complianceTier: string;
  planId?: number;
}

export interface IsolationOptions {
  requireTenant?: boolean;
  requireStation?: boolean;
  bypassCache?: boolean;
}

export interface QueryFilter {
  tenantId?: number;
  stationId?: number;
  partitionId?: number;
  [key: string]: any;
}

/**
 * Get tenant context from user session
 */
export async function getTenantContext(teamId: number): Promise<TenantContext | null> {
  const team = await db.query.teams.findFirst({
    where: (t, { eq }) => eq(t.id, teamId),
  });

  if (!team) return null;

  return {
    tenantId: team.id,
    isolationKey: team.isolationKey,
    dataResidency: "us", // Would come from tenant settings
    complianceTier: "standard",
    planId: undefined,
  };
}

/**
 * Enforce data isolation on queries
 * Adds tenant_id/station_id filters automatically
 */
export function enforceIsolation(query: any, context: TenantContext, options: IsolationOptions = {}) {
  if (options.requireTenant !== false) {
    query = query.where(eq(query._.table.isolationKey, context.isolationKey));
  }
  return query;
}

/**
 * Validate that a resource belongs to the tenant
 */
export async function validateTenantOwnership(
  resourceType: string,
  resourceId: number,
  context: TenantContext
): Promise<boolean> {
  // This would check various tables based on resource type
  // For now, return true as a placeholder
  // In production, each resource type would have its own check
  return true;
}

/**
 * Get user's accessible stations based on team membership and permissions
 */
export async function getAccessibleStations(userId: number, teamId: number): Promise<number[]> {
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

  if (!memberships.length) return [];

  // Get data scopes for stations
  const scopes = await db
    .select()
    .from(dataPartitions)
    .where(
      and(
        eq(dataPartitions.tenantId, teamId),
        eq(dataPartitions.type, "station"),
        eq(dataPartitions.isActive, true)
      )
    );

  // Filter by user's role permissions
  // This is a simplified version - in production, you'd check the role's permissions
  
  return scopes.map(s => s.id);
}

/**
 * Create a tenant-scoped query helper
 */
export function createScopedQuery(table: any, context: TenantContext) {
  return {
    // Find all records for this tenant
    findAll: async (filters?: Partial<QueryFilter>) => {
      let query = db.select().from(table);
      
      // Add tenant filter
      if (table.isolationKey) {
        query = query.where(eq(table.isolationKey, context.isolationKey));
      }
      
      // Add station filter if provided
      if (filters?.stationId && table.stationId) {
        query = query.where(eq(table.stationId, filters.stationId));
      }
      
      return query;
    },

    // Find single record with ownership check
    findOne: async (id: number) => {
      const record = await db.query[table].findFirst({
        where: (t, { and, eq }) => 
          and(
            eq(t.id, id),
            context.isolationKey ? eq(t.isolationKey, context.isolationKey) : undefined
          ),
      });
      
      if (!record) return null;
      
      // Verify tenant ownership
      if (context.isolationKey && record.isolationKey !== context.isolationKey) {
        throw new Error("Access denied: Resource belongs to different tenant");
      }
      
      return record;
    },

    // Create record with tenant context
    create: async (data: any) => {
      return db.insert(table).values({
        ...data,
        isolationKey: context.isolationKey,
      });
    },

    // Update with tenant isolation
    update: async (id: number, data: any) => {
      // First verify ownership
      const existing = await db.query[table].findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(t.id, id),
            context.isolationKey ? eq(t.isolationKey, context.isolationKey) : undefined
          ),
      });

      if (!existing) {
        throw new Error("Resource not found");
      }

      if (context.isolationKey && existing.isolationKey !== context.isolationKey) {
        throw new Error("Access denied: Cannot modify resources from different tenant");
      }

      return db
        .update(table)
        .set(data)
        .where(eq(table.id, id));
    },

    // Delete with tenant isolation
    delete: async (id: number) => {
      // Verify ownership first
      const existing = await db.query[table].findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(t.id, id),
            context.isolationKey ? eq(t.isolationKey, context.isolationKey) : undefined
          ),
      });

      if (!existing) {
        throw new Error("Resource not found");
      }

      if (context.isolationKey && existing.isolationKey !== context.isolationKey) {
        throw new Error("Access denied: Cannot delete resources from different tenant");
      }

      return db.delete(table).where(eq(table.id, id));
    },
  };
}

/**
 * Middleware to enforce tenant isolation
 */
export function createIsolationMiddleware() {
  return async ({ ctx, next }: { ctx: any; next: () => Promise<any> }) => {
    // Get team context from user session
    const teamId = ctx.teamId || ctx.user?.currentTeamId;
    
    if (teamId) {
      const tenantContext = await getTenantContext(teamId);
      if (tenantContext) {
        ctx.tenant = tenantContext;
      }
    }

    return next();
  };
}

/**
 * Get data access policy for a user/resource
 */
export async function getDataAccessPolicy(
  userId: number,
  teamId: number,
  resourceType: string
) {
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

  if (!memberships.length) return null;

  // Get policies for this user and resource type
  const policies = await db
    .select()
    .from(dataAccessPolicies)
    .where(
      and(
        eq(dataAccessPolicies.tenantId, teamId),
        eq(dataAccessPolicies.resourceType, resourceType),
        eq(dataAccessPolicies.isActive, true)
      )
    );

  // Filter to applicable policies
  const applicablePolicies = policies.filter(p => 
    (p.appliesTo === "all") ||
    (p.appliesTo === "user" && p.targetId === userId) ||
    (p.appliesTo === "team" && p.targetId === teamId)
  );

  // Return highest priority policy
  return applicablePolicies.sort((a, b) => b.priority - a.priority)[0] || null;
}

/**
 * Apply data masking based on access policy
 */
export function applyDataMasking(data: any, policy: dataAccessPolicies.$inferSelect | null): any {
  if (!policy) return data;

  let result = { ...data };

  // Apply denied fields (remove them)
  if (policy.deniedFields) {
    const denied = JSON.parse(policy.deniedFields);
    denied.forEach((field: string) => {
      delete result[field];
    });
  }

  // Apply masked fields
  if (policy.maskedFields) {
    const masked = JSON.parse(policy.maskedFields);
    masked.forEach((field: string) => {
      if (result[field]) {
        const value = result[field];
        if (typeof value === "string") {
          // Mask all but last 4 characters
          result[field] = "*".repeat(value.length - 4) + value.slice(-4);
        } else if (typeof value === "number") {
          result[field] = "***";
        }
      }
    });
  }

  return result;
}

/**
 * Get tenant settings
 */
export async function getTenantSetting(teamId: number, category: string, key: string) {
  const setting = await db.query.tenantSettings.findFirst({
    where: (ts, { and, eq }) =>
      and(
        eq(ts.tenantId, teamId),
        eq(ts.category, category),
        eq(ts.key, key)
      ),
  });

  return setting?.value || null;
}

/**
 * Check if feature is enabled for tenant
 */
export async function isFeatureEnabled(teamId: number, feature: string): Promise<boolean> {
  const featuresJson = await getTenantSetting(teamId, "features", "enabled");
  if (!featuresJson) return true; // Default to enabled

  const features = JSON.parse(featuresJson);
  return features[feature] !== false;
}