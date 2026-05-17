import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { auditLogs, founderSessions, stationUsers } from "@db/schema";

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
