import type { SeedRecipe } from "./recipes";

/**
 * More everyday Indian dishes and complete plates (e.g. chole bhature), in the same format as SEED_RECIPES:
 * representative raw-ingredient quantities, nutrition computed from USDA records. Oil/ghee amounts are what a
 * typical home or restaurant version uses; every recipe can be copied and edited by the user.
 */
export const EXTRA_RECIPES: SeedRecipe[] = [
  /* ---------------- Complete plates ---------------- */
  {
    slug: "chole-bhature", name: "Chole bhature (2 bhature + chole)", nameHi: "छोले भटूरे", aliases: ["chole bhature", "chhole bhature", "chole bhatura", "chola bhatura", "bhature chole"], region: "Punjabi", style: "restaurant",
    servings: 1, servingLabel: "plate (2 bhature ~180 g + chole ~220 g)", cookedWeightG: 430, prepMinutes: 120, cookMinutes: 45, method: "deep-fried + simmered",
    ingredients: [["maida", 100, "bhature"], ["curd", 25], ["water", 140, "dough + chole"], ["sugar", 3], ["oil", 37, "absorbed while frying + chole tadka"], ["chana", 50, "dry kabuli chana"], ["onion", 58, "gravy + salad"], ["tomato", 38], ["ginger", 3], ["garlic", 3], ["butter", 3], ["garam_masala", 2, "chole masala"], ["salt", 5], ["lemon_juice", 3]],
    instructions: ["Bhature: maida + curd dough, rested and deep fried (oil shown is absorbed).", "Chole: pressure-cooked chickpeas simmered in onion-tomato masala.", "Served with sliced onion and lemon."],
  },
  {
    slug: "chole-kulche", name: "Chole kulche (2 kulche + chole)", nameHi: "छोले कुलचे", aliases: ["chole kulche", "chhole kulche", "kulcha chole", "matar kulcha"], region: "Punjabi", style: "street",
    servings: 1, servingLabel: "plate (2 kulche + chole ~200 g)", cookedWeightG: 400, prepMinutes: 120, cookMinutes: 40, method: "tawa + simmered",
    ingredients: [["maida", 90, "kulche"], ["curd", 15], ["milk", 20], ["water", 135], ["butter", 10, "on kulche"], ["chana", 50], ["onion", 45], ["tomato", 35], ["ginger", 2], ["garlic", 2], ["oil", 8], ["garam_masala", 2], ["salt", 4], ["lemon_juice", 3]],
    instructions: ["Leavened maida kulche cooked on a tawa and brushed with butter.", "Chole simmered in a light masala.", "Topped with onion and lemon."],
  },
  {
    slug: "puri-bhaji", name: "Puri bhaji (4 puri + aloo bhaji)", nameHi: "पूरी भाजी", aliases: ["puri sabzi", "poori bhaji", "aloo puri", "poori masala"], region: "North Indian",
    servings: 1, servingLabel: "plate (4 puri + bhaji ~150 g)", cookedWeightG: 260, prepMinutes: 15, cookMinutes: 25, method: "deep-fried + sautéed",
    ingredients: [["atta", 60], ["water", 30], ["oil", 20, "absorbed + tadka"], ["potato", 120], ["onion", 20], ["tomato", 20], ["green_chili", 2], ["mustard_seeds", 1], ["turmeric", 1], ["coriander_leaves", 3], ["salt", 3]],
    instructions: ["Fry puris (absorbed oil shown).", "Boiled potatoes tempered with mustard, onion, tomato and turmeric."],
  },
  {
    slug: "dal-chawal", name: "Dal chawal (plate)", nameHi: "दाल चावल", aliases: ["dal rice", "dal bhaat", "varan bhaat"], region: "Pan-Indian",
    servings: 1, servingLabel: "plate (rice ~180 g + dal ~180 g)", cookedWeightG: 360, prepMinutes: 5, cookMinutes: 30, method: "boiled + tempered",
    ingredients: [["rice", 60], ["toor_dal", 40], ["water", 270, "absorbed/evaporated"], ["onion", 15], ["tomato", 20], ["ghee", 7], ["cumin", 1], ["turmeric", 1], ["garlic", 3], ["salt", 3]],
    instructions: ["Steamed rice with dal tadka (1½ tsp ghee)."],
  },
  {
    slug: "kadhi-chawal", name: "Kadhi chawal (plate)", nameHi: "कढ़ी चावल", aliases: ["kadhi rice", "kadhi chawal"], region: "North Indian",
    servings: 1, servingLabel: "plate (rice ~180 g + kadhi ~200 g)", cookedWeightG: 380, prepMinutes: 10, cookMinutes: 35, method: "simmered",
    ingredients: [["rice", 60], ["curd", 100], ["besan", 15], ["water", 270], ["oil", 8], ["onion", 15, "pakoras"], ["besan", 10, "pakoras"], ["oil", 6, "pakoras absorbed"], ["cumin", 1], ["fenugreek_seeds", 1], ["turmeric", 1], ["salt", 4]],
    instructions: ["Sour curd and besan simmered into kadhi with a few pakoras.", "Served over steamed rice."],
  },
  {
    slug: "chole-chawal", name: "Chole chawal (plate)", nameHi: "छोले चावल", aliases: ["chole rice", "chana chawal", "chhole chawal"], region: "Punjabi",
    servings: 1, servingLabel: "plate (rice ~180 g + chole ~200 g)", cookedWeightG: 380, prepMinutes: 480, cookMinutes: 40, method: "boiled + simmered",
    ingredients: [["rice", 60], ["chana", 50], ["water", 260], ["onion", 25], ["tomato", 30], ["ginger", 2], ["garlic", 2], ["oil", 8], ["garam_masala", 2], ["salt", 4]],
    instructions: ["Home-style chole over steamed rice."],
  },
  {
    slug: "sambar-rice", name: "Sambar rice (sambar sadam)", aliases: ["sambar sadam", "sambar chawal", "sambar annam"], region: "South Indian",
    servings: 1, servingLabel: "plate (~350 g)", cookedWeightG: 350, prepMinutes: 10, cookMinutes: 30, method: "boiled + mixed",
    ingredients: [["rice", 60], ["toor_dal", 25], ["water", 260], ["drumstick_pods", 20], ["pumpkin", 20], ["onion", 15], ["tomato", 20], ["tamarind", 5], ["oil", 6], ["ghee", 3], ["mustard_seeds", 1], ["coriander_powder", 2], ["chili_powder", 1], ["salt", 4]],
    instructions: ["Rice mixed with vegetable sambar, finished with a little ghee."],
  },
  {
    slug: "idli-sambar", name: "Idli sambar (2 idli + sambar + chutney)", nameHi: "इडली सांबर", aliases: ["idli sambar", "idli with sambar", "idly sambar"], region: "South Indian",
    servings: 1, servingLabel: "plate (2 idli + sambar ~150 g + chutney)", cookedWeightG: 280, prepMinutes: 720, cookMinutes: 30, method: "steamed + simmered",
    ingredients: [["parboiled_rice", 25], ["urad_dal", 9], ["water", 190], ["toor_dal", 15], ["drumstick_pods", 10], ["onion", 10], ["tomato", 15], ["tamarind", 3], ["oil", 4], ["coconut", 20, "chutney"], ["peanuts", 3], ["green_chili", 1], ["mustard_seeds", 1], ["salt", 4]],
    instructions: ["Two steamed idlis with sambar and coconut chutney."],
  },
  {
    slug: "masala-dosa-plate", name: "Masala dosa with sambar & chutney", aliases: ["masala dosa plate", "dosa sambar", "masala dosai"], region: "South Indian", style: "restaurant",
    servings: 1, servingLabel: "plate (dosa ~200 g + sambar + chutney)", cookedWeightG: 380, prepMinutes: 720, cookMinutes: 30, method: "tawa + simmered",
    ingredients: [["rice", 50], ["urad_dal", 15], ["water", 170], ["oil", 15, "tawa + masala"], ["potato", 100], ["onion", 30], ["mustard_seeds", 1], ["turmeric", 1], ["toor_dal", 12], ["tomato", 15], ["tamarind", 3], ["coconut", 20], ["peanuts", 3], ["salt", 5]],
    instructions: ["Crisp dosa with potato masala, served with sambar and coconut chutney."],
  },
  {
    slug: "veg-thali-north", name: "Veg thali (North Indian)", nameHi: "वेज थाली", aliases: ["veg thali", "thali", "north indian thali", "punjabi thali"], region: "North Indian", style: "restaurant",
    servings: 1, servingLabel: "thali (2 roti, rice, dal, 2 sabzi, curd, salad)", cookedWeightG: 700, prepMinutes: 20, cookMinutes: 60, method: "mixed",
    ingredients: [["atta", 60, "2 roti"], ["rice", 50], ["toor_dal", 30], ["paneer", 40], ["potato", 60], ["cauliflower", 50], ["peas", 20], ["onion", 50], ["tomato", 60], ["curd", 80], ["cucumber", 30], ["oil", 20], ["ghee", 8], ["cream", 5], ["garam_masala", 3], ["turmeric", 1], ["water", 260], ["salt", 6]],
    instructions: ["Typical restaurant thali: dal, paneer curry, dry sabzi, rice, 2 rotis, curd and salad."],
  },
  {
    slug: "rajma-rice-dhaba", name: "Rajma chawal (dhaba style)", aliases: ["rajma rice", "rajma chawal dhaba"], region: "Punjabi", style: "restaurant",
    servings: 1, servingLabel: "plate (rice ~200 g + rajma ~200 g)", cookedWeightG: 400, prepMinutes: 480, cookMinutes: 50, method: "pressure-cooked + simmered",
    ingredients: [["rice", 65], ["rajma", 50], ["water", 290], ["onion", 30], ["tomato", 40], ["ginger", 2], ["garlic", 3], ["oil", 12], ["butter", 6], ["garam_masala", 2], ["salt", 4]],
    instructions: ["Rajma simmered with butter, served over rice."],
  },

  /* ---------------- Breads ---------------- */
  {
    slug: "plain-naan", name: "Naan (plain, tandoor)", nameHi: "नान", aliases: ["naan", "nan", "tandoori naan"], region: "Punjabi", style: "restaurant",
    servings: 4, servingLabel: "naan (~90 g)", cookedWeightG: 360, prepMinutes: 120, cookMinutes: 15, method: "tandoor",
    ingredients: [["maida", 250], ["curd", 40], ["milk", 40], ["water", 70], ["oil", 10], ["sugar", 5], ["salt", 4]],
    instructions: ["Leavened maida dough slapped on the tandoor wall."],
  },
  {
    slug: "butter-naan", name: "Butter naan", nameHi: "बटर नान", aliases: ["butter nan", "makhani naan"], region: "Punjabi", style: "restaurant",
    servings: 4, servingLabel: "naan (~100 g)", cookedWeightG: 390, prepMinutes: 120, cookMinutes: 15, method: "tandoor + butter",
    ingredients: [["maida", 250], ["curd", 40], ["milk", 40], ["water", 70], ["oil", 10], ["sugar", 5], ["salt", 4], ["butter", 30, "brushed"]],
    instructions: ["Plain naan brushed generously with butter."],
  },
  {
    slug: "garlic-naan", name: "Garlic naan", nameHi: "गार्लिक नान", aliases: ["garlic nan", "lahsun naan"], region: "Punjabi", style: "restaurant",
    servings: 4, servingLabel: "naan (~100 g)", cookedWeightG: 395, prepMinutes: 120, cookMinutes: 15, method: "tandoor + butter",
    ingredients: [["maida", 250], ["curd", 40], ["milk", 40], ["water", 70], ["oil", 10], ["sugar", 5], ["salt", 4], ["garlic", 15], ["coriander_leaves", 5], ["butter", 25]],
    instructions: ["Naan topped with chopped garlic and coriander, brushed with butter."],
  },
  {
    slug: "tandoori-roti", name: "Tandoori roti", nameHi: "तंदूरी रोटी", aliases: ["tandoori roti", "tandoor roti"], region: "Punjabi", style: "restaurant",
    servings: 4, servingLabel: "roti (~60 g)", cookedWeightG: 240, prepMinutes: 20, cookMinutes: 10, method: "tandoor",
    ingredients: [["atta", 180], ["water", 100], ["salt", 3], ["butter", 8, "light brush"]],
    instructions: ["Whole-wheat dough baked on the tandoor wall, lightly buttered."],
  },
  {
    slug: "lachha-paratha", name: "Lachha paratha", nameHi: "लच्छा पराठा", aliases: ["laccha paratha", "lachha parantha"], region: "Punjabi", style: "restaurant",
    servings: 4, servingLabel: "paratha (~90 g)", cookedWeightG: 360, prepMinutes: 20, cookMinutes: 20, method: "layered + tawa",
    ingredients: [["atta", 120], ["maida", 80], ["water", 110], ["ghee", 40], ["salt", 4]],
    instructions: ["Pleated, layered paratha roasted with ghee."],
  },
  {
    slug: "paneer-paratha", name: "Paneer paratha", nameHi: "पनीर पराठा", aliases: ["paneer parantha"], region: "North Indian", variant: { key: "paratha", label: "Paneer-stuffed" },
    servings: 4, servingLabel: "paratha (~130 g)", cookedWeightG: 520, prepMinutes: 20, cookMinutes: 20, method: "tawa-shallow-fried",
    ingredients: [["atta", 200], ["water", 110], ["paneer", 160], ["onion", 30], ["green_chili", 5], ["coriander_leaves", 5], ["garam_masala", 2], ["salt", 4], ["ghee", 20]],
    instructions: ["Grated paneer filling, roasted with ghee."],
  },
  {
    slug: "gobi-paratha", name: "Gobi paratha", nameHi: "गोभी पराठा", aliases: ["gobhi paratha", "cauliflower paratha"], region: "Punjabi", variant: { key: "paratha", label: "Cauliflower-stuffed" },
    servings: 4, servingLabel: "paratha (~120 g)", cookedWeightG: 480, prepMinutes: 20, cookMinutes: 20, method: "tawa-shallow-fried",
    ingredients: [["atta", 200], ["water", 100], ["cauliflower", 200], ["green_chili", 5], ["ginger", 5], ["coriander_leaves", 5], ["salt", 4], ["ghee", 20]],
    instructions: ["Grated spiced cauliflower filling, roasted with ghee."],
  },
  {
    slug: "missi-roti", name: "Missi roti", nameHi: "मिस्सी रोटी", aliases: ["missi roti", "besan roti"], region: "Punjabi",
    servings: 4, servingLabel: "roti (~60 g)", cookedWeightG: 240, prepMinutes: 15, cookMinutes: 15, method: "tawa",
    ingredients: [["besan", 80], ["atta", 80], ["onion", 20], ["green_chili", 3], ["water", 80], ["ghee", 10], ["salt", 3]],
    instructions: ["Gram flour + wheat flour roti with onion and spices."],
  },
  {
    slug: "rumali-roti", name: "Rumali roti", aliases: ["roomali roti"], region: "Mughlai", style: "restaurant",
    servings: 4, servingLabel: "roti (~45 g)", cookedWeightG: 180, prepMinutes: 30, cookMinutes: 10, method: "inverted kadai",
    ingredients: [["maida", 80], ["atta", 40], ["milk", 30], ["water", 40], ["oil", 5], ["salt", 2]],
    instructions: ["Paper-thin roti cooked on an inverted kadai."],
  },

  /* ---------------- Paneer & veg curries ---------------- */
  {
    slug: "kadai-paneer", name: "Kadai paneer (restaurant)", nameHi: "कढ़ाई पनीर", aliases: ["kadhai paneer", "karahi paneer"], region: "Punjabi", style: "restaurant", variant: { key: "paneer_curry", label: "Kadai — capsicum, onion, kadai masala" },
    servings: 3, servingLabel: "restaurant bowl (~230 g)", cookedWeightG: 690, prepMinutes: 15, cookMinutes: 25, method: "kadai-sautéed",
    ingredients: [["paneer", 250], ["capsicum", 120], ["onion", 120], ["tomato", 180], ["ginger", 8], ["garlic", 8], ["oil", 40], ["butter", 10], ["cream", 15], ["coriander_powder", 5], ["garam_masala", 3], ["chili_powder", 3], ["water", 60], ["salt", 6]],
    instructions: ["Paneer and capsicum tossed in a spicy onion-tomato kadai masala."],
  },
  {
    slug: "matar-paneer", name: "Matar paneer", nameHi: "मटर पनीर", aliases: ["mutter paneer", "peas paneer"], region: "North Indian", variant: { key: "paneer_curry", label: "Home style with peas" },
    servings: 4, servingLabel: "katori (~180 g)", cookedWeightG: 720, prepMinutes: 15, cookMinutes: 25, method: "simmered",
    ingredients: [["paneer", 200], ["peas", 150], ["onion", 100], ["tomato", 180], ["ginger", 6], ["garlic", 6], ["oil", 20], ["garam_masala", 3], ["turmeric", 1], ["water", 200], ["salt", 6]],
    instructions: ["Paneer and peas in a home-style onion-tomato gravy."],
  },
  {
    slug: "paneer-tikka-masala", name: "Paneer tikka masala (restaurant)", aliases: ["paneer tikka masala"], region: "Punjabi", style: "restaurant", variant: { key: "paneer_curry", label: "Grilled tikka in creamy masala" },
    servings: 3, servingLabel: "restaurant bowl (~240 g)", cookedWeightG: 720, prepMinutes: 60, cookMinutes: 30, method: "grilled + simmered",
    ingredients: [["paneer", 250], ["curd", 60], ["capsicum", 60], ["onion", 120], ["tomato", 200], ["cashew", 20], ["butter", 20], ["oil", 25], ["cream", 30], ["garam_masala", 4], ["chili_powder", 3], ["water", 60], ["salt", 6]],
    instructions: ["Marinated grilled paneer in a buttery tomato-cashew gravy."],
  },
  {
    slug: "malai-kofta", name: "Malai kofta (restaurant)", nameHi: "मलाई कोफ्ता", aliases: ["malai kofta"], region: "Mughlai", style: "restaurant",
    servings: 3, servingLabel: "restaurant bowl (4 kofta + gravy, ~250 g)", cookedWeightG: 750, prepMinutes: 30, cookMinutes: 40, method: "deep-fried + simmered",
    ingredients: [["paneer", 120], ["potato", 120], ["maida", 15], ["raisins", 10], ["oil", 45, "kofta absorbed + gravy"], ["onion", 100], ["tomato", 150], ["cashew", 30], ["cream", 50], ["butter", 15], ["sugar", 5], ["garam_masala", 3], ["water", 150], ["salt", 6]],
    instructions: ["Fried paneer-potato koftas in a rich cashew-cream gravy."],
  },
  {
    slug: "dum-aloo", name: "Dum aloo", nameHi: "दम आलू", aliases: ["dum aloo", "kashmiri dum aloo", "punjabi dum aloo"], region: "Kashmiri",
    servings: 4, servingLabel: "katori (~180 g)", cookedWeightG: 720, prepMinutes: 15, cookMinutes: 35, method: "fried + slow-cooked",
    ingredients: [["potato", 450, "baby potatoes"], ["curd", 120], ["oil", 40], ["chili_powder", 4], ["fennel", 3], ["ginger", 5], ["garam_masala", 3], ["water", 150], ["salt", 6]],
    instructions: ["Fried baby potatoes slow-cooked in a spiced curd gravy."],
  },
  {
    slug: "aloo-matar", name: "Aloo matar", nameHi: "आलू मटर", aliases: ["aloo mutter", "potato peas curry"], region: "North Indian",
    servings: 4, servingLabel: "katori (~170 g)", cookedWeightG: 680, prepMinutes: 10, cookMinutes: 25, method: "simmered",
    ingredients: [["potato", 300], ["peas", 150], ["onion", 80], ["tomato", 150], ["ginger", 5], ["oil", 20], ["turmeric", 1], ["garam_masala", 3], ["water", 150], ["salt", 6]],
    instructions: ["Potatoes and peas in a thin onion-tomato gravy."],
  },
  {
    slug: "jeera-aloo", name: "Jeera aloo", nameHi: "जीरा आलू", aliases: ["jeera aloo", "aloo jeera", "cumin potatoes"], region: "North Indian",
    servings: 3, servingLabel: "katori (~120 g)", cookedWeightG: 360, prepMinutes: 10, cookMinutes: 15, method: "sautéed",
    ingredients: [["potato", 350], ["oil", 20], ["cumin", 4], ["green_chili", 3], ["turmeric", 1], ["coriander_leaves", 5], ["salt", 4]],
    instructions: ["Boiled potato cubes sautéed with cumin."],
  },
  {
    slug: "aloo-sabzi-dry", name: "Aloo sabzi (dry potato)", nameHi: "आलू की सब्जी", aliases: ["aloo sabzi", "aloo ki sabzi", "potato sabzi", "aloo bhaji", "batata bhaji", "aloo fry"], region: "Pan-Indian",
    servings: 3, servingLabel: "katori (~120 g)", cookedWeightG: 360, prepMinutes: 10, cookMinutes: 20, method: "sautéed",
    ingredients: [["potato", 330], ["onion", 40], ["oil", 18], ["mustard_seeds", 2], ["turmeric", 1], ["chili_powder", 2], ["coriander_leaves", 5], ["salt", 4]],
    instructions: ["Potatoes stir-fried with onion and spices."],
  },
  {
    slug: "aloo-palak", name: "Aloo palak", nameHi: "आलू पालक", aliases: ["palak aloo", "spinach potato"], region: "North Indian",
    servings: 3, servingLabel: "katori (~160 g)", cookedWeightG: 480, prepMinutes: 10, cookMinutes: 20, method: "sautéed",
    ingredients: [["spinach", 300], ["potato", 150], ["onion", 50], ["garlic", 6], ["oil", 18], ["cumin", 2], ["salt", 4]],
    instructions: ["Spinach and potato cooked with garlic and cumin."],
  },
  {
    slug: "veg-kurma", name: "Vegetable kurma / korma", aliases: ["veg kurma", "veg korma", "navratan korma", "mixed vegetable kurma"], region: "South Indian", style: "restaurant",
    servings: 4, servingLabel: "bowl (~200 g)", cookedWeightG: 800, prepMinutes: 15, cookMinutes: 30, method: "simmered",
    ingredients: [["carrot", 80], ["peas", 80], ["green_beans", 80], ["potato", 120], ["cauliflower", 80], ["onion", 80], ["tomato", 80], ["coconut", 50], ["cashew", 15], ["oil", 30], ["garam_masala", 3], ["water", 250], ["salt", 6]],
    instructions: ["Mixed vegetables in a coconut-cashew gravy."],
  },
  {
    slug: "mushroom-masala", name: "Mushroom masala", aliases: ["mushroom curry", "matar mushroom", "kadai mushroom"], region: "North Indian",
    servings: 3, servingLabel: "katori (~170 g)", cookedWeightG: 510, prepMinutes: 10, cookMinutes: 25, method: "sautéed + simmered",
    ingredients: [["mushroom", 250], ["peas", 60], ["onion", 100], ["tomato", 150], ["ginger", 5], ["garlic", 6], ["oil", 25], ["garam_masala", 3], ["water", 60], ["salt", 5]],
    instructions: ["Mushrooms and peas in an onion-tomato masala."],
  },
  {
    slug: "bhindi-fry", name: "Bhindi fry (kurkuri)", aliases: ["bhindi fry", "okra fry", "kurkuri bhindi"], region: "North Indian",
    servings: 3, servingLabel: "katori (~90 g)", cookedWeightG: 270, prepMinutes: 10, cookMinutes: 20, method: "pan-fried",
    ingredients: [["bhindi", 300], ["besan", 20], ["oil", 30], ["chili_powder", 2], ["salt", 4]],
    instructions: ["Okra strips tossed in besan and spices, pan-fried crisp."],
  },
  {
    slug: "methi-aloo", name: "Aloo methi", nameHi: "आलू मेथी", aliases: ["methi aloo", "aloo methi"], region: "North Indian",
    servings: 3, servingLabel: "katori (~110 g)", cookedWeightG: 330, prepMinutes: 10, cookMinutes: 20, method: "sautéed",
    ingredients: [["potato", 250], ["spinach", 100, "fenugreek leaves (proxy: spinach)"], ["oil", 18], ["garlic", 5], ["cumin", 2], ["salt", 4]],
    instructions: ["Potatoes cooked with fresh methi leaves and garlic."],
  },

  /* ---------------- Dals & legumes ---------------- */
  {
    slug: "dal-fry", name: "Dal fry", nameHi: "दाल फ्राई", aliases: ["dal fry", "yellow dal fry", "arhar dal fry", "dal", "yellow dal", "plain dal", "lentil curry"], region: "North Indian", variant: { key: "dal_tadka", label: "Dal fry — masala cooked into the dal" },
    servings: 4, servingLabel: "katori (~170 g)", cookedWeightG: 680, prepMinutes: 5, cookMinutes: 30, method: "boiled + fried masala",
    ingredients: [["toor_dal", 150], ["water", 560], ["onion", 60], ["tomato", 80], ["garlic", 8], ["ginger", 5], ["oil", 20], ["ghee", 5], ["cumin", 2], ["turmeric", 2], ["chili_powder", 2], ["salt", 6]],
    instructions: ["Toor dal simmered with a fried onion-tomato masala."],
  },
  {
    slug: "masoor-dal", name: "Masoor dal", nameHi: "मसूर दाल", aliases: ["masoor dal", "red lentil dal", "lal masoor dal"], region: "North Indian",
    servings: 4, servingLabel: "katori (~160 g)", cookedWeightG: 640, prepMinutes: 5, cookMinutes: 20, method: "boiled + tempered",
    ingredients: [["masoor_dal", 140], ["water", 520], ["onion", 40], ["tomato", 50], ["garlic", 6], ["oil", 12], ["cumin", 2], ["turmeric", 1], ["salt", 6]],
    instructions: ["Red lentils cooked soft with a cumin-garlic tadka."],
  },
  {
    slug: "chana-dal", name: "Chana dal", nameHi: "चना दाल", aliases: ["chana dal", "chane ki dal", "bengal gram dal"], region: "North Indian",
    servings: 4, servingLabel: "katori (~170 g)", cookedWeightG: 680, prepMinutes: 60, cookMinutes: 35, method: "pressure-cooked + tempered",
    ingredients: [["chana", 150, "split chana dal"], ["water", 560], ["onion", 50], ["tomato", 60], ["ginger", 5], ["ghee", 12], ["cumin", 2], ["turmeric", 1], ["salt", 6]],
    instructions: ["Split chickpeas cooked and tempered with ghee."],
  },
  {
    slug: "kala-chana-curry", name: "Kala chana curry", nameHi: "काला चना", aliases: ["kala chana", "black chana curry", "black chickpea curry", "kale chane"], region: "North Indian",
    servings: 4, servingLabel: "katori (~170 g)", cookedWeightG: 680, prepMinutes: 480, cookMinutes: 40, method: "pressure-cooked + simmered",
    ingredients: [["chana", 160, "dry kala chana"], ["water", 420], ["onion", 80], ["tomato", 100], ["ginger", 6], ["garlic", 6], ["oil", 15], ["garam_masala", 3], ["salt", 6]],
    instructions: ["Black chickpeas in a home-style onion-tomato gravy."],
  },
  {
    slug: "panchmel-dal", name: "Panchmel dal", aliases: ["panchratna dal", "mixed dal", "panchmel dal"], region: "Rajasthani",
    servings: 4, servingLabel: "katori (~170 g)", cookedWeightG: 680, prepMinutes: 10, cookMinutes: 35, method: "boiled + tempered",
    ingredients: [["toor_dal", 30], ["moong_dal", 30], ["masoor_dal", 30], ["urad_dal", 30], ["chana", 30], ["water", 560], ["onion", 40], ["tomato", 50], ["ghee", 15], ["cumin", 2], ["salt", 6]],
    instructions: ["Five lentils cooked together, tempered with ghee."],
  },
  {
    slug: "matar-chaat-ragda", name: "Ragda (white peas curry)", aliases: ["ragda", "ragda pattice", "safed matar"], region: "Maharashtrian", style: "street",
    servings: 4, servingLabel: "bowl (~180 g)", cookedWeightG: 720, prepMinutes: 480, cookMinutes: 40, method: "pressure-cooked",
    ingredients: [["chana", 200, "dried white peas (proxy: chickpeas — similar dried-legume composition)"], ["water", 450], ["onion", 50], ["tomato", 50], ["oil", 12], ["turmeric", 1], ["tamarind", 10], ["salt", 6]],
    instructions: ["Soft-cooked white peas, served with pattice or as chaat."],
  },

  /* ---------------- Non-veg ---------------- */
  {
    slug: "egg-curry", name: "Egg curry (2 eggs)", nameHi: "अंडा करी", aliases: ["egg curry", "anda curry", "egg masala"], region: "Pan-Indian",
    servings: 2, servingLabel: "bowl (2 eggs + gravy, ~200 g)", cookedWeightG: 400, prepMinutes: 10, cookMinutes: 25, method: "boiled + simmered",
    ingredients: [["egg", 200, "4 eggs"], ["onion", 80], ["tomato", 100], ["ginger", 5], ["garlic", 5], ["oil", 20], ["turmeric", 1], ["garam_masala", 2], ["chili_powder", 2], ["water", 100], ["salt", 4]],
    instructions: ["Boiled eggs simmered in an onion-tomato masala."],
  },
  {
    slug: "chicken-tikka-masala", name: "Chicken tikka masala (restaurant)", aliases: ["chicken tikka masala", "tikka masala"], region: "Punjabi", style: "restaurant",
    servings: 3, servingLabel: "restaurant bowl (~250 g)", cookedWeightG: 750, prepMinutes: 120, cookMinutes: 35, method: "grilled + simmered",
    ingredients: [["chicken", 400], ["curd", 80], ["onion", 120], ["tomato", 200], ["butter", 25], ["oil", 20], ["cream", 40], ["cashew", 15], ["garam_masala", 5], ["chili_powder", 3], ["ginger", 8], ["garlic", 8], ["salt", 7]],
    instructions: ["Grilled chicken tikka in a creamy tomato masala."],
  },
  {
    slug: "kadai-chicken", name: "Kadai chicken", aliases: ["kadhai chicken", "chicken karahi"], region: "Punjabi", style: "restaurant",
    servings: 3, servingLabel: "restaurant bowl (~230 g)", cookedWeightG: 690, prepMinutes: 15, cookMinutes: 35, method: "kadai-cooked",
    ingredients: [["chicken", 450], ["capsicum", 100], ["onion", 120], ["tomato", 180], ["ginger", 8], ["garlic", 8], ["oil", 40], ["coriander_powder", 5], ["garam_masala", 3], ["salt", 7]],
    instructions: ["Chicken and capsicum in a spicy kadai masala."],
  },
  {
    slug: "chicken-korma", name: "Chicken korma", aliases: ["chicken korma", "murgh korma"], region: "Mughlai", style: "restaurant",
    servings: 3, servingLabel: "restaurant bowl (~240 g)", cookedWeightG: 720, prepMinutes: 30, cookMinutes: 40, method: "braised",
    ingredients: [["chicken", 450], ["curd", 120], ["onion", 150], ["cashew", 25], ["almonds", 10], ["ghee", 30], ["oil", 15], ["cream", 30], ["garam_masala", 4], ["salt", 7]],
    instructions: ["Chicken braised in a curd, fried-onion and nut gravy."],
  },
  {
    slug: "mutton-rogan-josh", name: "Mutton rogan josh", aliases: ["rogan josh", "mutton rogan josh"], region: "Kashmiri", style: "restaurant",
    servings: 4, servingLabel: "bowl (~200 g)", cookedWeightG: 800, prepMinutes: 20, cookMinutes: 75, method: "slow-cooked",
    ingredients: [["mutton", 500], ["curd", 150], ["oil", 40], ["ghee", 10], ["chili_powder", 6], ["fennel", 4], ["ginger", 6], ["garam_masala", 4], ["water", 300], ["salt", 7]],
    instructions: ["Goat meat slow-cooked in a curd and Kashmiri chilli gravy."],
  },
  {
    slug: "fish-fry", name: "Fish fry (tawa)", aliases: ["fish fry", "tawa fish", "machli fry", "fried fish"], region: "Coastal",
    servings: 3, servingLabel: "2 pieces (~120 g)", cookedWeightG: 360, prepMinutes: 30, cookMinutes: 15, method: "shallow-fried",
    ingredients: [["fish", 400], ["chili_powder", 5], ["turmeric", 2], ["lemon_juice", 10], ["sooji", 20, "coating"], ["oil", 30], ["salt", 5]],
    instructions: ["Spice-marinated fish coated in rava and tawa-fried."],
  },
  {
    slug: "prawn-curry", name: "Prawn curry (coconut)", aliases: ["prawn curry", "jhinga curry", "chemmeen curry", "prawn masala"], region: "Coastal",
    servings: 3, servingLabel: "bowl (~200 g)", cookedWeightG: 600, prepMinutes: 15, cookMinutes: 25, method: "simmered",
    ingredients: [["prawns", 300], ["coconut", 80], ["onion", 80], ["tomato", 80], ["tamarind", 8], ["coconut_oil", 20], ["chili_powder", 4], ["turmeric", 1], ["water", 150], ["salt", 5]],
    instructions: ["Prawns simmered in a coconut and tamarind gravy."],
  },
  {
    slug: "egg-biryani", name: "Egg biryani", aliases: ["anda biryani", "egg biryani"], region: "Hyderabadi", style: "restaurant", variant: { key: "biryani", label: "Egg" },
    servings: 3, servingLabel: "plate (~300 g)", cookedWeightG: 900, prepMinutes: 30, cookMinutes: 45, method: "dum",
    ingredients: [["rice", 250], ["egg", 300, "6 eggs"], ["onion", 150, "fried"], ["curd", 80], ["tomato", 60], ["oil", 30], ["ghee", 20], ["garam_masala", 5], ["mint", 5], ["water", 400], ["salt", 8]],
    instructions: ["Boiled eggs layered with spiced rice and cooked on dum."],
  },
  {
    slug: "chicken-fried-rice", name: "Chicken fried rice", aliases: ["chicken fried rice", "egg chicken fried rice"], region: "Indo-Chinese", cuisine: "Indo-Chinese", style: "street",
    servings: 2, servingLabel: "plate (~300 g)", cookedWeightG: 600, prepMinutes: 10, cookMinutes: 15, method: "wok-tossed",
    ingredients: [["rice", 150], ["water", 300], ["chicken", 120], ["egg", 50], ["cabbage", 60], ["carrot", 40], ["capsicum", 30], ["oil", 30], ["soy_sauce", 15], ["salt", 4]],
    instructions: ["Cooked rice wok-tossed with chicken, egg and vegetables."],
  },
  {
    slug: "egg-fried-rice", name: "Egg fried rice", aliases: ["egg fried rice"], region: "Indo-Chinese", cuisine: "Indo-Chinese", style: "street",
    servings: 2, servingLabel: "plate (~280 g)", cookedWeightG: 560, prepMinutes: 10, cookMinutes: 15, method: "wok-tossed",
    ingredients: [["rice", 150], ["water", 300], ["egg", 100], ["cabbage", 50], ["carrot", 40], ["onion", 30], ["oil", 28], ["soy_sauce", 12], ["salt", 4]],
    instructions: ["Rice wok-tossed with scrambled egg and vegetables."],
  },
  {
    slug: "bread-omelette", name: "Bread omelette", aliases: ["bread omelette", "bread omlet", "anda bread"], region: "Street", style: "street",
    servings: 1, servingLabel: "1 (2 eggs + 2 slices)", prepMinutes: 5, cookMinutes: 8, method: "tawa",
    ingredients: [["egg", 100], ["bread_ww", 60], ["onion", 20], ["green_chili", 2], ["butter", 8], ["salt", 1]],
    instructions: ["Masala omelette cooked with two slices of bread."],
  },

  /* ---------------- Indo-Chinese ---------------- */
  {
    slug: "chilli-paneer", name: "Chilli paneer (dry)", aliases: ["chilli paneer", "chili paneer", "paneer chilli"], region: "Indo-Chinese", cuisine: "Indo-Chinese", style: "restaurant",
    servings: 2, servingLabel: "plate (~200 g)", cookedWeightG: 400, prepMinutes: 15, cookMinutes: 15, method: "fried + wok-tossed",
    ingredients: [["paneer", 200], ["maida", 20], ["capsicum", 80], ["onion", 70], ["garlic", 8], ["oil", 35, "absorbed + toss"], ["soy_sauce", 15], ["ketchup", 15], ["green_chili", 4], ["salt", 3]],
    instructions: ["Batter-fried paneer tossed with capsicum, onion and sauces."],
  },
  {
    slug: "gobi-manchurian", name: "Gobi manchurian (dry)", aliases: ["gobi manchurian", "cauliflower manchurian", "veg manchurian"], region: "Indo-Chinese", cuisine: "Indo-Chinese", style: "street",
    servings: 2, servingLabel: "plate (~180 g)", cookedWeightG: 360, prepMinutes: 15, cookMinutes: 20, method: "deep-fried + tossed",
    ingredients: [["cauliflower", 250], ["maida", 40], ["oil", 40, "absorbed"], ["onion", 40], ["garlic", 8], ["capsicum", 30], ["soy_sauce", 15], ["ketchup", 20], ["salt", 3]],
    instructions: ["Batter-fried cauliflower tossed in a garlicky soy-chilli sauce."],
  },
  {
    slug: "masala-maggi", name: "Masala instant noodles (1 pack)", aliases: ["maggi", "masala maggi", "instant noodles"], region: "Pan-Indian",
    servings: 1, servingLabel: "1 pack cooked (~230 g)", cookedWeightG: 230, prepMinutes: 2, cookMinutes: 5, method: "boiled",
    ingredients: [["noodles", 60, "instant noodle cake (proxy: egg noodles)"], ["oil", 10, "in the noodle cake"], ["water", 160, "absorbed"], ["salt", 3], ["onion", 10], ["tomato", 10]],
    instructions: ["One 70 g pack cooked with the tastemaker; onion/tomato optional."],
  },

  /* ---------------- Snacks & street food ---------------- */
  {
    slug: "onion-pakora", name: "Onion pakora / bhaji", nameHi: "प्याज़ पकोड़ा", aliases: ["onion pakoda", "kanda bhaji", "pyaaz pakora", "pakoda", "pakora"], region: "Pan-Indian", style: "street",
    servings: 4, servingLabel: "6 pieces (~90 g)", cookedWeightG: 360, prepMinutes: 10, cookMinutes: 20, method: "deep-fried",
    ingredients: [["onion", 250], ["besan", 100], ["oil", 70, "absorbed"], ["green_chili", 5], ["chili_powder", 2], ["salt", 4]],
    instructions: ["Sliced onion in spiced besan, deep fried."],
  },
  {
    slug: "batata-vada", name: "Batata vada / aloo bonda", aliases: ["batata vada", "aloo bonda", "potato bonda"], region: "Maharashtrian", style: "street",
    servings: 4, servingLabel: "2 vadas (~110 g)", cookedWeightG: 440, prepMinutes: 15, cookMinutes: 20, method: "deep-fried",
    ingredients: [["potato", 300], ["besan", 70], ["oil", 60, "absorbed"], ["green_chili", 6], ["ginger", 5], ["mustard_seeds", 2], ["turmeric", 1], ["salt", 5]],
    instructions: ["Spiced potato balls dipped in besan batter and fried."],
  },
  {
    slug: "kachori", name: "Kachori (moong dal)", nameHi: "कचौरी", aliases: ["kachori", "khasta kachori", "dal kachori"], region: "Rajasthani", style: "street",
    servings: 6, servingLabel: "kachori (~60 g)", cookedWeightG: 360, prepMinutes: 30, cookMinutes: 25, method: "deep-fried",
    ingredients: [["maida", 150], ["moong_dal", 60], ["oil", 75, "dough + absorbed"], ["water", 70], ["garam_masala", 3], ["fennel", 2], ["salt", 4]],
    instructions: ["Flaky pastry stuffed with spiced moong dal, slow fried."],
  },
  {
    slug: "sev-puri", name: "Sev puri (6 pieces)", aliases: ["sev puri", "dahi puri", "papdi chaat"], region: "Mumbai", style: "street",
    servings: 1, servingLabel: "plate (6 pieces, ~150 g)", prepMinutes: 10, cookMinutes: 0, method: "assembled",
    ingredients: [["maida", 25, "puris"], ["oil", 15, "puris + sev"], ["besan", 15, "sev"], ["potato", 40], ["onion", 20], ["tomato", 15], ["tamarind", 8], ["sugar", 6, "sweet chutney"], ["curd", 20], ["salt", 2]],
    instructions: ["Crisp puris topped with potato, onion, chutneys, curd and sev."],
  },
  {
    slug: "paneer-tikka", name: "Paneer tikka (6 pieces)", aliases: ["paneer tikka", "tandoori paneer"], region: "Punjabi", style: "restaurant",
    servings: 2, servingLabel: "6 pieces + veg (~180 g)", cookedWeightG: 360, prepMinutes: 60, cookMinutes: 15, method: "tandoor/grilled",
    ingredients: [["paneer", 250], ["curd", 60], ["capsicum", 50], ["onion", 50], ["oil", 15], ["butter", 8], ["chili_powder", 3], ["garam_masala", 2], ["lemon_juice", 8], ["salt", 4]],
    instructions: ["Marinated paneer and vegetables grilled in the tandoor."],
  },
  {
    slug: "veg-sandwich", name: "Bombay veg sandwich", aliases: ["veg sandwich", "bombay sandwich", "vegetable sandwich"], region: "Mumbai", style: "street",
    servings: 1, servingLabel: "1 sandwich (3 slices)", prepMinutes: 10, cookMinutes: 0, method: "assembled",
    ingredients: [["bread_ww", 90], ["butter", 12], ["potato", 50], ["cucumber", 30], ["tomato", 30], ["onion", 15], ["coriander_leaves", 5, "green chutney"], ["mint", 3], ["salt", 1]],
    instructions: ["Buttered bread layered with potato, vegetables and green chutney."],
  },
  {
    slug: "grilled-cheese-sandwich", name: "Grilled cheese sandwich", aliases: ["cheese sandwich", "grilled sandwich", "cheese toast"], region: "Cafe", style: "fast_food",
    servings: 1, servingLabel: "1 sandwich", prepMinutes: 5, cookMinutes: 8, method: "grilled",
    ingredients: [["bread_ww", 60], ["cheese", 40], ["butter", 12], ["capsicum", 15], ["onion", 15]],
    instructions: ["Bread with cheese and vegetables, grilled with butter."],
  },
  {
    slug: "veg-cutlet", name: "Veg cutlet (2 pieces)", aliases: ["veg cutlet", "vegetable cutlet", "aloo cutlet"], region: "Pan-Indian", style: "street",
    servings: 3, servingLabel: "2 cutlets (~110 g)", cookedWeightG: 330, prepMinutes: 20, cookMinutes: 20, method: "shallow-fried",
    ingredients: [["potato", 200], ["carrot", 40], ["peas", 40], ["green_beans", 30], ["bread_ww", 30, "crumbs"], ["oil", 30], ["garam_masala", 2], ["salt", 4]],
    instructions: ["Mashed vegetable patties coated in crumbs and shallow fried."],
  },
  {
    slug: "mirchi-bajji", name: "Mirchi bajji (2 pieces)", aliases: ["mirchi bajji", "mirchi vada", "chilli bajji"], region: "Andhra/Rajasthani", style: "street",
    servings: 2, servingLabel: "2 pieces (~120 g)", cookedWeightG: 240, prepMinutes: 10, cookMinutes: 15, method: "deep-fried",
    ingredients: [["capsicum", 120, "long green chillies (proxy: capsicum)"], ["besan", 60], ["oil", 45, "absorbed"], ["potato", 40], ["salt", 3]],
    instructions: ["Large chillies stuffed with potato, dipped in besan batter and fried."],
  },
  {
    slug: "khandvi", name: "Khandvi", aliases: ["khandvi", "suralichi vadi"], region: "Gujarati",
    servings: 3, servingLabel: "8 rolls (~100 g)", cookedWeightG: 300, prepMinutes: 10, cookMinutes: 20, method: "cooked batter, rolled",
    ingredients: [["besan", 80], ["curd", 120], ["water", 120], ["oil", 12], ["mustard_seeds", 2], ["sesame", 4], ["desiccated_coconut", 6], ["salt", 4]],
    instructions: ["Besan-curd batter cooked, spread thin, rolled and tempered."],
  },
  {
    slug: "sabudana-vada", name: "Sabudana vada (2 pieces)", aliases: ["sabudana vada", "sago vada"], region: "Maharashtrian", style: "street",
    servings: 3, servingLabel: "2 vadas (~100 g)", cookedWeightG: 300, prepMinutes: 240, cookMinutes: 20, method: "deep-fried",
    ingredients: [["sabudana", 120], ["potato", 120], ["peanuts", 40], ["oil", 50, "absorbed"], ["green_chili", 4], ["salt", 4]],
    instructions: ["Soaked sago, potato and peanuts shaped and fried."],
  },

  /* ---------------- Rice & breakfast ---------------- */
  {
    slug: "tomato-rice", name: "Tomato rice", aliases: ["tomato rice", "thakkali sadam", "tomato bath"], region: "South Indian",
    servings: 3, servingLabel: "plate (~220 g)", cookedWeightG: 660, prepMinutes: 10, cookMinutes: 25, method: "cooked with masala",
    ingredients: [["rice", 200], ["water", 380], ["tomato", 200], ["onion", 60], ["oil", 22], ["mustard_seeds", 2], ["chili_powder", 2], ["salt", 6]],
    instructions: ["Rice cooked with a tangy tomato-onion masala."],
  },
  {
    slug: "coconut-rice", name: "Coconut rice", aliases: ["coconut rice", "thengai sadam"], region: "South Indian",
    servings: 3, servingLabel: "plate (~200 g)", cookedWeightG: 600, prepMinutes: 10, cookMinutes: 20, method: "tempered + mixed",
    ingredients: [["rice", 200], ["water", 380], ["coconut", 80], ["oil", 15], ["urad_dal", 6], ["cashew", 10], ["mustard_seeds", 2], ["salt", 5]],
    instructions: ["Cooked rice mixed with tempered fresh coconut."],
  },
  {
    slug: "tamarind-rice", name: "Tamarind rice (puliyogare)", aliases: ["puliyogare", "puliodharai", "imli rice", "tamarind rice"], region: "South Indian",
    servings: 3, servingLabel: "plate (~200 g)", cookedWeightG: 600, prepMinutes: 10, cookMinutes: 20, method: "tempered + mixed",
    ingredients: [["rice", 200], ["water", 380], ["tamarind", 30], ["peanuts", 25], ["oil", 25], ["mustard_seeds", 2], ["urad_dal", 6], ["salt", 6]],
    instructions: ["Rice mixed with tangy tamarind paste and peanut tadka."],
  },
  {
    slug: "set-dosa", name: "Set dosa (3 pieces)", aliases: ["set dosa", "sponge dosa"], region: "Karnataka",
    servings: 2, servingLabel: "3 small dosas (~150 g)", cookedWeightG: 300, prepMinutes: 720, cookMinutes: 15, method: "tawa",
    ingredients: [["rice", 100], ["poha", 20], ["urad_dal", 15], ["water", 170], ["oil", 10], ["salt", 3]],
    instructions: ["Soft, spongy small dosas cooked on one side."],
  },
  {
    slug: "mysore-masala-dosa", name: "Mysore masala dosa", aliases: ["mysore dosa", "mysore masala dosa"], region: "Karnataka", style: "restaurant", variant: { key: "dosa", label: "Red chutney spread + potato masala" },
    servings: 1, servingLabel: "1 dosa (~220 g)", prepMinutes: 720, cookMinutes: 10, method: "tawa",
    ingredients: [["rice", 50], ["urad_dal", 15], ["water", 70], ["oil", 15], ["butter", 8], ["potato", 90], ["onion", 25], ["chili_powder", 3], ["garlic", 3], ["salt", 4]],
    instructions: ["Dosa spread with spicy red garlic chutney and filled with potato masala."],
  },
  {
    slug: "oats-upma", name: "Oats upma", aliases: ["oats upma", "masala oats upma"], region: "South Indian",
    servings: 2, servingLabel: "bowl (~200 g)", cookedWeightG: 400, prepMinutes: 5, cookMinutes: 12, method: "tempered + steamed",
    ingredients: [["oats", 80], ["water", 200], ["onion", 40], ["carrot", 30], ["peas", 30], ["oil", 10], ["mustard_seeds", 2], ["salt", 3]],
    instructions: ["Roasted oats cooked with tempered vegetables."],
  },
  {
    slug: "paneer-sandwich", name: "Paneer sandwich", aliases: ["paneer sandwich", "paneer bhurji sandwich"], region: "Cafe",
    servings: 1, servingLabel: "1 sandwich", prepMinutes: 10, cookMinutes: 5, method: "grilled",
    ingredients: [["bread_ww", 60], ["paneer", 60], ["onion", 15], ["capsicum", 15], ["butter", 8], ["salt", 1]],
    instructions: ["Spiced paneer filling grilled in whole-wheat bread."],
  },

  /* ---------------- Sweets ---------------- */
  {
    slug: "gulab-jamun", name: "Gulab jamun (2 pieces)", nameHi: "गुलाब जामुन", aliases: ["gulab jamun", "gulabjamun", "kala jamun"], region: "Pan-Indian",
    servings: 6, servingLabel: "2 pieces with syrup (~80 g)", cookedWeightG: 480, prepMinutes: 20, cookMinutes: 30, method: "deep-fried + syrup",
    ingredients: [["milk", 300, "reduced to khoya (proxy)"], ["maida", 40], ["ghee", 10], ["oil", 50, "absorbed"], ["sugar", 150, "absorbed syrup"], ["cardamom", 1], ["water", 60]],
    instructions: ["Khoya dumplings fried and soaked in cardamom sugar syrup."],
  },
  {
    slug: "rasgulla", name: "Rasgulla (2 pieces)", nameHi: "रसगुल्ला", aliases: ["rasgulla", "rosogolla", "rasagola"], region: "Bengali",
    servings: 5, servingLabel: "2 pieces (~90 g)", cookedWeightG: 450, prepMinutes: 30, cookMinutes: 30, method: "boiled in syrup",
    ingredients: [["paneer", 180, "fresh chhena"], ["sugar", 130, "absorbed syrup"], ["water", 140]],
    instructions: ["Chhena balls cooked in light sugar syrup."],
  },
  {
    slug: "jalebi", name: "Jalebi (100 g)", nameHi: "जलेबी", aliases: ["jalebi", "jilebi", "imarti"], region: "Pan-Indian", style: "street",
    servings: 3, servingLabel: "100 g (~4 pieces)", cookedWeightG: 300, prepMinutes: 480, cookMinutes: 20, method: "deep-fried + syrup",
    ingredients: [["maida", 100], ["curd", 20], ["water", 40], ["oil", 50, "absorbed"], ["sugar", 120, "absorbed syrup"]],
    instructions: ["Fermented batter piped into hot oil, then dipped in syrup."],
  },
  {
    slug: "kaju-katli", name: "Kaju katli (2 pieces)", nameHi: "काजू कतली", aliases: ["kaju katli", "kaju barfi", "cashew barfi"], region: "Pan-Indian",
    servings: 10, servingLabel: "2 pieces (~30 g)", cookedWeightG: 300, prepMinutes: 10, cookMinutes: 20, method: "cooked fudge",
    ingredients: [["cashew", 200], ["sugar", 100], ["ghee", 5], ["water", 50, "evaporated"]],
    instructions: ["Cashew and sugar cooked into a fudge and cut into diamonds."],
  },
  {
    slug: "rasmalai", name: "Rasmalai (2 pieces)", nameHi: "रसमलाई", aliases: ["rasmalai", "ras malai"], region: "Bengali",
    servings: 4, servingLabel: "2 pieces + rabri (~130 g)", cookedWeightG: 520, prepMinutes: 30, cookMinutes: 60, method: "boiled + reduced milk",
    ingredients: [["paneer", 150, "chhena"], ["milk", 500, "reduced"], ["sugar", 80], ["pistachio", 10], ["cardamom", 1]],
    instructions: ["Chhena discs soaked in sweetened reduced milk."],
  },
  {
    slug: "seviyan-kheer", name: "Seviyan kheer (vermicelli)", nameHi: "सेवइयां", aliases: ["seviyan", "vermicelli kheer", "semiya payasam", "sevai kheer", "shemai"], region: "Pan-Indian",
    servings: 4, servingLabel: "katori (~150 g)", cookedWeightG: 600, prepMinutes: 5, cookMinutes: 20, method: "simmered",
    ingredients: [["pasta", 50, "wheat vermicelli"], ["ghee", 10], ["milk", 500], ["sugar", 50], ["cashew", 10], ["raisins", 10], ["cardamom", 1]],
    instructions: ["Roasted vermicelli simmered in milk with sugar and nuts."],
  },
  {
    slug: "shrikhand", name: "Shrikhand", aliases: ["shrikhand", "amrakhand"], region: "Maharashtrian/Gujarati",
    servings: 4, servingLabel: "katori (~100 g)", cookedWeightG: 400, prepMinutes: 480, cookMinutes: 0, method: "hung curd",
    ingredients: [["greek_yogurt", 320, "hung curd"], ["sugar", 70], ["cardamom", 1], ["pistachio", 8]],
    instructions: ["Hung curd sweetened with sugar and cardamom."],
  },
  {
    slug: "moong-dal-halwa", name: "Moong dal halwa", aliases: ["moong dal halwa", "moong halwa"], region: "Rajasthani",
    servings: 6, servingLabel: "katori (~80 g)", cookedWeightG: 480, prepMinutes: 240, cookMinutes: 45, method: "roasted in ghee",
    ingredients: [["moong_dal", 150], ["ghee", 100], ["sugar", 120], ["milk", 150], ["almonds", 15], ["cardamom", 1]],
    instructions: ["Ground moong dal slow-roasted in ghee, cooked with milk and sugar."],
  },
  {
    slug: "kulfi", name: "Kulfi (1 stick)", aliases: ["kulfi", "malai kulfi"], region: "North Indian",
    servings: 6, servingLabel: "1 kulfi (~70 g)", cookedWeightG: 420, prepMinutes: 10, cookMinutes: 60, method: "reduced + frozen",
    ingredients: [["milk", 1000, "reduced by half"], ["sugar", 80], ["pistachio", 15], ["cardamom", 1]],
    instructions: ["Milk reduced, sweetened and frozen in moulds."],
  },

  /* ---------------- Drinks ---------------- */
  {
    slug: "cold-coffee", name: "Cold coffee (with sugar)", aliases: ["cold coffee", "iced coffee", "coffee shake"], region: "Cafe",
    servings: 1, servingLabel: "glass (~300 ml)", prepMinutes: 5, cookMinutes: 0, method: "blended",
    ingredients: [["milk", 250], ["coffee_brewed", 30], ["sugar", 15], ["cream", 10]],
    instructions: ["Milk blended with coffee, sugar and ice."],
  },
  {
    slug: "badam-milk", name: "Badam milk", aliases: ["badam milk", "almond milk (Indian)", "badam doodh"], region: "Pan-Indian",
    servings: 1, servingLabel: "glass (~250 ml)", prepMinutes: 5, cookMinutes: 10, method: "simmered",
    ingredients: [["milk", 230], ["almonds", 15], ["sugar", 15], ["cardamom", 1]],
    instructions: ["Milk simmered with ground almonds, sugar and saffron."],
  },
  {
    slug: "haldi-doodh", name: "Haldi doodh (turmeric milk)", aliases: ["haldi doodh", "turmeric milk", "golden milk"], region: "Pan-Indian",
    servings: 1, servingLabel: "cup (~200 ml)", prepMinutes: 2, cookMinutes: 5, method: "simmered",
    ingredients: [["milk", 200], ["turmeric", 2], ["black_pepper", 0.5], ["sugar", 8]],
    instructions: ["Warm milk with turmeric and a pinch of pepper."],
  },
  {
    slug: "nimbu-pani", name: "Nimbu pani (with sugar)", aliases: ["nimbu pani", "lemonade", "shikanji", "lemon water"], region: "Pan-Indian",
    servings: 1, servingLabel: "glass (~250 ml)", prepMinutes: 3, cookMinutes: 0, method: "mixed",
    ingredients: [["water", 220], ["lemon_juice", 20], ["sugar", 20], ["salt", 1], ["cumin", 0.5]],
    instructions: ["Lemon juice, sugar, salt and roasted cumin in cold water."],
  },
];
