import { INGREDIENTS, type IngredientKey } from "@/data/ingredients";

const MEAT = new Set<IngredientKey>(["chicken", "mutton", "lamb_mince", "fish", "mackerel", "prawns"]);
const FISH = new Set<IngredientKey>(["fish", "mackerel", "prawns"]);
const EGG = new Set<IngredientKey>(["egg", "egg_white"]);
const ANIMAL = new Set<IngredientKey>(["milk", "toned_milk", "skim_milk", "curd", "greek_yogurt", "paneer", "cheese", "cream", "ghee", "butter", "honey"]);
/** Jain diets exclude root vegetables, onion and garlic. */
const NOT_JAIN = new Set<IngredientKey>(["potato", "sweet_potato", "onion", "garlic", "ginger", "carrot", "beetroot", "radish", "turnip", "arbi", "cassava", "lotus_stem"]);

/** Derives diet tags from ingredient keys (never trusts a hand-written label). */
export function dietTagsFor(keys: IngredientKey[]): string[] {
  const has = (set: Set<IngredientKey>) => keys.some((k) => set.has(k));
  const tags: string[] = [];
  const meat = has(MEAT);
  const onlyFish = meat && keys.filter((k) => MEAT.has(k)).every((k) => FISH.has(k));
  if (!meat && !has(EGG)) tags.push("vegetarian");
  if (!meat && !has(EGG) && !has(ANIMAL)) tags.push("vegan");
  if (!meat) tags.push("eggetarian");
  if (onlyFish || !meat) tags.push("pescatarian");
  if (!meat && !has(EGG) && !has(NOT_JAIN)) tags.push("jain");
  tags.push("non_vegetarian");
  return tags;
}

/** Whether a food/recipe with these tags fits a user's diet preference. */
export function fitsDiet(tags: string[], pref: string): boolean {
  return pref === "non_vegetarian" ? true : tags.includes(pref);
}

export function ingredientGroup(key: IngredientKey): string {
  return INGREDIENTS[key].group;
}
