import { z } from "zod/v4";
import { body, query, route } from "@/lib/server/api";
import { estimateRestaurant, listRestaurantDishes } from "@/lib/services/restaurant";

export const GET = route(async ({ db, req }) => {
  const q = query(req, z.object({ q: z.string().max(80).optional() }));
  return { dishes: await listRestaurantDishes(db, q.q) };
});

export const POST = route(async ({ db, req }) =>
  estimateRestaurant(db, await body(req, z.object({ restaurantFoodId: z.number().int().positive(), portion: z.enum(["low", "typical", "high", "custom"]), customGrams: z.number().positive().max(3000).nullable().optional(), addOns: z.array(z.string().max(80)).max(10) }))),
);
