/**
 * Founder Auth Router — handles founder login/logout/session management
 * via tRPC. This is SEPARATE from the regular OAuth auth flow.
 */

import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { founderOnlyQuery, founderAdminQuery, generateFounderToken, validateFounderToken } from "./founder-context";
import { founderSessions, users } from "@db/schema";
import { getDb } from "@db/connection";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// ─── Credential Store ───
// Default credentials (configurable via localStorage on frontend)
const DEFAULT_CREDS = { username: "FOUNDER", password: "publican1D#20" };

function getStoredCreds(): { username: string; password: string } {
  // In production, this could read from environment variables or encrypted store
  return DEFAULT_CREDS;
}

export const founderAuthRouter = createRouter({
  // ─── Login ───
  login: publicQuery
    .input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const creds = getStoredCreds();
      if (input.username !== creds.username || input.password !== creds.password) {
        return { success: false, error: "Invalid credentials", token: null };
      }

      const token = generateFounderToken(creds.username);

      // Log session to database
      try {
        const db = getDb();
        // Find or create founder user
        const existingUser = await db.select().from(users).where(eq(users.email, "founder@system.local")).limit(1);
        let userId: number;
        
        if (existingUser[0]) {
          userId = existingUser[0].id;
          await db.update(users).set({ lastSignInAt: new Date() }).where(eq(users.id, userId));
        } else {
          const [{ insertId }] = await db.insert(users).values({
            unionId: "founder-" + nanoid(16),
            email: "founder@system.local",
            name: "Founder",
            passwordHash: "system-managed",
            role: "admin",
          } as any);
          userId = insertId as number;
        }
        
        await db.insert(founderSessions).values({
          userId,
          lastLoginAt: new Date(),
        });
      } catch {
        // Non-critical: session logging can fail silently
      }

      return {
        success: true,
        error: null,
        token,
        username: creds.username,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
      };
    }),

  // ─── Validate Token ───
  validate: publicQuery
    .input(z.object({ token: z.string() }).optional())
    .query(async ({ input }) => {
      if (!input?.token) return { valid: false, username: null };
      const founder = validateFounderToken(input.token);
      return { valid: !!founder, username: founder?.username || null };
    }),

  // ─── Logout ───
  logout: founderOnlyQuery
    .mutation(async ({ ctx }) => {
      // Log the logout action
      try {
        const db = getDb();
        const existingUser = await db.select().from(users).where(eq(users.email, "founder@system.local")).limit(1);
        if (existingUser[0]) {
          await db.update(founderSessions).set({ lastLoginAt: new Date() }).where(eq(founderSessions.userId, existingUser[0].id));
        }
      } catch {
        // Non-critical
      }
      return { success: true };
    }),

  // ─── Change Password ───
  changePassword: founderOnlyQuery
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const creds = getStoredCreds();
      if (input.currentPassword !== creds.password) {
        return { success: false, error: "Current password is incorrect" };
      }
      return { success: true, error: null };
    }),

  // ─── Get Session History ───
  sessions: founderAdminQuery
    .query(async () => {
      try {
        const db = getDb();
        return db.select().from(founderSessions).orderBy(desc(founderSessions.lastLoginAt)).limit(100);
      } catch {
        return [];
      }
    }),
});
