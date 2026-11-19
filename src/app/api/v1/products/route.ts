import { z } from "zod/v4";
import { body, route } from "@/lib/server/api";
import { myProducts, saveProduct } from "@/lib/services/scans";

const n = z.number().min(0).nullable().optional();
export const GET = route(async ({ db, user }) => ({ products: await myProducts(db, user.id) }));
export const POST = route(async ({ db, user, req }) => {
  const input = await body(
    req,
    z.object({
      name: z.string().trim().min(1).max(120),
      brand: z.string().max(80).nullable().optional(),
      barcode: z.string().regex(/^\d{8,14}$/).nullable().optional(),
      servingSizeG: z.number().positive().max(5000).nullable().optional(),
      servingLabel: z.string().max(80).nullable().optional(),
      isLiquid: z.boolean().optional(),
      per100: z.object({ kcal: z.number().min(0).max(902), proteinG: n, carbsG: n, fatG: n, fibreG: n, sugarG: n, satFatG: n, sodiumMg: n }),
      addedSugarG: n,
      transFatG: n,
      ingredientsText: z.string().max(4000).nullable().optional(),
      allergens: z.array(z.string().max(40)).max(20).optional(),
      scanId: z.number().int().positive().nullable().optional(),
      userConfirmed: z.boolean(),
    }),
  );
  return saveProduct(db, user.id, input);
});
