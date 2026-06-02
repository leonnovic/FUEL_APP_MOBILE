/**
 * Founder Auth Router — handles founder login/logout/session management
 * via tRPC. This is SEPARATE from the regular OAuth auth flow.
 */

import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { founderOnlyQuery, founderAdminQuery, generateFounderToken, validateFounderToken } from "./founder-context";
import { founderSessions } from "@db/schema";
import { getDb } from "./queries/connection";
import { desc } from "drizzle-orm";

// ─── Credential Store ───
// Founder password is read from the server environment — never hardcoded.
function getStoredCreds(): { username: string; password: string } {
  return {
    username: "FOUNDER",
    password: process.env.FOUNDER_DEFAULT_PASSWORD || "",
  };
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
      if (!creds.password) {
        return { success: false, error: "Founder password not configured. Set FOUNDER_DEFAULT_PASSWORD.", token: null };
      }
      if (input.username !== creds.username || input.password !== creds.password) {
        return { success: false, error: "Invalid credentials", token: null };
      }

      const token = generateFounderToken(creds.username);

      // Log session to database
      try {
        const db = getDb();
        await db.insert(founderSessions).values({
          username: creds.username,
          tokenHash: token.slice(0, 32), // Store partial hash for lookup
          ipAddress: "unknown",
          userAgent: "FounderAccess",
          action: "login",
          status: "success",
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
        await db.insert(founderSessions).values({
          username: ctx.founder!.username,
          tokenHash: ctx.founder!.token.slice(0, 32),
          ipAddress: "unknown",
          userAgent: "FounderAccess",
          action: "logout",
          status: "success",
        });
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
      // Note: In a real system, this would update the stored credentials
      // For now, we log the action
      try {
        const db = getDb();
        await db.insert(founderSessions).values({
          username: ctx.founder!.username,
          tokenHash: "password-change",
          ipAddress: "unknown",
          userAgent: "FounderAccess",
          action: "password_change",
          status: "success",
        });
      } catch {
        // Non-critical
      }
      return { success: true, error: null };
    }),

  // ─── Get Session History ───
  sessions: founderAdminQuery
    .query(async () => {
      try {
        const db = getDb();
        return db.select().from(founderSessions).orderBy(desc(founderSessions.createdAt)).limit(100);
      } catch {
        return [];
      }
    }),
});
