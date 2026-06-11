import { z } from "zod";
import { eq, and, inArray, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { stations, stationUsers, sales, inventory } from "@db/schema";

export const stationRouter = createRouter({
  // ─── CRUD: Create station ───
  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        code: z.string().min(1).max(50),
        location: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        country: z.string().optional(),
        countryCode: z.string().length(2).optional(),
        phone: z.string().optional(),
        managerName: z.string().optional(),
        taxRate: z.string().default("0"),
        receiptFooter: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [station] = await db
        .insert(stations)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .$returningId();
      // Auto-assign creator as owner
      await db.insert(stationUsers).values({
        stationId: station.id,
        userId: ctx.user.id,
        role: "owner",
      });
      return { id: station.id, ...input };
    }),

  // ─── CRUD: List stations the user has access to ───
  list: authedQuery.query(async ({ ctx }) => {
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
    const results = await db
      .select()
      .from(stations)
      .where(inArray(stations.id, stationIds));
    return results.map(s => ({
      ...s,
      userRole: memberships.find(m => m.stationId === s.id)?.role || "viewer",
    }));
  }),

  // ─── CRUD: Get single station ───
  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [membership] = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.stationId, input.id),
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      if (!membership) throw new Error("Access denied");
      const [station] = await db
        .select()
        .from(stations)
        .where(eq(stations.id, input.id));
      return station;
    }),

  // ─── CRUD: Update station ───
  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        location: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        country: z.string().optional(),
        countryCode: z.string().optional(),
        phone: z.string().optional(),
        managerName: z.string().optional(),
        status: z.enum(["active", "inactive", "maintenance"]).optional(),
        taxRate: z.string().optional(),
        receiptFooter: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(stations).set(data).where(eq(stations.id, id));
      return { success: true };
    }),

  // ─── CRUD: Delete station (soft delete via status) ───
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(stations)
        .set({ status: "inactive" })
        .where(eq(stations.id, input.id));
      return { success: true };
    }),

  // ─── Manage station access: add user ───
  addUser: authedQuery
    .input(
      z.object({
        stationId: z.number(),
        userId: z.number(),
        role: z
          .enum(["owner", "manager", "cashier", "viewer"])
          .default("viewer"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(stationUsers).values(input);
      return { success: true };
    }),

  // ─── Manage station access: remove user ───
  removeUser: authedQuery
    .input(z.object({ stationId: z.number(), userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(stationUsers)
        .set({ isActive: false })
        .where(
          and(
            eq(stationUsers.stationId, input.stationId),
            eq(stationUsers.userId, input.userId)
          )
        );
      return { success: true };
    }),

  // ─── Combined Stations View ───
  // Aggregates all data across stations the user has access to
  combined: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    // Get user's station memberships
    const memberships = await db
      .select()
      .from(stationUsers)
      .where(
        and(
          eq(stationUsers.userId, ctx.user.id),
          eq(stationUsers.isActive, true)
        )
      );
    if (memberships.length === 0) {
      return { stations: [], totalRevenue: "0", totalSales: 0, inventory: [] };
    }
    const stationIds = memberships.map(m => m.stationId);

    // All stations info
    const stationList = await db
      .select()
      .from(stations)
      .where(inArray(stations.id, stationIds));

    // Combined sales stats
    const salesAgg = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
        totalCount: sql<number>`COUNT(*)`,
        totalLiters: sql<string>`COALESCE(SUM(${sales.quantityLiters}), 0)`,
      })
      .from(sales)
      .where(inArray(sales.stationId, stationIds));

    // Sales per station
    const salesByStation = await db
      .select({
        stationId: sales.stationId,
        revenue: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
        count: sql<number>`COUNT(*)`,
        liters: sql<string>`COALESCE(SUM(${sales.quantityLiters}), 0)`,
      })
      .from(sales)
      .where(inArray(sales.stationId, stationIds))
      .groupBy(sales.stationId);

    // Combined inventory
    const inventoryList = await db
      .select()
      .from(inventory)
      .where(inArray(inventory.stationId, stationIds));

    return {
      stations: stationList,
      stationCount: stationList.length,
      totalRevenue: salesAgg[0]?.totalRevenue || "0",
      totalSales: Number(salesAgg[0]?.totalCount || 0),
      totalLiters: salesAgg[0]?.totalLiters || "0",
      salesByStation,
      inventory: inventoryList,
      activeStationIds: stationIds,
    };
  }),
});
