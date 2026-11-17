import { router } from "../trpc";
import { shopRouter } from "./shop";
import { adminRouter } from "./admin";

export const appRouter = router({ shop: shopRouter, admin: adminRouter });
export type AppRouter = typeof appRouter;
