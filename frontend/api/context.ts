import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import { validateFounderToken } from "./founder-context";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  founder?: { username: string; token: string };
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // Try OAuth authentication first
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // OAuth auth is optional — founder auth is alternative
  }

  // Try founder token authentication (from x-founder-token header)
  try {
    const founderToken = opts.req.headers.get("x-founder-token");
    if (founderToken) {
      const founder = validateFounderToken(founderToken);
      if (founder) {
        ctx.founder = { username: founder.username, token: founderToken };
        // If no OAuth user, create a synthetic admin user so adminQuery works
        if (!ctx.user) {
          ctx.user = {
            id: 0,
            unionId: `founder_${founder.username}`,
            name: founder.username,
            email: `${founder.username.toLowerCase()}@fuelpro.local`,
            avatar: null,
            role: "admin",
            status: "active",
            countryCode: null,
            phone: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignInAt: new Date(),
          };
        }
      }
    }
  } catch {
    // Founder auth is optional
  }

  return ctx;
}
