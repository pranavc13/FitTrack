/**
 * Canonical ingredient keys → exact USDA FoodData Central descriptions (resolved to food ids at seed
 * time; seeding fails loudly if a description no longer exists). Names are Hindi/regional names and
 * spellings used for search and recipe matching. Nutrient values always come from the USDA record —
 * none are entered here.
 *
 * `proxy` marks an ingredient with no direct USDA record that is mapped to the closest composition
 * (e.g. poha → raw rice). Recipes using it are flagged as estimates.
 */
export interface IngredientDef {
  usda: string;
  names: { name: string; lang?: string }[];
  role?: "main" | "fat" | "sugar" | "water" | "spice";
  group: "vegetables" | "fruits" | "grains" | "pulses" | "dairy" | "protein" | "spices" | "fats" | "nuts_seeds" | "other";
  proxy?: string;
  /** Rough retail price ₹/kg (or ₹/L) for budget estimates; editable, labelled approximate. */
  priceInrPerKg?: number;
}

const n = (...names: (string | [string, string])[]) => names.map((x) => (Array.isArray(x) ? { name: x[0], lang: x[1] } : { name: x }));

export const INGREDIENTS = {
  // ---- Pulses & legumes ----
  toor_dal: { usda: "Pigeon peas (red gram), mature seeds, raw", names: n("toor dal", "arhar dal", "tuvar dal", "tur dal", ["तूर दाल", "hi"], ["अरहर दाल", "hi"], ["thuvaram paruppu", "ta"], ["kandi pappu", "te"], ["togari bele", "kn"]), group: "pulses", priceInrPerKg: 160 },
  moong_dal: { usda: "Mung beans, mature seeds, raw", names: n("moong dal", "mung dal", "green gram", "moong", ["मूंग दाल", "hi"], ["pesarapappu", "te"], ["pasi paruppu", "ta"], ["hesaru bele", "kn"]), group: "pulses", priceInrPerKg: 130 },
  moong_sprouts: { usda: "Mung beans, mature seeds, sprouted, raw", names: n("moong sprouts", "sprouts", "ankurit moong", ["अंकुरित मूंग", "hi"]), group: "pulses", priceInrPerKg: 120 },
  urad_dal: { usda: "Mungo beans, mature seeds, raw", names: n("urad dal", "black gram", "udad dal", "ulundu", ["उड़द दाल", "hi"], ["minapappu", "te"], ["uddina bele", "kn"]), group: "pulses", priceInrPerKg: 140 },
  masoor_dal: { usda: "Lentils, pink or red, raw", names: n("masoor dal", "red lentils", "lal masoor", ["मसूर दाल", "hi"]), group: "pulses", priceInrPerKg: 110 },
  whole_masoor: { usda: "Lentils, raw", names: n("whole masoor", "sabut masoor", "brown lentils"), group: "pulses", priceInrPerKg: 110 },
  chana: { usda: "Chickpeas (garbanzo beans, bengal gram), mature seeds, raw", names: n("kabuli chana", "chole", "chickpeas", "safed chana", "chana dal", "kala chana", "bengal gram", ["छोले", "hi"], ["चना", "hi"], ["kadalai", "ta"], ["senagalu", "te"]), group: "pulses", priceInrPerKg: 120 },
  rajma: { usda: "Beans, kidney, red, mature seeds, raw", names: n("rajma", "kidney beans", ["राजमा", "hi"]), group: "pulses", priceInrPerKg: 160 },
  lobia: { usda: "Cowpeas, common (blackeyes, crowder, southern), mature seeds, raw", names: n("lobia", "chawli", "black eyed peas", "alsande", ["लोबिया", "hi"], ["karamani", "ta"]), group: "pulses", priceInrPerKg: 120 },
  besan: { usda: "Chickpea flour (besan)", names: n("besan", "gram flour", "chickpea flour", ["बेसन", "hi"], ["kadalai maavu", "ta"]), group: "pulses", priceInrPerKg: 110 },
  soya_chunks: { usda: "Soy flour, defatted", names: n("soya chunks", "soya badi", "nutrela", "textured soy protein", ["सोया चंक्स", "hi"]), group: "protein", proxy: "Defatted soy flour (soy chunks are extruded defatted soy flour)", priceInrPerKg: 200 },
  soybean: { usda: "Soybeans, mature seeds, raw", names: n("soybean", "soyabean", ["सोयाबीन", "hi"]), group: "pulses", priceInrPerKg: 100 },

  // ---- Grains & flours ----
  atta: { usda: "Wheat flour, whole-grain (Includes foods for USDA's Food Distribution Program)", names: n("atta", "whole wheat flour", "gehun ka atta", ["आटा", "hi"], ["godhuma pindi", "te"]), group: "grains", priceInrPerKg: 45 },
  maida: { usda: "Wheat flour, white, all-purpose, enriched, bleached", names: n("maida", "all purpose flour", "refined flour", ["मैदा", "hi"]), group: "grains", priceInrPerKg: 45 },
  rice: { usda: "Rice, white, long-grain, regular, raw, enriched", names: n("rice", "chawal", "basmati rice", "sona masoori", "white rice", ["चावल", "hi"], ["arisi", "ta"], ["biyyam", "te"], ["bhaat", "mr"]), group: "grains", priceInrPerKg: 70 },
  brown_rice: { usda: "Rice, brown, long-grain, raw (Includes foods for USDA's Food Distribution Program)", names: n("brown rice", ["ब्राउन राइस", "hi"]), group: "grains", priceInrPerKg: 120 },
  parboiled_rice: { usda: "Rice, white, long-grain, parboiled, enriched, dry", names: n("parboiled rice", "ukda chawal", "idli rice", "boiled rice", "matta rice"), group: "grains", priceInrPerKg: 55 },
  poha: { usda: "Rice, white, long-grain, regular, raw, enriched", names: n("poha", "flattened rice", "aval", "chivda", "beaten rice", ["पोहा", "hi"], ["avalakki", "kn"], ["atukulu", "te"]), group: "grains", proxy: "Raw white rice (flattened rice has near-identical proximate composition; micronutrients differ)", priceInrPerKg: 60 },
  sooji: { usda: "Semolina, enriched", names: n("sooji", "suji", "rava", "semolina", ["सूजी", "hi"], ["रवा", "mr"]), group: "grains", priceInrPerKg: 50 },
  sabudana: { usda: "Tapioca, pearl, dry", names: n("sabudana", "sago", "tapioca pearls", "javvarisi", ["साबूदाना", "hi"]), group: "grains", priceInrPerKg: 90 },
  bajra: { usda: "Millet, raw", names: n("bajra", "pearl millet", "kambu", "sajje", ["बाजरा", "hi"]), group: "grains", priceInrPerKg: 40 },
  millet_flour: { usda: "Millet flour", names: n("bajra atta", "millet flour", ["बाजरे का आटा", "hi"]), group: "grains", priceInrPerKg: 50 },
  jowar_flour: { usda: "Sorghum flour, whole-grain", names: n("jowar atta", "jowar", "sorghum", "jonna", "cholam", ["ज्वार", "hi"]), group: "grains", priceInrPerKg: 60 },
  makki_atta: { usda: "Cornmeal, whole-grain, yellow", names: n("makki ka atta", "maize flour", "corn flour (yellow)", ["मक्की का आटा", "hi"]), group: "grains", priceInrPerKg: 50 },
  oats: { usda: "Oats (Includes foods for USDA's Food Distribution Program)", names: n("oats", "rolled oats", "jai", ["ओट्स", "hi"]), group: "grains", priceInrPerKg: 180 },
  dalia: { usda: "Bulgur, dry", names: n("dalia", "broken wheat", "lapsi", "godhuma rava", ["दलिया", "hi"]), group: "grains", priceInrPerKg: 60 },
  quinoa: { usda: "Quinoa, uncooked", names: n("quinoa", ["क्विनोआ", "hi"]), group: "grains", priceInrPerKg: 400 },
  barley: { usda: "Barley, pearled, raw", names: n("barley", "jau", ["जौ", "hi"]), group: "grains", priceInrPerKg: 80 },
  amaranth_grain: { usda: "Amaranth grain, uncooked", names: n("rajgira", "amaranth seeds", "ramdana", ["राजगिरा", "hi"]), group: "grains", priceInrPerKg: 200 },
  pav: { usda: "Rolls, dinner, plain, commercially prepared (includes brown-and-serve)", names: n("pav", "ladi pav", "bun", "dinner roll", ["पाव", "hi"]), group: "grains", priceInrPerKg: 120 },
  bread_ww: { usda: "Bread, whole-wheat, commercially prepared", names: n("brown bread", "whole wheat bread", "atta bread"), group: "grains", priceInrPerKg: 150 },
  pasta: { usda: "Pasta, dry, enriched", names: n("pasta", "macaroni", "penne", "spaghetti"), group: "grains", priceInrPerKg: 200 },
  noodles: { usda: "Noodles, egg, dry, enriched", names: n("noodles", "hakka noodles", "chowmein noodles"), group: "grains", priceInrPerKg: 200 },

  // ---- Vegetables ----
  potato: { usda: "Potatoes, flesh and skin, raw", names: n("aloo", "potato", "batata", "urulaikizhangu", "bangaladumpa", ["आलू", "hi"], ["बटाटा", "mr"]), group: "vegetables", priceInrPerKg: 30 },
  sweet_potato: { usda: "Sweet potato, raw, unprepared (Includes foods for USDA's Food Distribution Program)", names: n("shakarkandi", "sweet potato", "ratalu", ["शकरकंदी", "hi"]), group: "vegetables", priceInrPerKg: 50 },
  onion: { usda: "Onions, raw", names: n("pyaz", "onion", "kanda", "vengayam", "ullipaya", ["प्याज़", "hi"], ["कांदा", "mr"]), group: "vegetables", priceInrPerKg: 40 },
  tomato: { usda: "Tomatoes, red, ripe, raw, year round average", names: n("tamatar", "tomato", "thakkali", ["टमाटर", "hi"]), group: "vegetables", priceInrPerKg: 40 },
  garlic: { usda: "Garlic, raw", names: n("lehsun", "garlic", "lasun", "poondu", ["लहसुन", "hi"]), group: "vegetables", priceInrPerKg: 200 },
  ginger: { usda: "Ginger root, raw", names: n("adrak", "ginger", "inji", "allam", ["अदरक", "hi"]), group: "vegetables", priceInrPerKg: 150 },
  green_chili: { usda: "Peppers, hot chili, green, raw", names: n("hari mirch", "green chilli", "green chili", "milagai", ["हरी मिर्च", "hi"]), group: "vegetables", priceInrPerKg: 80 },
  coriander_leaves: { usda: "Coriander (cilantro) leaves, raw", names: n("dhania", "coriander leaves", "cilantro", "kothimbir", "kothamalli", ["धनिया", "hi"]), group: "vegetables", priceInrPerKg: 100 },
  mint: { usda: "Peppermint, fresh", names: n("pudina", "mint leaves", ["पुदीना", "hi"]), group: "vegetables", priceInrPerKg: 100 },
  spinach: { usda: "Spinach, raw", names: n("palak", "spinach", "pasalai keerai", ["पालक", "hi"]), group: "vegetables", priceInrPerKg: 40 },
  mustard_greens: { usda: "Mustard greens, raw", names: n("sarson", "sarson ka saag", "mustard greens", ["सरसों", "hi"]), group: "vegetables", priceInrPerKg: 40 },
  amaranth_leaves: { usda: "Amaranth leaves, raw", names: n("chaulai", "lal saag", "thotakura", "rajgira leaves", "amaranth leaves", ["चौलाई", "hi"]), group: "vegetables", priceInrPerKg: 40 },
  drumstick_leaves: { usda: "Drumstick leaves, raw", names: n("moringa leaves", "drumstick leaves", "murungai keerai", "sahjan ke patte", ["सहजन के पत्ते", "hi"]), group: "vegetables", priceInrPerKg: 80 },
  drumstick_pods: { usda: "Drumstick pods, raw", names: n("drumstick", "sahjan", "murungakkai", "shevgyachya shenga", ["सहजन", "hi"]), group: "vegetables", priceInrPerKg: 80 },
  cauliflower: { usda: "Cauliflower, raw", names: n("gobi", "phool gobi", "cauliflower", ["फूलगोभी", "hi"]), group: "vegetables", priceInrPerKg: 40 },
  cabbage: { usda: "Cabbage, raw", names: n("patta gobi", "band gobi", "cabbage", "muttaikose", ["पत्तागोभी", "hi"]), group: "vegetables", priceInrPerKg: 30 },
  broccoli: { usda: "Broccoli, raw", names: n("broccoli", ["ब्रोकली", "hi"]), group: "vegetables", priceInrPerKg: 150 },
  carrot: { usda: "Carrots, raw", names: n("gajar", "carrot", ["गाजर", "hi"]), group: "vegetables", priceInrPerKg: 50 },
  beetroot: { usda: "Beets, raw", names: n("chukandar", "beetroot", "beet", ["चुकंदर", "hi"]), group: "vegetables", priceInrPerKg: 50 },
  radish: { usda: "Radishes, raw", names: n("mooli", "radish", "mullangi", ["मूली", "hi"]), group: "vegetables", priceInrPerKg: 30 },
  turnip: { usda: "Turnips, raw", names: n("shalgam", "turnip", ["शलगम", "hi"]), group: "vegetables", priceInrPerKg: 40 },
  peas: { usda: "Peas, green, raw", names: n("matar", "green peas", "batani", ["मटर", "hi"]), group: "vegetables", priceInrPerKg: 80 },
  capsicum: { usda: "Peppers, sweet, green, raw", names: n("shimla mirch", "capsicum", "green bell pepper", ["शिमला मिर्च", "hi"]), group: "vegetables", priceInrPerKg: 60 },
  brinjal: { usda: "Eggplant, raw", names: n("baingan", "brinjal", "eggplant", "vangi", "kathirikai", "vankaya", ["बैंगन", "hi"]), group: "vegetables", priceInrPerKg: 40 },
  bhindi: { usda: "Okra, raw", names: n("bhindi", "okra", "ladies finger", "vendakkai", "bendakaya", ["भिंडी", "hi"]), group: "vegetables", priceInrPerKg: 50 },
  karela: { usda: "Balsam-pear (bitter gourd), pods, raw", names: n("karela", "bitter gourd", "pavakkai", "kakarakaya", ["करेला", "hi"]), group: "vegetables", priceInrPerKg: 60 },
  lauki: { usda: "Gourd, white-flowered (calabash), raw", names: n("lauki", "ghiya", "bottle gourd", "dudhi", "sorakaya", "suraikai", ["लौकी", "hi"]), group: "vegetables", priceInrPerKg: 30 },
  pumpkin: { usda: "Pumpkin, raw", names: n("kaddu", "pumpkin", "sitaphal", "parangikai", ["कद्दू", "hi"]), group: "vegetables", priceInrPerKg: 30 },
  cucumber: { usda: "Cucumber, with peel, raw", names: n("kheera", "cucumber", "kakdi", ["खीरा", "hi"]), group: "vegetables", priceInrPerKg: 40 },
  green_beans: { usda: "Beans, snap, green, raw", names: n("french beans", "green beans", "beans", ["फ्रेंच बीन्स", "hi"]), group: "vegetables", priceInrPerKg: 60 },
  mushroom: { usda: "Mushrooms, white, raw", names: n("mushroom", "khumb", ["मशरूम", "hi"]), group: "vegetables", priceInrPerKg: 200 },
  arbi: { usda: "Taro, raw", names: n("arbi", "colocasia", "taro", "seppankizhangu", ["अरबी", "hi"]), group: "vegetables", priceInrPerKg: 60 },
  lotus_stem: { usda: "Lotus root, raw", names: n("kamal kakdi", "lotus stem", "nadru", ["कमल ककड़ी", "hi"]), group: "vegetables", priceInrPerKg: 150 },
  raw_banana: { usda: "Plantains, green, raw", names: n("kacha kela", "raw banana", "vazhakkai", "aratikaya", ["कच्चा केला", "hi"]), group: "vegetables", priceInrPerKg: 50 },
  jackfruit: { usda: "Jackfruit, raw", names: n("kathal", "jackfruit", "phanas", "chakka", ["कटहल", "hi"]), group: "vegetables", priceInrPerKg: 60 },
  cassava: { usda: "Cassava, raw", names: n("tapioca", "cassava", "kappa", "maravalli kizhangu"), group: "vegetables", priceInrPerKg: 40 },
  bamboo_shoots: { usda: "Bamboo shoots, raw", names: n("bamboo shoot", "baans", "khorisa"), group: "vegetables", priceInrPerKg: 100 },
  kohlrabi: { usda: "Kohlrabi, raw", names: n("ganth gobi", "knol khol", "kohlrabi", "monji"), group: "vegetables", priceInrPerKg: 40 },
  kale: { usda: "Kale, raw", names: n("kale"), group: "vegetables", priceInrPerKg: 300 },
  sweet_corn: { usda: "Corn, sweet, yellow, raw", names: n("bhutta", "sweet corn", "makka", ["भुट्टा", "hi"]), group: "vegetables", priceInrPerKg: 60 },
  lemon_juice: { usda: "Lemon juice, raw", names: n("nimbu", "lemon juice", ["नींबू", "hi"]), group: "fruits", priceInrPerKg: 100 },
  tamarind: { usda: "Tamarinds, raw", names: n("imli", "tamarind", "puli", ["इमली", "hi"]), group: "fruits", priceInrPerKg: 200 },

  // ---- Fruits ----
  banana: { usda: "Bananas, raw", names: n("kela", "banana", "vazhaipazham", ["केला", "hi"]), group: "fruits", priceInrPerKg: 50 },
  mango: { usda: "Mangos, raw", names: n("aam", "mango", "alphonso", "mambazham", ["आम", "hi"]), group: "fruits", priceInrPerKg: 120 },
  papaya: { usda: "Papayas, raw", names: n("papita", "papaya", ["पपीता", "hi"]), group: "fruits", priceInrPerKg: 40 },
  guava: { usda: "Guavas, common, raw", names: n("amrood", "peru", "guava", "koyya", ["अमरूद", "hi"]), group: "fruits", priceInrPerKg: 60 },
  pomegranate: { usda: "Pomegranates, raw", names: n("anar", "pomegranate", "dalimb", ["अनार", "hi"]), group: "fruits", priceInrPerKg: 150 },
  apple: { usda: "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)", names: n("seb", "apple", ["सेब", "hi"]), group: "fruits", priceInrPerKg: 160 },
  orange: { usda: "Oranges, raw, all commercial varieties", names: n("santra", "narangi", "orange", "mosambi", ["संतरा", "hi"]), group: "fruits", priceInrPerKg: 80 },
  grapes: { usda: "Grapes, red or green (European type, such as Thompson seedless), raw", names: n("angoor", "grapes", ["अंगूर", "hi"]), group: "fruits", priceInrPerKg: 100 },
  watermelon: { usda: "Watermelon, raw", names: n("tarbooz", "watermelon", "kalingad", ["तरबूज़", "hi"]), group: "fruits", priceInrPerKg: 25 },
  muskmelon: { usda: "Melons, cantaloupe, raw", names: n("kharbooja", "muskmelon", "cantaloupe", ["खरबूजा", "hi"]), group: "fruits", priceInrPerKg: 40 },
  pineapple: { usda: "Pineapple, raw, all varieties", names: n("ananas", "pineapple", ["अनानास", "hi"]), group: "fruits", priceInrPerKg: 60 },
  chikoo: { usda: "Sapodilla, raw", names: n("chikoo", "chiku", "sapota", "sapodilla", ["चीकू", "hi"]), group: "fruits", priceInrPerKg: 80 },
  custard_apple: { usda: "Sugar-apples, (sweetsop), raw", names: n("sitaphal", "custard apple", "sharifa", ["शरीफा", "hi"]), group: "fruits", priceInrPerKg: 120 },
  litchi: { usda: "Litchis, raw", names: n("lychee", "litchi", ["लीची", "hi"]), group: "fruits", priceInrPerKg: 150 },
  kiwi: { usda: "Kiwifruit, green, raw", names: n("kiwi"), group: "fruits", priceInrPerKg: 300 },
  coconut: { usda: "Nuts, coconut meat, raw", names: n("nariyal", "fresh coconut", "thengai", "kobbari", ["नारियल", "hi"]), group: "fruits", priceInrPerKg: 100 },
  desiccated_coconut: { usda: "Nuts, coconut meat, dried (desiccated), not sweetened", names: n("dry coconut", "khopra", "kopra", "desiccated coconut"), group: "nuts_seeds", priceInrPerKg: 250 },
  dates: { usda: "Dates, deglet noor", names: n("khajoor", "dates", ["खजूर", "hi"]), group: "fruits", priceInrPerKg: 300 },
  figs_dried: { usda: "Figs, dried, uncooked", names: n("anjeer", "dried figs", ["अंजीर", "hi"]), group: "fruits", priceInrPerKg: 1000 },
  raisins: { usda: "Raisins, dark, seedless (Includes foods for USDA's Food Distribution Program)", names: n("kishmish", "raisins", ["किशमिश", "hi"]), group: "fruits", priceInrPerKg: 400 },
  avocado: { usda: "Avocados, raw, all commercial varieties", names: n("avocado", "butter fruit"), group: "fruits", priceInrPerKg: 400 },
  strawberry: { usda: "Strawberries, raw", names: n("strawberry"), group: "fruits", priceInrPerKg: 400 },

  // ---- Dairy & protein ----
  milk: { usda: "Milk, whole, 3.25% milkfat, with added vitamin D", names: n("doodh", "full cream milk", "whole milk", "milk", ["दूध", "hi"]), group: "dairy", priceInrPerKg: 66 },
  toned_milk: { usda: "Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D", names: n("toned milk", "2% milk"), group: "dairy", proxy: "USDA 2% milk (Indian toned milk is ~3% fat)", priceInrPerKg: 54 },
  skim_milk: { usda: "Milk, nonfat, fluid, with added vitamin A and vitamin D (fat free or skim)", names: n("skimmed milk", "skim milk", "double toned milk"), group: "dairy", priceInrPerKg: 50 },
  curd: { usda: "Yogurt, plain, whole milk", names: n("dahi", "curd", "yogurt", "thayir", "perugu", ["दही", "hi"]), group: "dairy", priceInrPerKg: 80 },
  greek_yogurt: { usda: "Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)", names: n("greek yogurt", "hung curd (low fat)"), group: "dairy", priceInrPerKg: 300 },
  paneer: { usda: "Cheese, paneer", names: n("paneer", "cottage cheese (indian)", ["पनीर", "hi"]), group: "dairy", priceInrPerKg: 400 },
  cheese: { usda: "Cheese, mozzarella, whole milk", names: n("cheese", "mozzarella", "pizza cheese"), group: "dairy", priceInrPerKg: 600 },
  cream: { usda: "Cream, fluid, heavy whipping", names: n("malai", "fresh cream", "cream", ["मलाई", "hi"]), group: "dairy", role: "fat", priceInrPerKg: 300 },
  egg: { usda: "Egg, whole, raw, fresh", names: n("anda", "egg", "muttai", "guddu", ["अंडा", "hi"]), group: "protein", priceInrPerKg: 130 },
  egg_white: { usda: "Egg, white, raw, fresh", names: n("egg white", "anda safedi"), group: "protein", priceInrPerKg: 130 },
  chicken: { usda: "Chicken, broilers or fryers, meat only, raw", names: n("murgh", "chicken", "kozhi", "kodi", ["मुर्गा", "hi"], ["चिकन", "hi"]), group: "protein", priceInrPerKg: 280 },
  mutton: { usda: "Game meat, goat, raw", names: n("mutton", "goat meat", "gosht", "bakra", ["मटन", "hi"]), group: "protein", priceInrPerKg: 800 },
  lamb_mince: { usda: "Lamb, ground, raw", names: n("keema", "mutton mince", "qeema", ["कीमा", "hi"]), group: "protein", proxy: "Ground lamb (Indian keema is usually goat)", priceInrPerKg: 800 },
  fish: { usda: "Fish, carp, raw", names: n("rohu", "katla", "fish", "machli", "maach", "carp", ["मछली", "hi"]), group: "protein", priceInrPerKg: 250 },
  mackerel: { usda: "Fish, mackerel, Pacific and jack, mixed species, raw", names: n("bangda", "mackerel", "ayala", "bangude"), group: "protein", priceInrPerKg: 250 },
  prawns: { usda: "Crustaceans, shrimp, mixed species, raw (may contain additives to retain moisture)", names: n("jhinga", "prawns", "shrimp", "chingri", "kolambi", ["झींगा", "hi"]), group: "protein", priceInrPerKg: 600 },
  tofu: { usda: "Tofu, raw, firm, prepared with calcium sulfate", names: n("tofu", "soy paneer"), group: "protein", priceInrPerKg: 300 },

  // ---- Fats & sugars ----
  oil: { usda: "Oil, soybean, salad or cooking", names: n("tel", "cooking oil", "refined oil", "vegetable oil", "soybean oil", ["तेल", "hi"]), group: "fats", role: "fat", priceInrPerKg: 150 },
  mustard_oil: { usda: "Oil, mustard", names: n("sarson ka tel", "mustard oil", "kachi ghani", ["सरसों का तेल", "hi"]), group: "fats", role: "fat", priceInrPerKg: 180 },
  coconut_oil: { usda: "Oil, coconut", names: n("coconut oil", "nariyal tel", "velichenna"), group: "fats", role: "fat", priceInrPerKg: 250 },
  groundnut_oil: { usda: "Oil, peanut, salad or cooking", names: n("groundnut oil", "moongphali tel", "peanut oil", "kadalai ennai"), group: "fats", role: "fat", priceInrPerKg: 200 },
  ghee: { usda: "Butter, Clarified butter (ghee)", names: n("ghee", "desi ghee", "neyyi", "tuppa", ["घी", "hi"]), group: "fats", role: "fat", priceInrPerKg: 650 },
  butter: { usda: "Butter, salted", names: n("makhan", "butter", "amul butter", ["मक्खन", "hi"]), group: "fats", role: "fat", priceInrPerKg: 550 },
  sugar: { usda: "Sugars, granulated", names: n("cheeni", "shakkar", "sugar", ["चीनी", "hi"]), group: "other", role: "sugar", priceInrPerKg: 45 },
  honey: { usda: "Honey", names: n("shahad", "honey", ["शहद", "hi"]), group: "other", role: "sugar", priceInrPerKg: 400 },

  // ---- Nuts & seeds ----
  peanuts: { usda: "Peanuts, all types, raw", names: n("moongphali", "peanuts", "groundnut", "shengdana", "verkadalai", ["मूंगफली", "hi"]), group: "nuts_seeds", priceInrPerKg: 140 },
  cashew: { usda: "Nuts, cashew nuts, raw", names: n("kaju", "cashew", ["काजू", "hi"]), group: "nuts_seeds", priceInrPerKg: 900 },
  almonds: { usda: "Nuts, almonds", names: n("badam", "almonds", ["बादाम", "hi"]), group: "nuts_seeds", priceInrPerKg: 900 },
  walnuts: { usda: "Nuts, walnuts, english", names: n("akhrot", "walnuts", ["अखरोट", "hi"]), group: "nuts_seeds", priceInrPerKg: 1200 },
  pistachio: { usda: "Nuts, pistachio nuts, raw", names: n("pista", "pistachio", ["पिस्ता", "hi"]), group: "nuts_seeds", priceInrPerKg: 1500 },
  sesame: { usda: "Seeds, sesame seeds, whole, dried", names: n("til", "sesame", "ellu", ["तिल", "hi"]), group: "nuts_seeds", priceInrPerKg: 250 },
  poppy_seeds: { usda: "Spices, poppy seed", names: n("khus khus", "posto", "poppy seeds", "gasagasalu", ["खसखस", "hi"]), group: "nuts_seeds", priceInrPerKg: 1500 },
  flaxseed: { usda: "Seeds, flaxseed", names: n("alsi", "flax seeds", "javas", ["अलसी", "hi"]), group: "nuts_seeds", priceInrPerKg: 200 },
  chia: { usda: "Seeds, chia seeds, dried", names: n("chia seeds"), group: "nuts_seeds", priceInrPerKg: 600 },
  makhana: { usda: "Seeds, lotus seeds, dried", names: n("makhana", "fox nuts", "phool makhana", "lotus seeds", ["मखाना", "hi"]), group: "nuts_seeds", proxy: "Dried lotus seeds (makhana is Euryale ferox; similar seed composition)", priceInrPerKg: 1000 },

  // ---- Spices & condiments (small amounts; included so totals are complete) ----
  turmeric: { usda: "Spices, turmeric, ground", names: n("haldi", "turmeric", "manjal", ["हल्दी", "hi"]), group: "spices", role: "spice", priceInrPerKg: 300 },
  chili_powder: { usda: "Spices, chili powder", names: n("lal mirch", "red chilli powder", "kashmiri mirch", ["लाल मिर्च", "hi"]), group: "spices", role: "spice", priceInrPerKg: 400 },
  cumin: { usda: "Spices, cumin seed", names: n("jeera", "cumin", "jeerakam", ["जीरा", "hi"]), group: "spices", role: "spice", priceInrPerKg: 600 },
  coriander_powder: { usda: "Spices, coriander seed", names: n("dhania powder", "coriander powder", "coriander seeds"), group: "spices", role: "spice", priceInrPerKg: 300 },
  garam_masala: { usda: "Spices, curry powder", names: n("garam masala", "curry powder", "sambar powder", "pav bhaji masala", "chole masala"), group: "spices", role: "spice", proxy: "Curry powder (spice blends contribute little energy)", priceInrPerKg: 800 },
  mustard_seeds: { usda: "Spices, mustard seed, ground", names: n("rai", "sarson", "mustard seeds", "kadugu"), group: "spices", role: "spice", priceInrPerKg: 150 },
  fenugreek_seeds: { usda: "Spices, fenugreek seed", names: n("methi dana", "fenugreek seeds", "vendayam", ["मेथी दाना", "hi"]), group: "spices", role: "spice", priceInrPerKg: 150 },
  black_pepper: { usda: "Spices, pepper, black", names: n("kali mirch", "black pepper", "milagu"), group: "spices", role: "spice", priceInrPerKg: 900 },
  cardamom: { usda: "Spices, cardamom", names: n("elaichi", "cardamom"), group: "spices", role: "spice", priceInrPerKg: 3000 },
  fennel: { usda: "Spices, fennel seed", names: n("saunf", "fennel"), group: "spices", role: "spice", priceInrPerKg: 300 },
  salt: { usda: "Salt, table", names: n("namak", "salt", ["नमक", "hi"]), group: "spices", role: "spice", priceInrPerKg: 25 },
  tea_brewed: { usda: "Beverages, tea, black, brewed, prepared with tap water", names: n("black tea", "chai patti (brewed)", "kadak chai base"), group: "other", priceInrPerKg: 10 },
  coffee_brewed: { usda: "Beverages, coffee, brewed, prepared with tap water", names: n("coffee decoction", "filter coffee decoction", "black coffee"), group: "other", priceInrPerKg: 10 },
  ketchup: { usda: "Ketchup", names: n("ketchup", "tomato sauce"), group: "spices", role: "sugar", priceInrPerKg: 150 },
  soy_sauce: { usda: "Soy sauce made from soy and wheat (shoyu)", names: n("soy sauce"), group: "spices", role: "spice", priceInrPerKg: 150 },
  water: { usda: "__water__", names: n("water", "pani"), group: "other", role: "water" },
} satisfies Record<string, IngredientDef>;

export type IngredientKey = keyof typeof INGREDIENTS;
