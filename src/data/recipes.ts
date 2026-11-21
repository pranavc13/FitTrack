import type { IngredientKey } from "./ingredients";
import { EXTRA_RECIPES } from "./recipes-extra";

/**
 * Typical Indian (and some international) recipes, expressed as raw ingredient quantities.
 * Quantities are representative home/restaurant preparations compiled for this app — they are
 * estimates of a "typical" version, and every recipe can be copied and edited by the user.
 * Nutrition is never entered here; it is computed from the USDA ingredient records.
 */
export interface SeedRecipe {
  slug: string;
  name: string;
  nameHi?: string;
  aliases?: string[];
  region: string;
  cuisine?: string;
  variant?: { key: string; label: string };
  style?: "home" | "restaurant" | "street" | "fast_food";
  servings: number;
  servingLabel: string;
  /** Estimated weight after cooking (water absorbed/evaporated). Omit when ≈ raw weight. */
  cookedWeightG?: number;
  prepMinutes: number;
  cookMinutes: number;
  method: string;
  tags?: string[];
  ingredients: [IngredientKey, number, string?][];
  instructions: string[];
}

export const RECIPE_VARIANT_GROUPS: Record<string, { name: string; description: string }> = {
  chole: { name: "Chole", description: "Chickpea curry — oil, gravy richness and accompaniments vary widely" },
  dal_tadka: { name: "Dal tadka", description: "Tempered lentils — ghee/oil quantity is the main difference" },
  paneer_curry: { name: "Paneer curry", description: "Home-style vs restaurant butter-masala preparations" },
  biryani: { name: "Biryani", description: "Rice-to-meat ratio, ghee and fried onions vary by style" },
  dosa: { name: "Dosa", description: "Batter base and oil used on the tawa vary by region" },
  rajma: { name: "Rajma", description: "Home vs restaurant (butter/cream finish)" },
  paratha: { name: "Paratha", description: "Plain vs stuffed; ghee/oil used while roasting" },
  poha: { name: "Poha", description: "Maharashtrian vs Indori (sev topping)" },
};

const BASE_RECIPES: SeedRecipe[] = [
  /* ---------------- Breads ---------------- */
  {
    slug: "phulka-roti", name: "Roti / Phulka (no fat)", nameHi: "रोटी / फुलका", aliases: ["chapati", "roti", "phulka", "chapathi"], region: "North Indian",
    servings: 8, servingLabel: "medium roti (~30 g cooked)", cookedWeightG: 240, prepMinutes: 10, cookMinutes: 15, method: "tawa-roasted",
    ingredients: [["atta", 200, "1⅔ cups"], ["water", 120, "½ cup"], ["salt", 1]],
    instructions: ["Knead atta with water into a soft dough; rest 15 min.", "Roll into thin discs.", "Cook on a hot tawa and puff directly over flame. No ghee."],
  },
  {
    slug: "chapati-ghee", name: "Chapati with ghee", nameHi: "घी वाली चपाती", region: "North Indian",
    servings: 8, servingLabel: "medium chapati", cookedWeightG: 260, prepMinutes: 10, cookMinutes: 15, method: "tawa-roasted",
    ingredients: [["atta", 200], ["water", 120], ["ghee", 16, "4 tsp (½ tsp each)"], ["salt", 1]],
    instructions: ["Prepare as phulka.", "Brush each with ½ tsp ghee after cooking."],
  },
  {
    slug: "aloo-paratha", name: "Aloo paratha", nameHi: "आलू पराठा", region: "North Indian", variant: { key: "paratha", label: "Potato-stuffed, ghee roasted" },
    servings: 4, servingLabel: "paratha (~130 g)", cookedWeightG: 520, prepMinutes: 20, cookMinutes: 20, method: "tawa-shallow-fried",
    ingredients: [["atta", 200], ["water", 110], ["potato", 250, "2 medium, boiled"], ["onion", 30], ["green_chili", 5], ["coriander_leaves", 5], ["garam_masala", 2], ["salt", 4], ["ghee", 20, "4 tsp"]],
    instructions: ["Mash boiled potatoes with onion, chilli, coriander and spices.", "Stuff into dough balls and roll.", "Roast on tawa with 1 tsp ghee per paratha."],
  },
  {
    slug: "plain-paratha", name: "Plain paratha (layered)", nameHi: "सादा पराठा", region: "North Indian", variant: { key: "paratha", label: "Plain layered, oil/ghee" },
    servings: 4, servingLabel: "paratha (~70 g)", cookedWeightG: 280, prepMinutes: 10, cookMinutes: 15, method: "tawa-shallow-fried",
    ingredients: [["atta", 200], ["water", 110], ["ghee", 24, "2 tbsp (layers + roasting)"], ["salt", 2]],
    instructions: ["Roll dough, smear ghee, fold into triangles/layers.", "Roast with ghee until golden on both sides."],
  },
  {
    slug: "methi-thepla", name: "Methi thepla", nameHi: "मेथी थेपला", region: "Gujarati",
    servings: 8, servingLabel: "thepla (~40 g)", cookedWeightG: 320, prepMinutes: 15, cookMinutes: 20, method: "tawa-shallow-fried",
    ingredients: [["atta", 150], ["besan", 30], ["spinach", 50, "proxy for fenugreek leaves"], ["curd", 40], ["oil", 20], ["turmeric", 1], ["chili_powder", 2], ["salt", 3], ["water", 50]],
    instructions: ["Mix flours with greens, curd, spices and oil; knead.", "Roll thin and roast with a little oil."],
  },
  {
    slug: "makki-roti", name: "Makki di roti", nameHi: "मक्की की रोटी", region: "Punjabi",
    servings: 4, servingLabel: "roti (~60 g)", cookedWeightG: 240, prepMinutes: 10, cookMinutes: 15, method: "tawa-roasted",
    ingredients: [["makki_atta", 160], ["water", 100], ["ghee", 8], ["salt", 2]],
    instructions: ["Knead maize flour with warm water.", "Pat into rotis and cook on tawa; top with a little ghee."],
  },
  {
    slug: "bajra-roti", name: "Bajra roti / bhakri", nameHi: "बाजरे की रोटी", region: "Rajasthani",
    servings: 4, servingLabel: "roti (~55 g)", cookedWeightG: 220, prepMinutes: 10, cookMinutes: 15, method: "tawa-roasted",
    ingredients: [["millet_flour", 150], ["water", 100], ["salt", 2]],
    instructions: ["Knead with warm water, pat by hand, cook on tawa and flame."],
  },
  {
    slug: "jowar-bhakri", name: "Jowar bhakri", nameHi: "ज्वार भाकरी", region: "Maharashtrian",
    servings: 4, servingLabel: "bhakri (~55 g)", cookedWeightG: 220, prepMinutes: 10, cookMinutes: 15, method: "tawa-roasted",
    ingredients: [["jowar_flour", 150], ["water", 100], ["salt", 2]],
    instructions: ["Knead with hot water, pat into discs, roast on tawa."],
  },
  {
    slug: "puri", name: "Puri (deep fried)", nameHi: "पूरी", region: "North Indian", style: "home",
    servings: 10, servingLabel: "puri (~25 g)", cookedWeightG: 250, prepMinutes: 10, cookMinutes: 15, method: "deep-fried",
    ingredients: [["atta", 150], ["water", 75], ["oil", 30, "absorbed during frying (~12% of puri weight)"], ["salt", 2]],
    instructions: ["Knead a stiff dough, roll small discs.", "Deep fry in hot oil until puffed. Oil shown is the typical amount absorbed, not used."],
  },
  {
    slug: "bhature", name: "Bhatura", nameHi: "भटूरा", region: "Punjabi", style: "restaurant",
    servings: 4, servingLabel: "bhatura (~90 g)", cookedWeightG: 360, prepMinutes: 120, cookMinutes: 15, method: "deep-fried",
    ingredients: [["maida", 200], ["curd", 50], ["water", 60], ["sugar", 5], ["oil", 50, "absorbed while frying"], ["salt", 3]],
    instructions: ["Knead maida with curd and rest 2 h.", "Roll and deep fry. Oil shown is absorbed oil."],
  },

  /* ---------------- Dals & legumes ---------------- */
  {
    slug: "dal-tadka-home", name: "Dal tadka (home style)", nameHi: "दाल तड़का", aliases: ["dal fry", "toor dal", "arhar dal", "yellow dal"], region: "North Indian", variant: { key: "dal_tadka", label: "Home style — 1 tsp ghee per serving" },
    servings: 4, servingLabel: "katori (~200 g)", cookedWeightG: 800, prepMinutes: 10, cookMinutes: 30, method: "pressure-cooked + tempered",
    ingredients: [["toor_dal", 150, "¾ cup"], ["water", 600], ["onion", 40], ["tomato", 60], ["garlic", 6], ["ginger", 5], ["green_chili", 4], ["ghee", 15, "1 tbsp"], ["cumin", 2], ["turmeric", 1], ["chili_powder", 1], ["salt", 5], ["coriander_leaves", 5]],
    instructions: ["Pressure cook dal with water and turmeric (3–4 whistles).", "Temper cumin, garlic, onion, tomato and spices in ghee.", "Add tempering to dal; simmer 5 min."],
  },
  {
    slug: "dal-tadka-dhaba", name: "Dal tadka (dhaba/restaurant)", region: "North Indian", style: "restaurant", variant: { key: "dal_tadka", label: "Restaurant — double tadka, more ghee" },
    servings: 4, servingLabel: "bowl (~220 g)", cookedWeightG: 880, prepMinutes: 10, cookMinutes: 35, method: "pressure-cooked + tempered",
    ingredients: [["toor_dal", 120], ["moong_dal", 30], ["water", 620], ["onion", 60], ["tomato", 80], ["garlic", 10], ["ginger", 6], ["ghee", 40, "~3 tbsp"], ["butter", 10], ["cumin", 3], ["chili_powder", 3], ["turmeric", 1], ["salt", 6]],
    instructions: ["Cook dals soft.", "Prepare a rich tempering with ghee; finish with a second tadka and butter."],
  },
  {
    slug: "dal-makhani", name: "Dal makhani (restaurant)", nameHi: "दाल मखनी", region: "Punjabi", style: "restaurant",
    servings: 4, servingLabel: "bowl (~200 g)", cookedWeightG: 800, prepMinutes: 480, cookMinutes: 90, method: "slow-cooked",
    ingredients: [["urad_dal", 120, "whole urad"], ["rajma", 30], ["water", 650], ["butter", 40], ["cream", 50], ["tomato", 150, "purée"], ["ginger", 8], ["garlic", 10], ["chili_powder", 3], ["garam_masala", 2], ["salt", 6]],
    instructions: ["Soak urad and rajma overnight; pressure cook.", "Simmer with tomato purée, butter and spices for 1 h+.", "Finish with cream."],
  },
  {
    slug: "dal-makhani-light", name: "Dal makhani (lighter home version)", region: "Punjabi",
    servings: 4, servingLabel: "bowl (~200 g)", cookedWeightG: 800, prepMinutes: 480, cookMinutes: 60, method: "slow-cooked",
    ingredients: [["urad_dal", 120], ["rajma", 30], ["water", 650], ["butter", 10], ["toned_milk", 60], ["tomato", 150], ["ginger", 8], ["garlic", 10], ["chili_powder", 3], ["garam_masala", 2], ["salt", 6]],
    instructions: ["As restaurant version, using 10 g butter and milk instead of cream."],
  },
  {
    slug: "moong-dal", name: "Moong dal (yellow, light)", nameHi: "मूंग दाल", region: "Pan-Indian",
    servings: 4, servingLabel: "katori (~200 g)", cookedWeightG: 800, prepMinutes: 5, cookMinutes: 25, method: "boiled + tempered",
    ingredients: [["moong_dal", 140], ["water", 620], ["tomato", 40], ["ghee", 10], ["cumin", 2], ["turmeric", 1], ["green_chili", 3], ["salt", 5]],
    instructions: ["Boil moong dal until soft.", "Temper with ghee, cumin and chilli."],
  },
  {
    slug: "chole-punjabi", name: "Chole (Punjabi restaurant style)", nameHi: "छोले", region: "Punjabi", style: "restaurant", variant: { key: "chole", label: "Punjabi restaurant — rich, oily gravy" },
    servings: 4, servingLabel: "bowl (~220 g)", cookedWeightG: 880, prepMinutes: 480, cookMinutes: 45, method: "pressure-cooked + simmered",
    ingredients: [["chana", 200, "dry kabuli chana"], ["water", 450], ["onion", 150], ["tomato", 150], ["ginger", 10], ["garlic", 10], ["oil", 45, "3 tbsp"], ["butter", 10], ["garam_masala", 8, "chole masala"], ["tea_brewed", 50, "for colour"], ["salt", 7]],
    instructions: ["Soak chana overnight; pressure cook with tea bag.", "Cook onion-tomato masala in oil until it releases fat.", "Simmer chana in masala; finish with butter."],
  },
  {
    slug: "chole-home", name: "Chole (home style)", region: "North Indian", variant: { key: "chole", label: "Home style — 1 tbsp oil" },
    servings: 4, servingLabel: "katori (~200 g)", cookedWeightG: 800, prepMinutes: 480, cookMinutes: 40, method: "pressure-cooked + simmered",
    ingredients: [["chana", 200], ["water", 430], ["onion", 100], ["tomato", 120], ["ginger", 8], ["garlic", 8], ["oil", 15], ["garam_masala", 6], ["salt", 6]],
    instructions: ["Soak and pressure cook chana.", "Cook masala in 1 tbsp oil, add chana and simmer."],
  },
  {
    slug: "rajma-home", name: "Rajma (home style)", nameHi: "राजमा", region: "Punjabi", variant: { key: "rajma", label: "Home style" },
    servings: 4, servingLabel: "katori (~200 g)", cookedWeightG: 800, prepMinutes: 480, cookMinutes: 45, method: "pressure-cooked + simmered",
    ingredients: [["rajma", 180], ["water", 470], ["onion", 100], ["tomato", 150], ["ginger", 8], ["garlic", 8], ["oil", 15], ["garam_masala", 4], ["chili_powder", 2], ["salt", 6]],
    instructions: ["Soak rajma overnight; pressure cook until creamy.", "Simmer with onion-tomato masala."],
  },
  {
    slug: "rajma-restaurant", name: "Rajma masala (restaurant)", region: "Punjabi", style: "restaurant", variant: { key: "rajma", label: "Restaurant — butter & cream finish" },
    servings: 4, servingLabel: "bowl (~220 g)", cookedWeightG: 880, prepMinutes: 480, cookMinutes: 45, method: "pressure-cooked + simmered",
    ingredients: [["rajma", 180], ["water", 470], ["onion", 120], ["tomato", 150], ["ginger", 8], ["garlic", 8], ["oil", 30], ["butter", 15], ["cream", 30], ["garam_masala", 4], ["salt", 7]],
    instructions: ["As home version with more oil, finished with butter and cream."],
  },
  {
    slug: "kadhi-pakora", name: "Kadhi pakora (Punjabi)", nameHi: "कढ़ी पकोड़ा", region: "Punjabi",
    servings: 4, servingLabel: "katori (~220 g)", cookedWeightG: 880, prepMinutes: 15, cookMinutes: 40, method: "simmered + deep-fried pakoras",
    ingredients: [["curd", 300], ["besan", 70], ["water", 450], ["onion", 60], ["oil", 30, "pakora absorption + tadka"], ["fenugreek_seeds", 1], ["turmeric", 1], ["chili_powder", 2], ["salt", 6]],
    instructions: ["Whisk curd, besan and water; simmer 30 min.", "Fry onion-besan pakoras and add.", "Temper with methi seeds and chilli."],
  },
  {
    slug: "gujarati-kadhi", name: "Gujarati kadhi", region: "Gujarati",
    servings: 4, servingLabel: "katori (~200 g)", cookedWeightG: 800, prepMinutes: 5, cookMinutes: 20, method: "simmered",
    ingredients: [["curd", 300], ["besan", 30], ["water", 450], ["sugar", 15], ["ghee", 10], ["ginger", 5], ["green_chili", 3], ["mustard_seeds", 1], ["salt", 5]],
    instructions: ["Whisk curd, besan, water; simmer with ginger and sugar.", "Temper with ghee, mustard seeds and curry leaves."],
  },
  {
    slug: "sambar", name: "Sambar", nameHi: "सांबर", region: "South Indian",
    servings: 6, servingLabel: "katori (~200 g)", cookedWeightG: 1200, prepMinutes: 15, cookMinutes: 35, method: "boiled + tempered",
    ingredients: [["toor_dal", 120], ["water", 700], ["drumstick_pods", 80], ["pumpkin", 80], ["brinjal", 60], ["onion", 60], ["tomato", 80], ["tamarind", 15], ["garam_masala", 10, "sambar powder"], ["oil", 10], ["mustard_seeds", 2], ["salt", 7]],
    instructions: ["Cook dal; boil vegetables in tamarind water with sambar powder.", "Combine and temper with mustard seeds and curry leaves."],
  },
  {
    slug: "rasam", name: "Rasam", nameHi: "रसम", region: "South Indian",
    servings: 4, servingLabel: "cup (~200 g)", cookedWeightG: 800, prepMinutes: 5, cookMinutes: 20, method: "boiled",
    ingredients: [["toor_dal", 25], ["tomato", 120], ["tamarind", 10], ["water", 650], ["black_pepper", 2], ["cumin", 2], ["garlic", 6], ["ghee", 5], ["salt", 5]],
    instructions: ["Boil tomato and tamarind water with pepper-cumin powder.", "Add thin dal water; temper with ghee."],
  },
  {
    slug: "lobia-masala", name: "Lobia masala", nameHi: "लोबिया मसाला", region: "North Indian",
    servings: 4, servingLabel: "katori (~200 g)", cookedWeightG: 800, prepMinutes: 240, cookMinutes: 35, method: "pressure-cooked + simmered",
    ingredients: [["lobia", 160], ["water", 450], ["onion", 80], ["tomato", 120], ["oil", 15], ["garam_masala", 4], ["salt", 6]],
    instructions: ["Soak and pressure cook lobia.", "Simmer in onion-tomato masala."],
  },
  {
    slug: "sprouts-salad", name: "Moong sprouts chaat / salad", nameHi: "स्प्राउट्स सलाद", region: "Pan-Indian",
    servings: 2, servingLabel: "bowl (~150 g)", prepMinutes: 10, cookMinutes: 0, method: "raw",
    ingredients: [["moong_sprouts", 200], ["onion", 30], ["tomato", 40], ["cucumber", 30], ["lemon_juice", 10], ["coriander_leaves", 5], ["salt", 2]],
    instructions: ["Toss sprouts with chopped vegetables, lemon, salt and chaat masala."],
  },
  {
    slug: "soya-chunks-curry", name: "Soya chunks curry", nameHi: "सोया चंक्स करी", region: "North Indian", tags: ["high-protein"],
    servings: 3, servingLabel: "katori (~200 g)", cookedWeightG: 600, prepMinutes: 15, cookMinutes: 25, method: "simmered",
    ingredients: [["soya_chunks", 90], ["water", 300, "absorbed + gravy"], ["onion", 80], ["tomato", 120], ["curd", 30], ["oil", 15], ["garam_masala", 4], ["salt", 5]],
    instructions: ["Boil chunks, squeeze out water.", "Cook in onion-tomato-curd masala."],
  },

  /* ---------------- Paneer & vegetables ---------------- */
  {
    slug: "paneer-bhurji", name: "Paneer bhurji", nameHi: "पनीर भुर्जी", region: "North Indian", tags: ["high-protein"],
    servings: 2, servingLabel: "plate (~150 g)", cookedWeightG: 300, prepMinutes: 5, cookMinutes: 10, method: "sautéed",
    ingredients: [["paneer", 150], ["onion", 70, "1 medium"], ["tomato", 90, "1 medium"], ["capsicum", 30], ["oil", 5, "1 tsp"], ["turmeric", 1], ["chili_powder", 1], ["garam_masala", 1], ["salt", 3], ["coriander_leaves", 4]],
    instructions: ["Sauté onion, tomato and capsicum in oil with spices.", "Add crumbled paneer; cook 2–3 min."],
  },
  {
    slug: "palak-paneer", name: "Palak paneer (home)", nameHi: "पालक पनीर", region: "North Indian", variant: { key: "paneer_curry", label: "Palak paneer — home" },
    servings: 4, servingLabel: "katori (~180 g)", cookedWeightG: 720, prepMinutes: 15, cookMinutes: 25, method: "simmered",
    ingredients: [["spinach", 400], ["paneer", 200], ["onion", 70], ["tomato", 60], ["garlic", 8], ["ginger", 6], ["oil", 15], ["cream", 15], ["garam_masala", 2], ["salt", 5]],
    instructions: ["Blanch and purée spinach.", "Cook masala in oil, add purée and paneer cubes; finish with a little cream."],
  },
  {
    slug: "paneer-butter-masala", name: "Paneer butter masala (restaurant)", nameHi: "पनीर बटर मसाला", region: "North Indian", style: "restaurant", variant: { key: "paneer_curry", label: "Restaurant butter masala" },
    servings: 3, servingLabel: "bowl (~230 g)", cookedWeightG: 690, prepMinutes: 15, cookMinutes: 30, method: "simmered",
    ingredients: [["paneer", 200], ["tomato", 250], ["onion", 60], ["cashew", 30], ["butter", 40], ["cream", 60], ["sugar", 8], ["ginger", 6], ["garlic", 6], ["chili_powder", 3], ["garam_masala", 2], ["salt", 5]],
    instructions: ["Cook tomato-onion-cashew, blend smooth.", "Simmer in butter with spices, add paneer, finish with cream."],
  },
  {
    slug: "paneer-curry-home", name: "Paneer curry (home style)", region: "North Indian", variant: { key: "paneer_curry", label: "Home style — 1 tbsp oil" },
    servings: 3, servingLabel: "katori (~200 g)", cookedWeightG: 600, prepMinutes: 10, cookMinutes: 25, method: "simmered",
    ingredients: [["paneer", 200], ["onion", 100], ["tomato", 150], ["water", 150], ["oil", 15], ["ginger", 5], ["garlic", 5], ["garam_masala", 3], ["salt", 5]],
    instructions: ["Cook onion-tomato masala in oil, add water and paneer, simmer."],
  },
  {
    slug: "shahi-paneer", name: "Shahi paneer (restaurant)", nameHi: "शाही पनीर", region: "Mughlai", style: "restaurant",
    servings: 3, servingLabel: "bowl (~220 g)", cookedWeightG: 660, prepMinutes: 15, cookMinutes: 30, method: "simmered",
    ingredients: [["paneer", 200], ["onion", 80], ["cashew", 40], ["curd", 60], ["cream", 60], ["ghee", 30], ["sugar", 5], ["cardamom", 1], ["salt", 5], ["water", 150]],
    instructions: ["Cook onion-cashew paste in ghee, add curd and spices.", "Add paneer and cream; simmer."],
  },
  {
    slug: "aloo-gobi", name: "Aloo gobi", nameHi: "आलू गोभी", region: "North Indian",
    servings: 4, servingLabel: "katori (~150 g)", cookedWeightG: 600, prepMinutes: 10, cookMinutes: 25, method: "sautéed",
    ingredients: [["cauliflower", 350], ["potato", 200], ["onion", 50], ["tomato", 60], ["oil", 20], ["turmeric", 1], ["cumin", 2], ["garam_masala", 2], ["salt", 5]],
    instructions: ["Sauté cumin and onion, add potato and cauliflower with spices.", "Cover and cook until tender."],
  },
  {
    slug: "baingan-bharta", name: "Baingan bharta", nameHi: "बैंगन भरता", region: "Punjabi",
    servings: 3, servingLabel: "katori (~150 g)", cookedWeightG: 450, prepMinutes: 15, cookMinutes: 20, method: "roasted + sautéed",
    ingredients: [["brinjal", 500, "1 large, roasted (loses moisture)"], ["onion", 80], ["tomato", 100], ["garlic", 8], ["green_chili", 4], ["oil", 15], ["salt", 4]],
    instructions: ["Roast brinjal on flame, peel and mash.", "Sauté onion, garlic, tomato; add mashed brinjal."],
  },
  {
    slug: "sarson-ka-saag", name: "Sarson ka saag", nameHi: "सरसों का साग", region: "Punjabi",
    servings: 4, servingLabel: "katori (~180 g)", cookedWeightG: 720, prepMinutes: 20, cookMinutes: 60, method: "slow-cooked",
    ingredients: [["mustard_greens", 500], ["spinach", 200], ["makki_atta", 20], ["onion", 50], ["garlic", 10], ["ginger", 8], ["ghee", 25], ["salt", 5]],
    instructions: ["Boil greens until soft, mash with maize flour.", "Temper with ghee, garlic and onion."],
  },
  {
    slug: "bhindi-masala", name: "Bhindi masala", nameHi: "भिंडी मसाला", region: "North Indian",
    servings: 3, servingLabel: "katori (~120 g)", cookedWeightG: 360, prepMinutes: 10, cookMinutes: 20, method: "stir-fried",
    ingredients: [["bhindi", 400], ["onion", 70], ["tomato", 40], ["oil", 20], ["turmeric", 1], ["coriander_powder", 2], ["chili_powder", 1], ["salt", 4]],
    instructions: ["Stir-fry sliced bhindi until no longer slimy.", "Add onion, tomato and spices."],
  },
  {
    slug: "lauki-sabzi", name: "Lauki sabzi", nameHi: "लौकी की सब्जी", region: "North Indian",
    servings: 3, servingLabel: "katori (~150 g)", cookedWeightG: 450, prepMinutes: 10, cookMinutes: 20, method: "simmered",
    ingredients: [["lauki", 500], ["tomato", 60], ["oil", 10], ["cumin", 2], ["turmeric", 1], ["salt", 4]],
    instructions: ["Temper cumin, add lauki and tomato, cover and cook until soft."],
  },
  {
    slug: "karela-sabzi", name: "Karela sabzi", nameHi: "करेले की सब्जी", region: "North Indian",
    servings: 3, servingLabel: "katori (~100 g)", cookedWeightG: 300, prepMinutes: 20, cookMinutes: 25, method: "stir-fried",
    ingredients: [["karela", 300], ["onion", 100], ["oil", 20], ["turmeric", 1], ["chili_powder", 2], ["salt", 4]],
    instructions: ["Slice and salt karela, squeeze.", "Stir-fry with onion and spices until crisp-tender."],
  },
  {
    slug: "mix-veg", name: "Mixed vegetable sabzi", nameHi: "मिक्स वेज", region: "North Indian",
    servings: 4, servingLabel: "katori (~150 g)", cookedWeightG: 600, prepMinutes: 15, cookMinutes: 20, method: "sautéed",
    ingredients: [["carrot", 100], ["green_beans", 100], ["peas", 80], ["cauliflower", 120], ["potato", 100], ["onion", 50], ["tomato", 60], ["oil", 20], ["garam_masala", 3], ["salt", 5]],
    instructions: ["Sauté masala, add vegetables, cover and cook."],
  },
  {
    slug: "avial", name: "Avial", region: "Kerala",
    servings: 4, servingLabel: "katori (~150 g)", cookedWeightG: 600, prepMinutes: 20, cookMinutes: 20, method: "simmered",
    ingredients: [["raw_banana", 100], ["drumstick_pods", 80], ["carrot", 80], ["green_beans", 80], ["pumpkin", 80], ["coconut", 80], ["curd", 60], ["coconut_oil", 10], ["green_chili", 4], ["cumin", 2], ["salt", 4]],
    instructions: ["Cook vegetables with little water.", "Add ground coconut-chilli-cumin paste and curd; finish with coconut oil."],
  },
  {
    slug: "cabbage-poriyal", name: "Cabbage poriyal", region: "Tamil Nadu",
    servings: 3, servingLabel: "katori (~120 g)", cookedWeightG: 360, prepMinutes: 10, cookMinutes: 15, method: "stir-fried",
    ingredients: [["cabbage", 350], ["desiccated_coconut", 20], ["oil", 10], ["mustard_seeds", 2], ["urad_dal", 5], ["salt", 3]],
    instructions: ["Temper mustard, urad dal and curry leaves.", "Add cabbage, cook, finish with coconut."],
  },
  {
    slug: "aloo-posto", name: "Aloo posto", region: "Bengali",
    servings: 3, servingLabel: "katori (~120 g)", cookedWeightG: 360, prepMinutes: 10, cookMinutes: 20, method: "sautéed",
    ingredients: [["potato", 350], ["poppy_seeds", 30, "posto paste"], ["mustard_oil", 20], ["green_chili", 4], ["salt", 4]],
    instructions: ["Cook potato cubes in mustard oil.", "Add poppy-seed paste and green chilli; cook until dry."],
  },
  {
    slug: "undhiyu", name: "Undhiyu", region: "Gujarati",
    servings: 6, servingLabel: "katori (~180 g)", cookedWeightG: 1080, prepMinutes: 40, cookMinutes: 50, method: "slow-cooked",
    ingredients: [["green_beans", 200, "surti papdi"], ["sweet_potato", 150], ["potato", 150], ["brinjal", 150], ["raw_banana", 100], ["arbi", 100], ["besan", 80, "methi muthia"], ["coconut", 60], ["peanuts", 30], ["oil", 70], ["sugar", 10], ["salt", 8]],
    instructions: ["Fry methi muthia.", "Layer vegetables with coconut-peanut masala and oil; slow cook."],
  },
  {
    slug: "gatte-ki-sabzi", name: "Gatte ki sabzi", region: "Rajasthani",
    servings: 4, servingLabel: "katori (~180 g)", cookedWeightG: 720, prepMinutes: 20, cookMinutes: 35, method: "boiled + simmered",
    ingredients: [["besan", 120], ["curd", 200], ["oil", 30], ["ghee", 10], ["water", 300], ["chili_powder", 3], ["turmeric", 1], ["salt", 6]],
    instructions: ["Make besan dough logs, boil and slice.", "Simmer in spiced curd gravy."],
  },

  /* ---------------- Rice dishes ---------------- */
  {
    slug: "steamed-rice", name: "Steamed rice", nameHi: "चावल", aliases: ["plain rice", "boiled rice", "jeera rice"], region: "Pan-Indian",
    servings: 4, servingLabel: "katori cooked (~150 g)", cookedWeightG: 600, prepMinutes: 5, cookMinutes: 20, method: "boiled/absorption",
    ingredients: [["rice", 200], ["water", 450, "partly absorbed"]],
    instructions: ["Rinse rice, cook with water until absorbed (~3× raw weight cooked)."],
  },
  {
    slug: "jeera-rice", name: "Jeera rice", nameHi: "जीरा राइस", region: "North Indian",
    servings: 4, servingLabel: "katori (~150 g)", cookedWeightG: 620, prepMinutes: 5, cookMinutes: 20, method: "absorption",
    ingredients: [["rice", 200], ["water", 450], ["ghee", 15], ["cumin", 3], ["salt", 3]],
    instructions: ["Temper cumin in ghee, add rice and water; cook covered."],
  },
  {
    slug: "veg-pulao", name: "Vegetable pulao", nameHi: "वेज पुलाव", region: "North Indian",
    servings: 4, servingLabel: "plate (~200 g)", cookedWeightG: 800, prepMinutes: 15, cookMinutes: 25, method: "absorption",
    ingredients: [["rice", 200], ["water", 420], ["peas", 60], ["carrot", 60], ["green_beans", 50], ["onion", 60], ["ghee", 20], ["garam_masala", 2], ["salt", 5]],
    instructions: ["Sauté whole spices and onion in ghee, add vegetables and rice.", "Cook with water until absorbed."],
  },
  {
    slug: "chicken-biryani-hyderabadi", name: "Chicken biryani (Hyderabadi dum)", nameHi: "चिकन बिरयानी", region: "Hyderabadi", style: "restaurant", variant: { key: "biryani", label: "Hyderabadi dum — restaurant" },
    servings: 4, servingLabel: "plate (~350 g)", cookedWeightG: 1400, prepMinutes: 120, cookMinutes: 60, method: "dum-cooked",
    ingredients: [["rice", 300], ["chicken", 500, "bone-in weight ≈ meat-only proxy"], ["curd", 150], ["onion", 200, "fried (birista)"], ["oil", 60], ["ghee", 40], ["ginger", 15], ["garlic", 15], ["mint", 10], ["garam_masala", 8], ["chili_powder", 5], ["salt", 10], ["water", 600]],
    instructions: ["Marinate chicken in curd and spices.", "Par-boil rice; layer with chicken, fried onions, mint and ghee.", "Seal and cook on dum."],
  },
  {
    slug: "veg-biryani", name: "Vegetable biryani", nameHi: "वेज बिरयानी", region: "Hyderabadi", variant: { key: "biryani", label: "Vegetable — home" },
    servings: 4, servingLabel: "plate (~280 g)", cookedWeightG: 1120, prepMinutes: 30, cookMinutes: 45, method: "dum-cooked",
    ingredients: [["rice", 260], ["carrot", 80], ["green_beans", 80], ["peas", 60], ["potato", 100], ["cauliflower", 80], ["curd", 100], ["onion", 120], ["ghee", 30], ["oil", 20], ["mint", 8], ["garam_masala", 6], ["salt", 8], ["water", 520]],
    instructions: ["Cook vegetables in spiced curd.", "Layer with par-boiled rice, fried onions and ghee; dum cook."],
  },
  {
    slug: "mutton-biryani", name: "Mutton biryani", region: "Lucknowi/Awadhi", style: "restaurant", variant: { key: "biryani", label: "Mutton — restaurant" },
    servings: 4, servingLabel: "plate (~350 g)", cookedWeightG: 1400, prepMinutes: 120, cookMinutes: 90, method: "dum-cooked",
    ingredients: [["rice", 300], ["mutton", 500], ["curd", 150], ["onion", 200], ["ghee", 70], ["oil", 30], ["ginger", 15], ["garlic", 15], ["garam_masala", 8], ["salt", 10], ["water", 650]],
    instructions: ["Cook marinated mutton until tender.", "Layer with rice and fried onions; dum cook."],
  },
  {
    slug: "curd-rice", name: "Curd rice", nameHi: "दही चावल", aliases: ["thayir sadam", "daddojanam"], region: "South Indian",
    servings: 3, servingLabel: "bowl (~250 g)", cookedWeightG: 750, prepMinutes: 5, cookMinutes: 20, method: "mixed",
    ingredients: [["rice", 150], ["water", 400], ["curd", 250], ["toned_milk", 50], ["oil", 5], ["mustard_seeds", 2], ["ginger", 5], ["green_chili", 3], ["salt", 4]],
    instructions: ["Mash soft-cooked rice with curd and milk.", "Temper with mustard, ginger, chilli and curry leaves."],
  },
  {
    slug: "lemon-rice", name: "Lemon rice", region: "South Indian",
    servings: 3, servingLabel: "plate (~200 g)", cookedWeightG: 600, prepMinutes: 5, cookMinutes: 15, method: "tempered",
    ingredients: [["rice", 180], ["water", 400], ["oil", 20], ["peanuts", 20], ["lemon_juice", 25], ["turmeric", 1], ["mustard_seeds", 2], ["chana", 5, "chana dal"], ["salt", 4]],
    instructions: ["Temper mustard, chana dal, peanuts and turmeric in oil.", "Toss with cooked rice and lemon juice."],
  },
  {
    slug: "bisi-bele-bath", name: "Bisi bele bath", region: "Karnataka",
    servings: 4, servingLabel: "plate (~280 g)", cookedWeightG: 1120, prepMinutes: 15, cookMinutes: 40, method: "one-pot",
    ingredients: [["rice", 150], ["toor_dal", 100], ["water", 700], ["carrot", 60], ["green_beans", 50], ["peas", 40], ["tamarind", 15], ["garam_masala", 12, "bisi bele powder"], ["ghee", 25], ["cashew", 10], ["salt", 7]],
    instructions: ["Cook rice and dal together soft.", "Add vegetables, tamarind and spice powder.", "Temper with ghee and cashews."],
  },
  {
    slug: "ven-pongal", name: "Ven pongal", region: "Tamil Nadu",
    servings: 3, servingLabel: "plate (~220 g)", cookedWeightG: 660, prepMinutes: 5, cookMinutes: 25, method: "pressure-cooked",
    ingredients: [["rice", 120], ["moong_dal", 50], ["water", 500], ["ghee", 25], ["black_pepper", 2], ["cumin", 2], ["ginger", 5], ["cashew", 10], ["salt", 4]],
    instructions: ["Pressure cook rice and moong dal soft.", "Temper pepper, cumin, ginger and cashews in ghee."],
  },
  {
    slug: "khichdi", name: "Moong dal khichdi", nameHi: "खिचड़ी", region: "Pan-Indian",
    servings: 3, servingLabel: "bowl (~250 g)", cookedWeightG: 750, prepMinutes: 5, cookMinutes: 25, method: "pressure-cooked",
    ingredients: [["rice", 100], ["moong_dal", 70], ["water", 560], ["ghee", 10], ["cumin", 2], ["turmeric", 1], ["salt", 4]],
    instructions: ["Pressure cook rice and dal with turmeric.", "Temper cumin in ghee."],
  },
  {
    slug: "rajma-chawal", name: "Rajma chawal (meal)", nameHi: "राजमा चावल", region: "Punjabi",
    servings: 1, servingLabel: "plate (rajma 200 g + rice 150 g)", prepMinutes: 0, cookMinutes: 0, method: "combination",
    ingredients: [["rajma", 45, "→ 200 g cooked rajma"], ["onion", 25], ["tomato", 38], ["oil", 4], ["water", 118], ["rice", 50, "→ 150 g cooked rice"], ["water", 100]],
    instructions: ["One plate: a katori of home rajma with a katori of steamed rice."],
  },

  /* ---------------- Breakfast & tiffin ---------------- */
  {
    slug: "poha-maharashtrian", name: "Kanda poha", nameHi: "पोहा", aliases: ["poha", "kanda pohe"], region: "Maharashtrian", variant: { key: "poha", label: "Maharashtrian kanda poha" },
    servings: 2, servingLabel: "plate (~180 g)", cookedWeightG: 360, prepMinutes: 10, cookMinutes: 10, method: "tempered",
    ingredients: [["poha", 120], ["water", 80, "absorbed on rinsing"], ["onion", 80], ["potato", 50], ["peanuts", 15], ["oil", 15], ["mustard_seeds", 2], ["turmeric", 1], ["green_chili", 4], ["lemon_juice", 8], ["sugar", 3], ["salt", 3], ["coriander_leaves", 4]],
    instructions: ["Rinse and drain poha.", "Temper mustard, peanuts, onion, potato and turmeric.", "Mix poha in, steam 2 min, add lemon and coriander."],
  },
  {
    slug: "poha-indori", name: "Indori poha (with sev)", region: "Madhya Pradesh", variant: { key: "poha", label: "Indori with sev & jeeravan" },
    servings: 2, servingLabel: "plate (~200 g)", cookedWeightG: 400, prepMinutes: 10, cookMinutes: 10, method: "steamed",
    ingredients: [["poha", 120], ["water", 80], ["onion", 50], ["oil", 15], ["sugar", 6], ["fennel", 2], ["besan", 25, "sev"], ["oil", 10, "sev frying absorption"], ["pomegranate", 20], ["salt", 3]],
    instructions: ["Steam poha with tempering and sugar.", "Top with sev, onion, pomegranate and jeeravan."],
  },
  {
    slug: "upma", name: "Rava upma", nameHi: "उपमा", region: "South Indian",
    servings: 2, servingLabel: "plate (~220 g)", cookedWeightG: 440, prepMinutes: 5, cookMinutes: 15, method: "absorption",
    ingredients: [["sooji", 100], ["water", 280], ["onion", 50], ["peas", 30], ["carrot", 30], ["oil", 15], ["mustard_seeds", 2], ["urad_dal", 5], ["green_chili", 3], ["salt", 4]],
    instructions: ["Roast sooji.", "Temper mustard and urad dal, sauté vegetables, add water; stir in sooji."],
  },
  {
    slug: "idli", name: "Idli", nameHi: "इडली", region: "South Indian",
    servings: 16, servingLabel: "idli (~45 g)", cookedWeightG: 720, prepMinutes: 720, cookMinutes: 15, method: "steamed (fermented)",
    ingredients: [["parboiled_rice", 200], ["urad_dal", 70], ["water", 350, "grinding + soaking absorbed"], ["salt", 5]],
    instructions: ["Soak rice and urad dal; grind and ferment overnight.", "Steam in idli moulds 10–12 min."],
  },
  {
    slug: "plain-dosa", name: "Plain dosa", nameHi: "डोसा", region: "South Indian", variant: { key: "dosa", label: "Plain — 1 tsp oil" },
    servings: 8, servingLabel: "dosa (~70 g)", cookedWeightG: 560, prepMinutes: 720, cookMinutes: 25, method: "tawa (fermented)",
    ingredients: [["parboiled_rice", 200], ["urad_dal", 60], ["water", 320], ["oil", 40, "1 tsp per dosa"], ["salt", 5]],
    instructions: ["Ferment batter overnight.", "Spread thin on hot tawa, drizzle oil, cook until crisp."],
  },
  {
    slug: "masala-dosa", name: "Masala dosa (restaurant)", nameHi: "मसाला डोसा", region: "South Indian", style: "restaurant", variant: { key: "dosa", label: "Masala dosa — restaurant (butter/ghee)" },
    servings: 1, servingLabel: "dosa with potato masala (~250 g)", prepMinutes: 0, cookMinutes: 10, method: "tawa",
    ingredients: [["parboiled_rice", 50], ["urad_dal", 15], ["water", 60], ["ghee", 10], ["potato", 120], ["onion", 30], ["oil", 8], ["mustard_seeds", 1], ["turmeric", 1], ["salt", 2]],
    instructions: ["Large crisp dosa roasted with ghee, filled with potato bhaji."],
  },
  {
    slug: "rava-dosa", name: "Rava dosa", region: "South Indian", variant: { key: "dosa", label: "Rava (instant)" },
    servings: 4, servingLabel: "dosa (~80 g)", cookedWeightG: 320, prepMinutes: 20, cookMinutes: 20, method: "tawa",
    ingredients: [["sooji", 80], ["rice", 40, "rice flour"], ["maida", 20], ["water", 200, "mostly evaporates"], ["onion", 30], ["oil", 30], ["cumin", 2], ["salt", 3]],
    instructions: ["Mix thin batter, rest 20 min.", "Pour on very hot tawa, drizzle oil, cook until lacy and crisp."],
  },
  {
    slug: "uttapam", name: "Onion uttapam", region: "South Indian",
    servings: 4, servingLabel: "uttapam (~120 g)", cookedWeightG: 480, prepMinutes: 720, cookMinutes: 20, method: "tawa",
    ingredients: [["parboiled_rice", 130], ["urad_dal", 40], ["water", 220], ["onion", 80], ["tomato", 40], ["oil", 20], ["salt", 4]],
    instructions: ["Spread thick dosa batter, top with onion and tomato, cook both sides with oil."],
  },
  {
    slug: "medu-vada", name: "Medu vada", region: "South Indian",
    servings: 8, servingLabel: "vada (~40 g)", cookedWeightG: 320, prepMinutes: 240, cookMinutes: 20, method: "deep-fried",
    ingredients: [["urad_dal", 150], ["water", 80], ["oil", 50, "absorbed while frying"], ["green_chili", 4], ["ginger", 5], ["black_pepper", 1], ["salt", 4]],
    instructions: ["Grind soaked urad dal to a fluffy batter.", "Shape doughnuts and deep fry."],
  },
  {
    slug: "appam", name: "Appam", region: "Kerala",
    servings: 8, servingLabel: "appam (~60 g)", cookedWeightG: 480, prepMinutes: 720, cookMinutes: 20, method: "pan (fermented)",
    ingredients: [["rice", 200], ["coconut", 60], ["water", 240], ["sugar", 10], ["salt", 3]],
    instructions: ["Grind soaked rice with coconut; ferment.", "Swirl in appachatti and cook covered."],
  },
  {
    slug: "puttu", name: "Puttu", region: "Kerala",
    servings: 2, servingLabel: "cylinder (~150 g)", cookedWeightG: 300, prepMinutes: 10, cookMinutes: 10, method: "steamed",
    ingredients: [["rice", 150, "rice flour"], ["water", 90], ["coconut", 60], ["salt", 2]],
    instructions: ["Moisten rice flour, layer with grated coconut in puttu kutti and steam."],
  },
  {
    slug: "besan-chilla", name: "Besan chilla", nameHi: "बेसन चीला", region: "North Indian", tags: ["high-protein"],
    servings: 3, servingLabel: "chilla (~80 g)", cookedWeightG: 240, prepMinutes: 10, cookMinutes: 15, method: "tawa",
    ingredients: [["besan", 100], ["water", 120], ["onion", 40], ["tomato", 30], ["green_chili", 3], ["oil", 10], ["salt", 3]],
    instructions: ["Whisk besan batter with chopped vegetables.", "Spread on tawa with a little oil; cook both sides."],
  },
  {
    slug: "moong-chilla", name: "Moong dal chilla", nameHi: "मूंग दाल चीला", region: "North Indian", tags: ["high-protein"],
    servings: 3, servingLabel: "chilla (~90 g)", cookedWeightG: 270, prepMinutes: 240, cookMinutes: 15, method: "tawa",
    ingredients: [["moong_dal", 100], ["water", 140], ["onion", 30], ["ginger", 5], ["green_chili", 3], ["oil", 10], ["salt", 3]],
    instructions: ["Soak moong dal 4 h, grind to batter.", "Cook thin pancakes on tawa with minimal oil."],
  },
  {
    slug: "dhokla", name: "Khaman dhokla", nameHi: "ढोकला", region: "Gujarati",
    servings: 4, servingLabel: "4 pieces (~100 g)", cookedWeightG: 400, prepMinutes: 15, cookMinutes: 20, method: "steamed",
    ingredients: [["besan", 120], ["water", 160], ["curd", 30], ["sugar", 15], ["lemon_juice", 10], ["oil", 15], ["mustard_seeds", 2], ["green_chili", 3], ["salt", 4]],
    instructions: ["Ferment/aerate besan batter with fruit salt; steam 15 min.", "Pour tempering of mustard, chilli and sugar water on top."],
  },
  {
    slug: "sabudana-khichdi", name: "Sabudana khichdi", nameHi: "साबूदाना खिचड़ी", region: "Maharashtrian",
    servings: 2, servingLabel: "plate (~200 g)", cookedWeightG: 400, prepMinutes: 360, cookMinutes: 15, method: "sautéed",
    ingredients: [["sabudana", 150], ["water", 100, "absorbed on soaking"], ["potato", 80], ["peanuts", 50], ["ghee", 15], ["cumin", 2], ["green_chili", 4], ["sugar", 3], ["salt", 3]],
    instructions: ["Soak sabudana 6 h.", "Sauté cumin, chilli and potato in ghee; add sabudana and crushed peanuts."],
  },
  {
    slug: "vegetable-dalia", name: "Vegetable dalia", nameHi: "दलिया", region: "North Indian",
    servings: 2, servingLabel: "bowl (~250 g)", cookedWeightG: 500, prepMinutes: 5, cookMinutes: 20, method: "pressure-cooked",
    ingredients: [["dalia", 80], ["water", 320], ["peas", 30], ["carrot", 40], ["onion", 30], ["oil", 8], ["cumin", 2], ["salt", 3]],
    instructions: ["Roast dalia, add vegetables and water; pressure cook."],
  },
  {
    slug: "masala-oats", name: "Masala oats", region: "Modern Indian",
    servings: 1, servingLabel: "bowl (~250 g)", cookedWeightG: 250, prepMinutes: 5, cookMinutes: 10, method: "simmered",
    ingredients: [["oats", 50], ["water", 180], ["onion", 20], ["tomato", 30], ["peas", 20], ["oil", 5], ["salt", 2]],
    instructions: ["Sauté vegetables, add oats and water; cook 3–4 min."],
  },
  {
    slug: "egg-bhurji", name: "Egg bhurji", nameHi: "अंडा भुर्जी", region: "North Indian", tags: ["high-protein"],
    servings: 1, servingLabel: "plate (3 eggs)", cookedWeightG: 220, prepMinutes: 5, cookMinutes: 8, method: "scrambled",
    ingredients: [["egg", 150, "3 large"], ["onion", 40], ["tomato", 40], ["green_chili", 3], ["oil", 8], ["turmeric", 1], ["salt", 2]],
    instructions: ["Sauté onion, chilli and tomato; add beaten eggs and scramble."],
  },
  {
    slug: "masala-omelette", name: "Masala omelette (2 eggs)", region: "Pan-Indian", tags: ["high-protein"],
    servings: 1, servingLabel: "omelette", cookedWeightG: 140, prepMinutes: 5, cookMinutes: 5, method: "pan-fried",
    ingredients: [["egg", 100], ["onion", 20], ["tomato", 15], ["green_chili", 2], ["oil", 5], ["salt", 1]],
    instructions: ["Whisk eggs with vegetables; cook in oiled pan."],
  },

  /* ---------------- West Indian street food ---------------- */
  {
    slug: "pav-bhaji", name: "Pav bhaji (street style)", nameHi: "पाव भाजी", region: "Maharashtrian", style: "street",
    servings: 1, servingLabel: "plate (bhaji ~250 g + 2 pav)", prepMinutes: 20, cookMinutes: 30, method: "mashed + tawa",
    ingredients: [["potato", 100], ["cauliflower", 40], ["peas", 30], ["capsicum", 30], ["tomato", 80], ["onion", 40], ["butter", 30, "bhaji + pav"], ["garam_masala", 4, "pav bhaji masala"], ["salt", 3], ["water", 50], ["pav", 80, "2 pav"], ["lemon_juice", 5]],
    instructions: ["Boil and mash vegetables; cook with masala and generous butter.", "Toast pav in butter on the tawa."],
  },
  {
    slug: "vada-pav", name: "Vada pav", nameHi: "वड़ा पाव", region: "Maharashtrian", style: "street",
    servings: 1, servingLabel: "vada pav", prepMinutes: 0, cookMinutes: 0, method: "deep-fried",
    ingredients: [["pav", 45], ["potato", 80], ["besan", 20], ["oil", 15, "absorbed"], ["garlic", 3], ["green_chili", 3], ["salt", 1]],
    instructions: ["Spiced potato ball dipped in besan batter and deep fried, served in pav with chutneys."],
  },
  {
    slug: "misal-pav", name: "Misal pav", region: "Maharashtrian", style: "street",
    servings: 1, servingLabel: "plate (misal + 2 pav)", prepMinutes: 0, cookMinutes: 0, method: "simmered",
    ingredients: [["moong_sprouts", 80, "matki/moth sprouts proxy"], ["onion", 40], ["tomato", 30], ["oil", 15], ["garam_masala", 4], ["besan", 25, "farsan"], ["oil", 10, "farsan frying"], ["water", 150], ["pav", 80], ["salt", 2]],
    instructions: ["Spicy sprouts usal with tarri, topped with farsan, onion and lemon; served with pav."],
  },
  {
    slug: "dabeli", name: "Dabeli", region: "Gujarati", style: "street",
    servings: 1, servingLabel: "dabeli", prepMinutes: 0, cookMinutes: 0, method: "assembled",
    ingredients: [["pav", 45], ["potato", 70], ["peanuts", 10], ["pomegranate", 10], ["butter", 8], ["sugar", 5], ["salt", 1]],
    instructions: ["Sweet-spicy potato filling with masala peanuts and pomegranate in butter-toasted pav."],
  },
  {
    slug: "samosa", name: "Samosa (1 large)", nameHi: "समोसा", region: "North Indian", style: "street",
    servings: 1, servingLabel: "samosa (~100 g)", cookedWeightG: 100, prepMinutes: 0, cookMinutes: 0, method: "deep-fried",
    ingredients: [["maida", 35], ["oil", 18, "absorbed while frying"], ["potato", 50], ["peas", 8], ["garam_masala", 1], ["salt", 1]],
    instructions: ["Maida pastry filled with spiced potato, deep fried."],
  },
  {
    slug: "pani-puri", name: "Pani puri (6 pieces)", nameHi: "पानी पूरी", aliases: ["golgappa", "puchka"], region: "Pan-Indian", style: "street",
    servings: 1, servingLabel: "plate of 6", prepMinutes: 0, cookMinutes: 0, method: "assembled",
    ingredients: [["sooji", 20], ["oil", 8, "puri absorption"], ["potato", 30], ["chana", 8], ["tamarind", 8], ["sugar", 8], ["mint", 3], ["water", 120], ["salt", 2]],
    instructions: ["Crisp puris filled with potato-chana and spicy-tangy pani."],
  },
  {
    slug: "bhel-puri", name: "Bhel puri", nameHi: "भेल पूरी", region: "Maharashtrian", style: "street",
    servings: 1, servingLabel: "plate (~150 g)", prepMinutes: 0, cookMinutes: 0, method: "assembled",
    ingredients: [["rice", 30, "puffed rice proxy"], ["besan", 15, "sev"], ["oil", 6], ["potato", 30], ["onion", 25], ["tomato", 20], ["tamarind", 8], ["sugar", 6], ["peanuts", 8], ["salt", 1]],
    instructions: ["Toss puffed rice with sev, potato, onion, chutneys and peanuts."],
  },
  {
    slug: "aloo-tikki", name: "Aloo tikki (2 pieces)", region: "North Indian", style: "street",
    servings: 1, servingLabel: "2 tikkis (~140 g)", prepMinutes: 0, cookMinutes: 0, method: "shallow-fried",
    ingredients: [["potato", 140], ["peas", 15], ["oil", 15], ["garam_masala", 1], ["salt", 2]],
    instructions: ["Spiced potato patties shallow fried on a tawa."],
  },

  /* ---------------- Rajasthani / East / NE ---------------- */
  {
    slug: "dal-baati-churma", name: "Dal baati churma (plate)", nameHi: "दाल बाटी चूरमा", region: "Rajasthani",
    servings: 1, servingLabel: "plate (2 baati + dal + churma)", prepMinutes: 0, cookMinutes: 0, method: "baked + ghee-dipped",
    ingredients: [["atta", 120, "2 baatis"], ["ghee", 45, "baati dip + churma"], ["toor_dal", 30], ["moong_dal", 15], ["chana", 10, "chana dal"], ["water", 200], ["sugar", 25, "churma"], ["atta", 30, "churma"], ["salt", 3]],
    instructions: ["Baked wheat baatis dipped in ghee, served with panchmel dal and sweet churma."],
  },
  {
    slug: "macher-jhol", name: "Macher jhol (fish curry)", nameHi: "माछेर झोल", region: "Bengali",
    servings: 4, servingLabel: "katori (~200 g)", cookedWeightG: 800, prepMinutes: 15, cookMinutes: 25, method: "simmered",
    ingredients: [["fish", 400], ["potato", 150], ["tomato", 80], ["mustard_oil", 30], ["turmeric", 2], ["cumin", 2], ["green_chili", 4], ["water", 300], ["salt", 6]],
    instructions: ["Fry turmeric-rubbed fish in mustard oil.", "Cook potatoes and tomato in a light cumin gravy; add fish."],
  },
  {
    slug: "kerala-fish-curry", name: "Kerala fish curry", region: "Kerala",
    servings: 4, servingLabel: "katori (~200 g)", cookedWeightG: 800, prepMinutes: 15, cookMinutes: 25, method: "simmered",
    ingredients: [["mackerel", 400], ["coconut", 120, "as coconut milk"], ["water", 250], ["onion", 60], ["tomato", 60], ["coconut_oil", 20], ["chili_powder", 4], ["tamarind", 10], ["salt", 6]],
    instructions: ["Simmer fish in spiced coconut gravy with kudampuli/tamarind."],
  },
  {
    slug: "chicken-curry-home", name: "Chicken curry (home style)", nameHi: "चिकन करी", region: "North Indian", tags: ["high-protein"],
    servings: 4, servingLabel: "katori (~200 g)", cookedWeightG: 800, prepMinutes: 15, cookMinutes: 40, method: "simmered",
    ingredients: [["chicken", 500], ["onion", 150], ["tomato", 150], ["curd", 50], ["oil", 25], ["ginger", 10], ["garlic", 10], ["garam_masala", 5], ["chili_powder", 3], ["water", 150], ["salt", 7]],
    instructions: ["Brown onions in oil, add ginger-garlic, tomato and spices.", "Add chicken and curd; simmer until cooked."],
  },
  {
    slug: "butter-chicken", name: "Butter chicken (restaurant)", nameHi: "बटर चिकन", region: "Punjabi", style: "restaurant",
    servings: 4, servingLabel: "bowl (~220 g)", cookedWeightG: 880, prepMinutes: 240, cookMinutes: 40, method: "grilled + simmered",
    ingredients: [["chicken", 500], ["curd", 80], ["tomato", 300], ["butter", 60], ["cream", 80], ["cashew", 30], ["sugar", 10], ["ginger", 10], ["garlic", 10], ["chili_powder", 5], ["salt", 7]],
    instructions: ["Marinate and grill chicken.", "Simmer in buttery tomato-cashew gravy; finish with cream."],
  },
  {
    slug: "chicken-tikka", name: "Chicken tikka (6 pieces)", nameHi: "चिकन टिक्का", region: "Punjabi", tags: ["high-protein"],
    servings: 2, servingLabel: "plate of 6 (~150 g)", cookedWeightG: 300, prepMinutes: 240, cookMinutes: 20, method: "grilled",
    ingredients: [["chicken", 400, "boneless (loses ~25% weight)"], ["curd", 60], ["oil", 10], ["lemon_juice", 10], ["ginger", 8], ["garlic", 8], ["chili_powder", 4], ["garam_masala", 2], ["salt", 5]],
    instructions: ["Marinate in spiced curd 4 h.", "Grill/bake until charred and cooked through."],
  },
  {
    slug: "chicken-65", name: "Chicken 65", region: "Hyderabadi/Chennai", style: "restaurant",
    servings: 3, servingLabel: "plate (~120 g)", cookedWeightG: 360, prepMinutes: 60, cookMinutes: 15, method: "deep-fried",
    ingredients: [["chicken", 400], ["curd", 30], ["maida", 20], ["egg", 25], ["oil", 50, "absorbed while frying"], ["chili_powder", 5], ["ginger", 6], ["garlic", 6], ["salt", 5]],
    instructions: ["Marinate chicken, coat and deep fry; toss with curry leaves and chilli."],
  },
  {
    slug: "mutton-curry", name: "Mutton curry", nameHi: "मटन करी", region: "North Indian",
    servings: 4, servingLabel: "katori (~200 g)", cookedWeightG: 800, prepMinutes: 15, cookMinutes: 75, method: "slow-cooked",
    ingredients: [["mutton", 500], ["onion", 180], ["tomato", 120], ["curd", 60], ["oil", 35], ["ginger", 12], ["garlic", 12], ["garam_masala", 6], ["water", 250], ["salt", 7]],
    instructions: ["Brown onions deeply, add mutton and spices; pressure/slow cook until tender."],
  },
  {
    slug: "keema-matar", name: "Keema matar", region: "Mughlai",
    servings: 4, servingLabel: "katori (~180 g)", cookedWeightG: 720, prepMinutes: 10, cookMinutes: 40, method: "simmered",
    ingredients: [["lamb_mince", 400], ["peas", 120], ["onion", 120], ["tomato", 100], ["oil", 20], ["ginger", 8], ["garlic", 8], ["garam_masala", 5], ["salt", 6]],
    instructions: ["Brown mince with onion-ginger-garlic, add tomato, spices and peas; cook dry."],
  },
  {
    slug: "veg-momos", name: "Veg momos (6, steamed)", nameHi: "मोमोज़", region: "Northeast/Tibetan", style: "street",
    servings: 1, servingLabel: "plate of 6 (~150 g)", prepMinutes: 0, cookMinutes: 0, method: "steamed",
    ingredients: [["maida", 60], ["water", 30], ["cabbage", 40], ["carrot", 15], ["onion", 15], ["oil", 5], ["soy_sauce", 3], ["salt", 1]],
    instructions: ["Maida wrappers filled with seasoned vegetables, steamed."],
  },
  {
    slug: "chicken-momos", name: "Chicken momos (6, steamed)", region: "Northeast/Tibetan", style: "street",
    servings: 1, servingLabel: "plate of 6 (~160 g)", prepMinutes: 0, cookMinutes: 0, method: "steamed",
    ingredients: [["maida", 60], ["water", 30], ["chicken", 70], ["onion", 15], ["cabbage", 15], ["oil", 4], ["soy_sauce", 3], ["salt", 1]],
    instructions: ["Wrappers filled with minced chicken, steamed."],
  },
  {
    slug: "veg-thukpa", name: "Veg thukpa", region: "Northeast/Tibetan",
    servings: 2, servingLabel: "bowl (~400 g)", cookedWeightG: 800, prepMinutes: 10, cookMinutes: 20, method: "boiled",
    ingredients: [["noodles", 100], ["water", 550], ["cabbage", 50], ["carrot", 40], ["onion", 30], ["spinach", 30], ["oil", 8], ["soy_sauce", 8], ["garlic", 5]],
    instructions: ["Simmer vegetables in broth, add noodles."],
  },
  {
    slug: "veg-hakka-noodles", name: "Veg hakka noodles", region: "Indo-Chinese", style: "restaurant",
    servings: 2, servingLabel: "plate (~250 g)", cookedWeightG: 500, prepMinutes: 10, cookMinutes: 15, method: "stir-fried",
    ingredients: [["noodles", 150], ["water", 150, "absorbed on boiling"], ["cabbage", 60], ["capsicum", 40], ["carrot", 40], ["onion", 30], ["oil", 25], ["soy_sauce", 10], ["ketchup", 10], ["salt", 2]],
    instructions: ["Boil noodles; toss with vegetables, sauces and oil on high heat."],
  },

  /* ---------------- Sides, drinks, sweets ---------------- */
  {
    slug: "cucumber-raita", name: "Cucumber raita", nameHi: "खीरा रायता", region: "North Indian",
    servings: 3, servingLabel: "katori (~120 g)", prepMinutes: 5, cookMinutes: 0, method: "raw",
    ingredients: [["curd", 250], ["cucumber", 100], ["cumin", 1], ["salt", 2], ["mint", 3]],
    instructions: ["Whisk curd, add grated cucumber, roasted cumin and salt."],
  },
  {
    slug: "masala-chai", name: "Masala chai (with sugar)", nameHi: "मसाला चाय", region: "Pan-Indian",
    servings: 2, servingLabel: "cup (~150 ml)", cookedWeightG: 300, prepMinutes: 2, cookMinutes: 6, method: "boiled",
    ingredients: [["water", 180], ["milk", 150], ["tea_brewed", 20, "tea leaves (brewed equivalent)"], ["sugar", 14, "2 tsp"], ["ginger", 4], ["cardamom", 1]],
    instructions: ["Boil water with tea, ginger and cardamom; add milk and sugar; simmer and strain."],
  },
  {
    slug: "chai-no-sugar", name: "Chai (no sugar)", region: "Pan-Indian",
    servings: 2, servingLabel: "cup (~150 ml)", cookedWeightG: 300, prepMinutes: 2, cookMinutes: 6, method: "boiled",
    ingredients: [["water", 180], ["toned_milk", 150], ["tea_brewed", 20], ["ginger", 3]],
    instructions: ["As masala chai without sugar."],
  },
  {
    slug: "filter-coffee", name: "South Indian filter coffee", region: "South Indian",
    servings: 1, servingLabel: "tumbler (~150 ml)", prepMinutes: 2, cookMinutes: 3, method: "brewed",
    ingredients: [["coffee_brewed", 40], ["milk", 110], ["sugar", 8]],
    instructions: ["Mix strong decoction with boiled milk and sugar."],
  },
  {
    slug: "sweet-lassi", name: "Sweet lassi", nameHi: "मीठी लस्सी", region: "Punjabi",
    servings: 1, servingLabel: "glass (~300 ml)", prepMinutes: 5, cookMinutes: 0, method: "blended",
    ingredients: [["curd", 200], ["milk", 60], ["sugar", 25], ["cardamom", 0.5]],
    instructions: ["Blend curd with milk, sugar and cardamom."],
  },
  {
    slug: "chaas", name: "Chaas / buttermilk (spiced)", nameHi: "छाछ", aliases: ["mattha", "majjige", "neer mor", "buttermilk"], region: "Pan-Indian",
    servings: 2, servingLabel: "glass (~250 ml)", prepMinutes: 5, cookMinutes: 0, method: "blended",
    ingredients: [["curd", 150], ["water", 350], ["cumin", 1], ["salt", 2], ["mint", 2], ["ginger", 2]],
    instructions: ["Whisk curd with water, roasted cumin, salt and mint."],
  },
  {
    slug: "mango-lassi", name: "Mango lassi", region: "Punjabi",
    servings: 1, servingLabel: "glass (~300 ml)", prepMinutes: 5, cookMinutes: 0, method: "blended",
    ingredients: [["curd", 150], ["mango", 100], ["milk", 50], ["sugar", 15]],
    instructions: ["Blend mango, curd, milk and sugar."],
  },
  {
    slug: "banana-protein-shake", name: "Banana peanut milkshake", region: "Modern", tags: ["high-protein"],
    servings: 1, servingLabel: "glass (~350 ml)", prepMinutes: 5, cookMinutes: 0, method: "blended",
    ingredients: [["toned_milk", 250], ["banana", 100], ["peanuts", 20], ["oats", 20]],
    instructions: ["Blend all ingredients."],
  },
  {
    slug: "kheer", name: "Rice kheer", nameHi: "खीर", region: "North Indian",
    servings: 4, servingLabel: "katori (~150 g)", cookedWeightG: 600, prepMinutes: 5, cookMinutes: 45, method: "reduced",
    ingredients: [["milk", 750, "reduces substantially"], ["rice", 40], ["sugar", 60], ["almonds", 10], ["cardamom", 1]],
    instructions: ["Simmer rice in milk, stirring, until thick; add sugar, cardamom and nuts."],
  },
  {
    slug: "sooji-halwa", name: "Sooji halwa (sheera)", nameHi: "सूजी हलवा", region: "North Indian",
    servings: 4, servingLabel: "katori (~100 g)", cookedWeightG: 400, prepMinutes: 5, cookMinutes: 15, method: "roasted",
    ingredients: [["sooji", 100], ["ghee", 60], ["sugar", 90], ["water", 250, "partly evaporates"], ["cashew", 10], ["raisins", 10]],
    instructions: ["Roast sooji in ghee, add hot water and sugar, cook until it leaves the pan."],
  },
  {
    slug: "gajar-halwa", name: "Gajar ka halwa", nameHi: "गाजर का हलवा", region: "Punjabi",
    servings: 6, servingLabel: "katori (~100 g)", cookedWeightG: 600, prepMinutes: 15, cookMinutes: 60, method: "reduced",
    ingredients: [["carrot", 1000, "loses water while cooking"], ["milk", 500], ["sugar", 120], ["ghee", 50], ["almonds", 15], ["cardamom", 1]],
    instructions: ["Cook grated carrots in milk until dry; add ghee, sugar and nuts."],
  },
  {
    slug: "besan-ladoo", name: "Besan ladoo", nameHi: "बेसन लड्डू", region: "North Indian",
    servings: 12, servingLabel: "ladoo (~35 g)", cookedWeightG: 420, prepMinutes: 5, cookMinutes: 25, method: "roasted",
    ingredients: [["besan", 200], ["ghee", 110], ["sugar", 120], ["cardamom", 1]],
    instructions: ["Roast besan in ghee until aromatic; cool, mix powdered sugar and shape."],
  },
  {
    slug: "fruit-chaat", name: "Fruit chaat", region: "Pan-Indian",
    servings: 2, servingLabel: "bowl (~200 g)", prepMinutes: 10, cookMinutes: 0, method: "raw",
    ingredients: [["apple", 100], ["banana", 80], ["papaya", 100], ["pomegranate", 50], ["guava", 60], ["lemon_juice", 5], ["salt", 1]],
    instructions: ["Toss cut fruit with lemon and chaat masala."],
  },
  {
    slug: "roasted-makhana", name: "Roasted makhana", nameHi: "भुना मखाना", region: "Pan-Indian",
    servings: 1, servingLabel: "bowl (~30 g)", prepMinutes: 0, cookMinutes: 5, method: "dry-roasted",
    ingredients: [["makhana", 30], ["ghee", 3], ["salt", 0.5], ["black_pepper", 0.3]],
    instructions: ["Roast makhana in ½ tsp ghee until crisp; season."],
  },
  {
    slug: "peanut-chutney", name: "Peanut chutney", region: "South Indian",
    servings: 4, servingLabel: "tbsp (~25 g)", prepMinutes: 5, cookMinutes: 5, method: "ground",
    ingredients: [["peanuts", 60], ["water", 40], ["green_chili", 3], ["tamarind", 3], ["oil", 3], ["salt", 1]],
    instructions: ["Roast peanuts, grind with chilli, tamarind and water; temper."],
  },
  {
    slug: "coconut-chutney", name: "Coconut chutney", region: "South Indian",
    servings: 4, servingLabel: "2 tbsp (~40 g)", prepMinutes: 5, cookMinutes: 2, method: "ground",
    ingredients: [["coconut", 100], ["chana", 15, "roasted chana dal"], ["water", 40], ["green_chili", 3], ["oil", 4], ["mustard_seeds", 1], ["salt", 2]],
    instructions: ["Grind coconut, roasted dal and chilli; temper with mustard and curry leaves."],
  },

  /* ---------------- International ---------------- */
  {
    slug: "penne-arrabbiata", name: "Penne arrabbiata", region: "Italian", cuisine: "Italian",
    servings: 2, servingLabel: "plate (~300 g)", cookedWeightG: 600, prepMinutes: 5, cookMinutes: 20, method: "boiled + sauce",
    ingredients: [["pasta", 160], ["water", 220, "absorbed on boiling"], ["tomato", 200], ["garlic", 8], ["oil", 15, "olive oil"], ["chili_powder", 1], ["cheese", 15], ["salt", 3]],
    instructions: ["Boil pasta; toss with spicy garlic-tomato sauce; top with cheese."],
  },
  {
    slug: "veg-fried-rice", name: "Veg fried rice", region: "Indo-Chinese", cuisine: "Chinese", style: "restaurant",
    servings: 2, servingLabel: "plate (~280 g)", cookedWeightG: 560, prepMinutes: 10, cookMinutes: 10, method: "stir-fried",
    ingredients: [["rice", 150], ["water", 300], ["carrot", 40], ["green_beans", 30], ["capsicum", 30], ["cabbage", 30], ["oil", 25], ["soy_sauce", 10], ["salt", 2]],
    instructions: ["Stir-fry cooked rice with vegetables and soy sauce on high heat."],
  },
  {
    slug: "greek-salad", name: "Greek-style salad", region: "Mediterranean", cuisine: "Mediterranean",
    servings: 2, servingLabel: "bowl (~200 g)", prepMinutes: 10, cookMinutes: 0, method: "raw",
    ingredients: [["cucumber", 150], ["tomato", 150], ["onion", 30], ["capsicum", 40], ["cheese", 40, "feta proxy"], ["oil", 10], ["lemon_juice", 10], ["salt", 1]],
    instructions: ["Toss vegetables with cheese, olive oil and lemon."],
  },
  {
    slug: "overnight-oats", name: "Overnight oats", region: "Modern", cuisine: "International", tags: ["high-protein"],
    servings: 1, servingLabel: "jar (~300 g)", prepMinutes: 5, cookMinutes: 0, method: "soaked",
    ingredients: [["oats", 50], ["toned_milk", 150], ["greek_yogurt", 80], ["chia", 10], ["banana", 60], ["honey", 7]],
    instructions: ["Mix oats, milk, yogurt and chia; refrigerate overnight; top with banana and honey."],
  },
];

/** Everything the seed script loads: the original set plus the extra dishes and plates. */
export const SEED_RECIPES: SeedRecipe[] = [...BASE_RECIPES, ...EXTRA_RECIPES];
