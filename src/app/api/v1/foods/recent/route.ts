import { route } from "@/lib/server/api";
import { favoriteFoods, recentFoods } from "@/lib/services/foods";

export const GET = route(async ({ db, user }) => ({ recent: await recentFoods(db, user.id), favorites: await favoriteFoods(db, user.id) }));
