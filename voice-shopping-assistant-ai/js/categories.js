// Maps common grocery items to categories. Used to auto-organize the list.
// Keys are lowercase singular-ish keywords matched against the item name.

export const CATEGORY_META = {
  Produce: { icon: '\u{1F966}', color: '#16A34A' },
  Dairy: { icon: '\u{1F9C0}', color: '#2563EB' },
  Bakery: { icon: '\u{1F35E}', color: '#B45309' },
  Meat: { icon: '\u{1F357}', color: '#DC2626' },
  Seafood: { icon: '\u{1F41F}', color: '#0891B2' },
  Pantry: { icon: '\u{1F96B}', color: '#CA8A04' },
  Frozen: { icon: '\u{1F9CA}', color: '#0EA5E9' },
  Beverages: { icon: '\u{1F964}', color: '#7C3AED' },
  Snacks: { icon: '\u{1F36A}', color: '#DB2777' },
  Household: { icon: '\u{1F9F4}', color: '#4B5563' },
  Other: { icon: '\u{1F6D2}', color: '#6B7A70' },
}

// keyword -> category
const KEYWORDS = {
  // Produce
  apple: 'Produce', apples: 'Produce', banana: 'Produce', bananas: 'Produce',
  orange: 'Produce', oranges: 'Produce', tomato: 'Produce', tomatoes: 'Produce',
  potato: 'Produce', potatoes: 'Produce', onion: 'Produce', onions: 'Produce',
  lettuce: 'Produce', spinach: 'Produce', carrot: 'Produce', carrots: 'Produce',
  broccoli: 'Produce', cucumber: 'Produce', pepper: 'Produce', peppers: 'Produce',
  grapes: 'Produce', strawberry: 'Produce', strawberries: 'Produce', lemon: 'Produce',
  lemons: 'Produce', lime: 'Produce', avocado: 'Produce', avocados: 'Produce',
  mango: 'Produce', mangoes: 'Produce', garlic: 'Produce', ginger: 'Produce',
  mushroom: 'Produce', mushrooms: 'Produce', celery: 'Produce', corn: 'Produce',
  // Dairy
  milk: 'Dairy', cheese: 'Dairy', yogurt: 'Dairy', yoghurt: 'Dairy', butter: 'Dairy',
  cream: 'Dairy', egg: 'Dairy', eggs: 'Dairy', paneer: 'Dairy',
  // Bakery
  bread: 'Bakery', bagel: 'Bakery', bagels: 'Bakery', croissant: 'Bakery',
  muffin: 'Bakery', muffins: 'Bakery', bun: 'Bakery', buns: 'Bakery', cake: 'Bakery',
  tortilla: 'Bakery', tortillas: 'Bakery', naan: 'Bakery',
  // Meat
  chicken: 'Meat', beef: 'Meat', pork: 'Meat', bacon: 'Meat', sausage: 'Meat',
  turkey: 'Meat', ham: 'Meat', lamb: 'Meat', mince: 'Meat', steak: 'Meat',
  // Seafood
  fish: 'Seafood', salmon: 'Seafood', tuna: 'Seafood', shrimp: 'Seafood',
  prawn: 'Seafood', prawns: 'Seafood', crab: 'Seafood',
  // Pantry
  rice: 'Pantry', pasta: 'Pantry', flour: 'Pantry', sugar: 'Pantry', salt: 'Pantry',
  oil: 'Pantry', vinegar: 'Pantry', cereal: 'Pantry', oats: 'Pantry', beans: 'Pantry',
  lentils: 'Pantry', honey: 'Pantry', jam: 'Pantry', sauce: 'Pantry', ketchup: 'Pantry',
  spice: 'Pantry', spices: 'Pantry', coffee: 'Pantry', tea: 'Pantry', peanut: 'Pantry',
  // Frozen
  'ice cream': 'Frozen', pizza: 'Frozen', fries: 'Frozen',
  // Beverages
  water: 'Beverages', juice: 'Beverages', soda: 'Beverages', cola: 'Beverages',
  beer: 'Beverages', wine: 'Beverages', smoothie: 'Beverages',
  // Snacks
  chips: 'Snacks', crisps: 'Snacks', chocolate: 'Snacks', cookies: 'Snacks',
  biscuits: 'Snacks', candy: 'Snacks', nuts: 'Snacks', popcorn: 'Snacks',
  crackers: 'Snacks', granola: 'Snacks',
  // Household
  soap: 'Household', shampoo: 'Household', toothpaste: 'Household', detergent: 'Household',
  tissue: 'Household', tissues: 'Household', napkin: 'Household', napkins: 'Household',
  'toilet paper': 'Household', 'paper towel': 'Household', foil: 'Household',
  sponge: 'Household', cleaner: 'Household', bleach: 'Household',
}

export function categorize(itemName) {
  const name = itemName.toLowerCase().trim()
  // Try full multi-word matches first (e.g. "ice cream", "toilet paper")
  for (const key of Object.keys(KEYWORDS)) {
    if (key.includes(' ') && name.includes(key)) return KEYWORDS[key]
  }
  // Then match on individual words
  const words = name.split(/\s+/)
  for (const word of words) {
    if (KEYWORDS[word]) return KEYWORDS[word]
  }
  // Then loose substring match against single-word keys
  for (const key of Object.keys(KEYWORDS)) {
    if (!key.includes(' ') && name.includes(key)) return KEYWORDS[key]
  }
  return 'Other'
}
