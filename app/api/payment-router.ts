import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  bankAccounts,
  mobileMoneyConfigs,
  additionalPaymentMethods,
  stationUsers,
} from "@db/schema";

export const paymentRouter = createRouter({
  // ──────────────────── Bank Accounts ────────────────────
  listBankAccounts: authedQuery
    .input(
      z.object({
        stationId: z.number().optional(),
        userId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      if (input.stationId) {
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
          .from(bankAccounts)
          .where(eq(bankAccounts.stationId, input.stationId));
      }
      if (input.userId && input.userId === ctx.user.id) {
        return db
          .select()
          .from(bankAccounts)
          .where(eq(bankAccounts.userId, ctx.user.id));
      }
      // Return all accessible
      const memberships = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      const ids = memberships.map(m => m.stationId);
      if (ids.length === 0) return [];
      return db
        .select()
        .from(bankAccounts)
        .where(inArray(bankAccounts.stationId, ids));
    }),

  createBankAccount: authedQuery
    .input(
      z.object({
        stationId: z.number().optional(),
        bankName: z.string().min(1),
        accountName: z.string().min(1),
        accountNumber: z.string().min(1),
        branch: z.string().optional(),
        currency: z.string().default("USD"),
        countryCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (input.stationId) {
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
      }
      const [result] = await db
        .insert(bankAccounts)
        .values({
          ...input,
          userId: input.stationId ? undefined : ctx.user.id,
        })
        .$returningId();
      return { id: result.id, ...input };
    }),

  updateBankAccount: authedQuery
    .input(
      z.object({
        id: z.number(),
        bankName: z.string().optional(),
        accountName: z.string().optional(),
        accountNumber: z.string().optional(),
        branch: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(bankAccounts).set(data).where(eq(bankAccounts.id, id));
      return { success: true };
    }),

  deleteBankAccount: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(bankAccounts).where(eq(bankAccounts.id, input.id));
      return { success: true };
    }),

  // ──────────────────── Mobile Money ────────────────────
  listMobileMoney: authedQuery
    .input(z.object({ stationId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      if (input.stationId) {
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
          .from(mobileMoneyConfigs)
          .where(eq(mobileMoneyConfigs.stationId, input.stationId));
      }
      const memberships = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      const ids = memberships.map(m => m.stationId);
      if (ids.length === 0) return [];
      return db
        .select()
        .from(mobileMoneyConfigs)
        .where(inArray(mobileMoneyConfigs.stationId, ids));
    }),

  createMobileMoney: authedQuery
    .input(
      z.object({
        stationId: z.number().optional(),
        provider: z.string().min(1),
        paybillNumber: z.string().optional(),
        accountReference: z.string().optional(),
        apiKey: z.string().optional(),
        shortCode: z.string().optional(),
        countryCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (input.stationId) {
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
      }
      const [result] = await db
        .insert(mobileMoneyConfigs)
        .values({
          ...input,
          userId: input.stationId ? undefined : ctx.user.id,
        })
        .$returningId();
      return { id: result.id, ...input };
    }),

  updateMobileMoney: authedQuery
    .input(
      z.object({
        id: z.number(),
        provider: z.string().optional(),
        paybillNumber: z.string().optional(),
        accountReference: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(mobileMoneyConfigs)
        .set(data)
        .where(eq(mobileMoneyConfigs.id, id));
      return { success: true };
    }),

  deleteMobileMoney: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .delete(mobileMoneyConfigs)
        .where(eq(mobileMoneyConfigs.id, input.id));
      return { success: true };
    }),

  // ──────────────────── Additional Payment Methods ────────────────────
  listAdditional: authedQuery
    .input(z.object({ stationId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      if (input.stationId) {
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
          .from(additionalPaymentMethods)
          .where(eq(additionalPaymentMethods.stationId, input.stationId));
      }
      const memberships = await db
        .select()
        .from(stationUsers)
        .where(
          and(
            eq(stationUsers.userId, ctx.user.id),
            eq(stationUsers.isActive, true)
          )
        );
      const ids = memberships.map(m => m.stationId);
      if (ids.length === 0) return [];
      return db
        .select()
        .from(additionalPaymentMethods)
        .where(inArray(additionalPaymentMethods.stationId, ids));
    }),

  createAdditional: authedQuery
    .input(
      z.object({
        stationId: z.number().optional(),
        name: z.string().min(1),
        config: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (input.stationId) {
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
      }
      const [result] = await db
        .insert(additionalPaymentMethods)
        .values({
          ...input,
          userId: input.stationId ? undefined : ctx.user.id,
        })
        .$returningId();
      return { id: result.id, ...input };
    }),

  updateAdditional: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        config: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(additionalPaymentMethods)
        .set(data)
        .where(eq(additionalPaymentMethods.id, id));
      return { success: true };
    }),

  deleteAdditional: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .delete(additionalPaymentMethods)
        .where(eq(additionalPaymentMethods.id, input.id));
      return { success: true };
    }),
});
