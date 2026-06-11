import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { inventory, stationUsers } from "@db/schema";

export const inventoryRouter = createRouter({
  // ─── List inventory for a station ───
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
        .from(inventory)
        .where(eq(inventory.stationId, input.stationId));
    }),

  // ─── Combined inventory across all stations ───
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
      .from(inventory)
      .where(inArray(inventory.stationId, stationIds));
  }),

  // ─── Create inventory item ───
  create: authedQuery
    .input(
      z.object({
        stationId: z.number(),
        fuelType: z.enum(["petrol", "diesel", "premium", "kerosene", "lpg"]),
        currentStock: z.string().default("0"),
        capacity: z.string().default("0"),
        pricePerLiter: z.string().default("0"),
        costPerLiter: z.string().default("0"),
        supplierName: z.string().optional(),
        alertThreshold: z.string().default("500"),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
      const [result] = await db.insert(inventory).values(input).$returningId();
      return { id: result.id, ...input };
    }),

  // ─── Update inventory ───
  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        currentStock: z.string().optional(),
        capacity: z.string().optional(),
        pricePerLiter: z.string().optional(),
        costPerLiter: z.string().optional(),
        supplierName: z.string().optional(),
        alertThreshold: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      // Verify access via stationId from existing record
      const [item] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, id));
      if (!item) throw new Error("Not found");
      const [membership] = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.stationId, item.stationId),
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      if (!membership) throw new Error("Access denied");
      await db.update(inventory).set(data).where(eq(inventory.id, id));
      return { success: true };
    }),

  // ─── Delete inventory item ───
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [item] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, input.id));
      if (!item) throw new Error("Not found");
      const [membership] = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.stationId, item.stationId),
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      if (!membership) throw new Error("Access denied");
      await db.delete(inventory).where(eq(inventory.id, input.id));
      return { success: true };
    }),
});
