import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

type Out = inferRouterOutputs<AppRouter>;
export type Product = Out["shop"]["products"][number];
export type Site = Out["shop"]["site"];
export type Taxon = Site["categories"][number];
export type AdminProduct = Out["admin"]["products"]["get"];
export type AdminOrder = Out["admin"]["orders"]["get"];
