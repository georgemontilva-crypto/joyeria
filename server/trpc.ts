import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { isAdmin } from "./lib/auth";

export function createContext({ req, res }: CreateExpressContextOptions) {
  return { req, res, isAdmin: isAdmin(req) };
}
type Context = ReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to the admin panel first." });
  return next();
});
