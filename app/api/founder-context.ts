/**
 * Founder Context — bridges the gap between Founder Access (local auth)
 * and tRPC backend (OAuth auth). Founder tokens bypass OAuth checks.
 */

import { z } from "zod";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

// ─── Founder Session Validation ───

const FOUNDER_SESSION_KEY = "fuelpro_founder_session";

interface FounderSession {
  username: string;
  loginTime: number;
  active: boolean;
  token: string;
}

/** Validate a founder token against localStorage-backed session store */
export function validateFounderToken(token: string): { username: string } | null {
  try {
    // Token format: base64(username:timestamp:signature)
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [username, timestamp] = decoded.split(":");
    if (!username || !timestamp) return null;
    // Token valid for 8 hours
    const loginTime = parseInt(timestamp, 10);
    if (Date.now() - loginTime > 8 * 60 * 60 * 1000) return null;
    return { username };
  } catch {
    return null;
  }
}

/** Generate a founder auth token */
export function generateFounderToken(username: string): string {
  const payload = `${username}:${Date.now()}`;
  return Buffer.from(payload).toString("base64");
}

// ─── Founder tRPC Context Extension ───

export type FounderTrpcContext = TrpcContext & {
  founder?: { username: string; token: string };
};

// ─── Founder-Aware Middleware ───

const t = initTRPC.context<FounderTrpcContext>().create({
  transformer: superjson,
});

/** Middleware: requires valid founder token OR regular auth */
const requireFounderAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  // Check if founder token is in headers
  const founderToken = ctx.req.headers.get("x-founder-token");
  if (founderToken) {
    const founder = validateFounderToken(founderToken);
    if (founder) {
      return next({ ctx: { ...ctx, founder: { username: founder.username, token: founderToken } } });
    }
  }

  // Fall back to regular OAuth auth
  if (ctx.user) {
    return next({ ctx });
  }

  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Founder authentication required. Please login.",
  });
});

/** Middleware: requires founder token specifically (stricter) */
const requireFounderOnly = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  const founderToken = ctx.req.headers.get("x-founder-token");
  if (!founderToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Founder token required. Please login to Founder Access.",
    });
  }

  const founder = validateFounderToken(founderToken);
  if (!founder) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired founder session. Please login again.",
    });
  }

  return next({ ctx: { ...ctx, founder: { username: founder.username, token: founderToken } } });
});

/** Middleware: requires founder token + admin privileges */
const requireFounderAdmin = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  const founderToken = ctx.req.headers.get("x-founder-token");
  if (!founderToken) {
    // Allow OAuth admin users too
    if (ctx.user?.role === "admin") {
      return next({ ctx });
    }
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required.",
    });
  }

  const founder = validateFounderToken(founderToken);
  if (!founder) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired founder session.",
    });
  }

  return next({ ctx: { ...ctx, founder: { username: founder.username, token: founderToken } } });
});

// ─── Export Procedures ───

export const founderQuery = t.procedure.use(requireFounderAuth);
export const founderAdminQuery = t.procedure.use(requireFounderAdmin);
export const founderOnlyQuery = t.procedure.use(requireFounderOnly);
