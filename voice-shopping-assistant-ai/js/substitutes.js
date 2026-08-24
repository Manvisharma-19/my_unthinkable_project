// Simple substitute suggestions. When a user adds a key item, we can offer
// an alternative (e.g. dietary or availability-based).

const SUBSTITUTES = {
  milk: ['almond milk', 'oat milk', 'soy milk'],
  butter: ['margarine', 'olive oil'],
  sugar: ['honey', 'maple syrup', 'stevia'],
  cream: ['coconut cream', 'greek yogurt'],
  bread: ['whole wheat bread', 'sourdough'],
  rice: ['quinoa', 'brown rice'],
  pasta: ['whole wheat pasta', 'chickpea pasta'],
  beef: ['ground turkey', 'plant-based mince'],
  chicken: ['tofu', 'tempeh'],
  cheese: ['vegan cheese'],
  yogurt: ['coconut yogurt'],
  chips: ['baked chips', 'veggie straws'],
  soda: ['sparkling water', 'kombucha'],
  coffee: ['decaf coffee', 'green tea'],
}

export function getSubstitutes(itemName) {
  const name = itemName.toLowerCase().trim()
  for (const key of Object.keys(SUBSTITUTES)) {
    if (name.includes(key)) {
      // Don't suggest a substitute that's basically the same item the user typed
      return SUBSTITUTES[key].filter((s) => !name.includes(s))
    }
  }
  return []
}
