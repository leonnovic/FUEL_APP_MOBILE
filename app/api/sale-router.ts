import { z } from "zod";
import { eq, and, desc, sql, gte, lte, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { sales, stationUsers } from "@db/schema";

export const saleRouter = createRouter({
  // ─── Create sale ───
  create: authedQuery
    .input(
      z.object({
        stationId: z.number(),
        fuelType: z.enum(["petrol", "diesel", "premium", "kerosene", "lpg"]),
        quantityLiters: z.string(),
        pricePerLiter: z.string(),
        subtotal: z.string(),
        taxAmount: z.string().optional(),
        total: z.string(),
        paymentMethod: z.string(),
        pumpNumber: z.string().optional(),
        receiptNumber: z.string().optional(),
        notes: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Verify user has access to this station
      const [membership] = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.stationId, input.stationId),
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      if (!membership) throw new Error("Access denied to this station");
      const [result] = await db
        .insert(sales)
        .values({
          ...input,
          userId: ctx.user.id,
          taxAmount: input.taxAmount || "0",
        })
        .$returningId();
      return { id: result.id, ...input };
    }),

  // ─── List sales for a station ───
  listByStation: authedQuery
    .input(z.object({ stationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [membership] = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.stationId, input.stationId),
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      if (!membership) throw new Error("Access denied");
      return db
        .select()
        .from(sales)
        .where(eq(sales.stationId, input.stationId))
        .orderBy(desc(sales.createdAt));
    }),

  // ─── Combined sales across user's stations ───
  listCombined: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const memberships = await db
      .select()
      .from(stationUsers)
      .where(
        and(
          eq(stationUsers.userId, ctx.user.id),
          eq(stationUsers.isActive, true)
        )
      );
    if (memberships.length === 0) return [];
    const stationIds = memberships.map(m => m.stationId);
    return db
      .select()
      .from(sales)
      .where(inArray(sales.stationId, stationIds))
      .orderBy(desc(sales.createdAt));
  }),

  // ─── Daily sales summary for a station ───
  dailySummary: authedQuery
    .input(z.object({ stationId: z.number(), date: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [membership] = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.stationId, input.stationId),
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      if (!membership) throw new Error("Access denied");
      const dayStart = new Date(input.date);
      const dayEnd = new Date(input.date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      return db
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.stationId, input.stationId),
            gte(sales.createdAt, dayStart),
            lte(sales.createdAt, dayEnd)
          )
        )
        .orderBy(desc(sales.createdAt));
    }),

  // ─── Revenue analytics ───
  analytics: authedQuery
    .input(z.object({ stationId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const memberships = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      if (memberships.length === 0)
        return {
          totalRevenue: "0",
          totalSales: 0,
          avgSale: "0",
          byFuelType: [],
        };
      const stationIds = memberships.map(m => m.stationId);
      const targetIds = input.stationId ? [input.stationId] : stationIds;

      const agg = await db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
          totalSales: sql<number>`COUNT(*)`,
          avgSale: sql<string>`COALESCE(AVG(${sales.total}), 0)`,
        })
        .from(sales)
        .where(inArray(sales.stationId, targetIds));

      const byFuelType = await db
        .select({
          fuelType: sales.fuelType,
          revenue: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
          count: sql<number>`COUNT(*)`,
          liters: sql<string>`COALESCE(SUM(${sales.quantityLiters}), 0)`,
        })
        .from(sales)
        .where(inArray(sales.stationId, targetIds))
        .groupBy(sales.fuelType);

      return {
        totalRevenue: agg[0]?.totalRevenue || "0",
        totalSales: Number(agg[0]?.totalSales || 0),
        avgSale: agg[0]?.avgSale || "0",
        byFuelType,
      };
    }),

  // ─── Get sale by ID ───
  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [sale] = await db
        .select()
        .from(sales)
        .where(eq(sales.id, input.id));
      if (!sale) throw new Error("Sale not found");
      const [membership] = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.stationId, sale.stationId),
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      if (!membership) throw new Error("Access denied");
      return sale;
    }),
});
