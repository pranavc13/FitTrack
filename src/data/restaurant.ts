/**
 * Outside-food portions. No verified restaurant nutrition exists for most Indian outlets, so dishes
 * map to a recipe (restaurant-style where available) and a portion RANGE. The app shows the resulting
 * calorie range rather than a single number. Portions are typical observed serving sizes (estimates).
 */
export interface RestaurantDish {
  recipeSlug: string;
  dishName: string;
  style: "restaurant" | "street" | "fast_food" | "cafeteria" | "delivery";
  portionLabel: string;
  low: number;
  typical: number;
  high: number;
  addOns?: { name: string; ingredient: string; grams: number }[];
}

const BUTTER = { name: "Extra butter (1 tbsp)", ingredient: "butter", grams: 14 };
const CREAM = { name: "Cream drizzle (1 tbsp)", ingredient: "cream", grams: 15 };
const CHEESE = { name: "Cheese (30 g)", ingredient: "cheese", grams: 30 };
const OIL = { name: "Extra oil/tadka (1 tbsp)", ingredient: "oil", grams: 14 };
const GHEE = { name: "Ghee (1 tsp)", ingredient: "ghee", grams: 5 };

export const RESTAURANT_DISHES: RestaurantDish[] = [
  { recipeSlug: "paneer-butter-masala", dishName: "Paneer butter masala", style: "restaurant", portionLabel: "1 restaurant bowl", low: 200, typical: 260, high: 350, addOns: [BUTTER, CREAM] },
  { recipeSlug: "shahi-paneer", dishName: "Shahi paneer", style: "restaurant", portionLabel: "1 restaurant bowl", low: 200, typical: 250, high: 330, addOns: [CREAM] },
  { recipeSlug: "palak-paneer", dishName: "Palak paneer", style: "restaurant", portionLabel: "1 restaurant bowl", low: 200, typical: 250, high: 330, addOns: [BUTTER, CREAM] },
  { recipeSlug: "dal-makhani", dishName: "Dal makhani", style: "restaurant", portionLabel: "1 restaurant bowl", low: 200, typical: 250, high: 350, addOns: [BUTTER, CREAM] },
  { recipeSlug: "dal-tadka-dhaba", dishName: "Dal tadka / dal fry", style: "restaurant", portionLabel: "1 restaurant bowl", low: 200, typical: 250, high: 350, addOns: [GHEE, OIL] },
  { recipeSlug: "chole-punjabi", dishName: "Chole (with bhature/kulcha separately)", style: "restaurant", portionLabel: "1 plate portion", low: 180, typical: 230, high: 300, addOns: [BUTTER] },
  { recipeSlug: "bhature", dishName: "Bhatura", style: "restaurant", portionLabel: "1 bhatura", low: 70, typical: 90, high: 130 },
  { recipeSlug: "rajma-restaurant", dishName: "Rajma masala", style: "restaurant", portionLabel: "1 restaurant bowl", low: 200, typical: 250, high: 330, addOns: [BUTTER] },
  { recipeSlug: "butter-chicken", dishName: "Butter chicken", style: "restaurant", portionLabel: "1 restaurant bowl", low: 220, typical: 280, high: 380, addOns: [BUTTER, CREAM] },
  { recipeSlug: "chicken-curry-home", dishName: "Chicken curry", style: "restaurant", portionLabel: "1 restaurant bowl", low: 220, typical: 280, high: 360, addOns: [OIL] },
  { recipeSlug: "chicken-tikka", dishName: "Chicken tikka (starter)", style: "restaurant", portionLabel: "6–8 pieces", low: 150, typical: 200, high: 280, addOns: [BUTTER] },
  { recipeSlug: "chicken-65", dishName: "Chicken 65", style: "restaurant", portionLabel: "1 plate", low: 150, typical: 200, high: 280 },
  { recipeSlug: "chicken-biryani-hyderabadi", dishName: "Chicken biryani", style: "restaurant", portionLabel: "Half plate / full plate", low: 300, typical: 450, high: 650, addOns: [{ name: "Raita (1 katori)", ingredient: "curd", grams: 100 }] },
  { recipeSlug: "veg-biryani", dishName: "Veg biryani", style: "restaurant", portionLabel: "1 plate", low: 300, typical: 400, high: 550 },
  { recipeSlug: "mutton-biryani", dishName: "Mutton biryani", style: "restaurant", portionLabel: "1 plate", low: 300, typical: 450, high: 650 },
  { recipeSlug: "masala-dosa", dishName: "Masala dosa", style: "restaurant", portionLabel: "1 dosa with masala", low: 200, typical: 250, high: 320, addOns: [BUTTER, { name: "Coconut chutney (2 tbsp)", ingredient: "coconut", grams: 25 }] },
  { recipeSlug: "plain-dosa", dishName: "Plain dosa", style: "restaurant", portionLabel: "1 dosa", low: 70, typical: 100, high: 140, addOns: [GHEE] },
  { recipeSlug: "idli", dishName: "Idli", style: "restaurant", portionLabel: "2 idlis", low: 80, typical: 100, high: 130 },
  { recipeSlug: "medu-vada", dishName: "Medu vada", style: "restaurant", portionLabel: "2 vadas", low: 70, typical: 90, high: 120 },
  { recipeSlug: "pav-bhaji", dishName: "Pav bhaji", style: "street", portionLabel: "1 plate (2 pav)", low: 330, typical: 420, high: 550, addOns: [BUTTER, CHEESE] },
  { recipeSlug: "vada-pav", dishName: "Vada pav", style: "street", portionLabel: "1 piece", low: 130, typical: 150, high: 190 },
  { recipeSlug: "misal-pav", dishName: "Misal pav", style: "street", portionLabel: "1 plate", low: 350, typical: 450, high: 550 },
  { recipeSlug: "samosa", dishName: "Samosa", style: "street", portionLabel: "1 samosa", low: 70, typical: 100, high: 140 },
  { recipeSlug: "pani-puri", dishName: "Pani puri / golgappa", style: "street", portionLabel: "1 plate (6)", low: 180, typical: 210, high: 260 },
  { recipeSlug: "bhel-puri", dishName: "Bhel puri", style: "street", portionLabel: "1 plate", low: 120, typical: 155, high: 200 },
  { recipeSlug: "aloo-tikki", dishName: "Aloo tikki chaat", style: "street", portionLabel: "2 tikkis", low: 120, typical: 160, high: 220, addOns: [{ name: "Curd + chutneys", ingredient: "curd", grams: 50 }] },
  { recipeSlug: "dabeli", dishName: "Dabeli", style: "street", portionLabel: "1 piece", low: 120, typical: 140, high: 170 },
  { recipeSlug: "veg-momos", dishName: "Veg momos (steamed)", style: "street", portionLabel: "1 plate (6)", low: 130, typical: 150, high: 200, addOns: [{ name: "Mayo dip (1 tbsp, oil proxy)", ingredient: "oil", grams: 10 }] },
  { recipeSlug: "chicken-momos", dishName: "Chicken momos (steamed)", style: "street", portionLabel: "1 plate (6)", low: 140, typical: 160, high: 210 },
  { recipeSlug: "veg-hakka-noodles", dishName: "Veg hakka noodles", style: "restaurant", portionLabel: "1 plate", low: 250, typical: 320, high: 420, addOns: [OIL] },
  { recipeSlug: "veg-fried-rice", dishName: "Veg fried rice", style: "restaurant", portionLabel: "1 plate", low: 250, typical: 320, high: 420, addOns: [OIL] },
  { recipeSlug: "dal-baati-churma", dishName: "Dal baati churma", style: "restaurant", portionLabel: "1 thali portion", low: 350, typical: 475, high: 600, addOns: [GHEE] },
  { recipeSlug: "sweet-lassi", dishName: "Sweet lassi", style: "restaurant", portionLabel: "1 glass", low: 250, typical: 300, high: 400, addOns: [{ name: "Malai topping", ingredient: "cream", grams: 20 }] },
  { recipeSlug: "masala-chai", dishName: "Masala chai (tapri)", style: "street", portionLabel: "1 cutting/cup", low: 80, typical: 120, high: 180 },
];
