import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../app/api/router";
import { createContext } from "../app/api/context";

export default fetchRequestHandler({
  endpoint: "/api/trpc",
  req: new Request("http://localhost" + (await import("node:url")).fileURLToPath(import.meta.url)),
  router: appRouter,
  createContext,
});
