import { z } from "zod";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { auditLogs, founderSessions, stationUsers, auditLogEntries, authEvents, dataAccessLog } from "@db/schema";
import { auditService } from "./lib/audit-service";

export const auditRouter = createRouter({
  // ─── Log an audit event ───
  log: authedQuery
    .input(z.object({
      event: z.string().min(1),
      detail: z.string().optional(),
      severity: z.enum(["info", "success", "warning", "danger"]).default("info"),
      stationId: z.number().optional(),
      ipAddress: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [result] = await db.insert(auditLogs).values({
        ...input,
        userId: ctx.user.id,
      }).$returningId();
      return { id: result.id, ...input };
    }),

  // ─── List audit logs for user's stations ───
  list: authedQuery
    .input(z.object({
      stationId: z.number().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      if (input.stationId) {
        const [membership] = await db
          .select()
          .from(stationUsers)
          .where(and(
            eq(stationUsers.stationId, input.stationId),
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          ));
        if (!membership) throw new Error("Access denied");
        return db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.stationId, input.stationId))
          .orderBy(desc(auditLogs.createdAt))
          .limit(input.limit);
      }
      // Return all user's audit logs (personal + station)
      return db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, ctx.user.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit);
    }),

  // ─── List all audit logs (admin/founder only) ───
  listAll: adminQuery
    .input(z.object({ limit: z.number().default(500) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input?.limit || 500);
    }),

  // ─── Analytics summary ───
  summary: adminQuery.query(async () => {
    const db = getDb();
    const total = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(auditLogs);
    const bySeverity = await db
      .select({
        severity: auditLogs.severity,
        count: sql<number>`COUNT(*)`,
      })
      .from(auditLogs)
      .groupBy(auditLogs.severity);
    const byEvent = await db
      .select({
        event: auditLogs.event,
        count: sql<number>`COUNT(*)`,
      })
      .from(auditLogs)
      .groupBy(auditLogs.event);
    return { total: total[0]?.count || 0, bySeverity, byEvent };
  }),

  // ─── SOC-2 Audit Logs (Enhanced) ───
  getSOC2Logs: adminQuery
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      eventType: z.enum(["authentication", "authorization", "data_access", "data_modification", "configuration", "system"]).optional(),
      actorEmail: z.string().email().optional(),
      resourceType: z.string().optional(),
      limit: z.number().min(1).max(1000).default(100),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      
      if (input.startDate) conditions.push(gte(auditLogEntries.eventTimestamp, input.startDate));
      if (input.endDate) conditions.push(lte(auditLogEntries.eventTimestamp, input.endDate));
      if (input.eventType) conditions.push(eq(auditLogEntries.eventType, input.eventType));
      if (input.actorEmail) conditions.push(eq(auditLogEntries.actorEmail, input.actorEmail));
      if (input.resourceType) conditions.push(eq(auditLogEntries.resourceType, input.resourceType));
      
      const logs = await db
        .select()
        .from(auditLogEntries)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLogEntries.eventTimestamp))
        .limit(input.limit)
        .offset(input.offset);
      
      return logs.map(log => ({
        ...log,
        riskFactors: log.riskFactors ? JSON.parse(log.riskFactors) : null,
        tags: log.tags ? JSON.parse(log.tags) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      }));
    }),

  // ─── SOC-2 Auth Events ───
  getAuthEvents: adminQuery
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      email: z.string().email().optional(),
      success: z.boolean().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      
      if (input.startDate) conditions.push(gte(authEvents.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(authEvents.createdAt, input.endDate));
      if (input.email) conditions.push(eq(authEvents.email, input.email));
      if (input.success !== undefined) conditions.push(eq(authEvents.success, input.success));
      
      return db
        .select()
        .from(authEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(authEvents.createdAt))
        .limit(input.limit);
    }),

  // ─── Verify Audit Integrity ───
  verifyIntegrity: adminQuery
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ input }) => {
      return auditService.verifyIntegrity(input.startDate, input.endDate);
    }),

  // ─── Export Audit Logs ───
  exportLogs: adminQuery
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      format: z.enum(["json", "csv"]).default("json"),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const logs = await db
        .select()
        .from(auditLogEntries)
        .where(and(
          gte(auditLogEntries.eventTimestamp, input.startDate),
          lte(auditLogEntries.eventTimestamp, input.endDate)
        ))
        .orderBy(desc(auditLogEntries.eventTimestamp))
        .limit(10000);
      
      if (input.format === "csv") {
        const headers = ["id", "eventId", "eventType", "actorType", "actorId", "actorName", "actorEmail", "action", "actionResult", "resourceType", "resourceId", "ipAddress", "riskLevel", "eventTimestamp"];
        const rows = logs.map(log => headers.map(h => JSON.stringify(log[h as keyof typeof log] ?? "")).join(","));
        return {
          data: [headers.join(","), ...rows].join("\n"),
          contentType: "text/csv",
          filename: `audit-export-${new Date().toISOString().split("T")[0]}.csv`,
        };
      }
      
      return {
        data: logs,
        contentType: "application/json",
        filename: `audit-export-${new Date().toISOString().split("T")[0]}.json`,
      };
    }),

  // ─── Founder Session management ───
  getFounderSession: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [session] = await db
      .select()
      .from(founderSessions)
      .where(eq(founderSessions.userId, ctx.user.id));
    return session || null;
  }),

  upsertFounderSession: authedQuery
    .input(z.object({
      twoFactorEnabled: z.boolean().optional(),
      twoFactorSecret: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      passwordHash: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(founderSessions)
        .where(eq(founderSessions.userId, ctx.user.id));
      if (existing) {
        await db.update(founderSessions)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(founderSessions.id, existing.id));
        return { id: existing.id, ...input };
      }
      const [result] = await db.insert(founderSessions).values({
        ...input,
        userId: ctx.user.id,
      }).$returningId();
      return { id: result.id, ...input };
    }),
});
