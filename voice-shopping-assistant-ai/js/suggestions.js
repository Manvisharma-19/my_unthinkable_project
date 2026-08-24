// Smart suggestion engine. Combines three signals:
//   1. History  - items the user buys often (from localStorage purchase history)
//   2. Seasonal - items in season this month
//   3. Staples  - common essentials the user hasn't added yet
// All logic is local so the app works with no backend / no API keys.

const STAPLES = ['milk', 'bread', 'eggs', 'butter', 'rice', 'onions', 'bananas']

// Month index (0=Jan) -> in-season produce
const SEASONAL = {
  0: ['oranges', 'grapefruit', 'kale'],
  1: ['oranges', 'lemons', 'broccoli'],
  2: ['spinach', 'peas', 'strawberries'],
  3: ['asparagus', 'strawberries', 'radishes'],
  4: ['strawberries', 'cherries', 'spinach'],
  5: ['blueberries', 'peaches', 'zucchini'],
  6: ['watermelon', 'corn', 'tomatoes'],
  7: ['peaches', 'tomatoes', 'bell peppers'],
  8: ['apples', 'grapes', 'pumpkin'],
  9: ['pumpkin', 'sweet potatoes', 'apples'],
  10: ['squash', 'cranberries', 'pomegranate'],
  11: ['pomegranate', 'oranges', 'brussels sprouts'],
}

// Reason-tagged suggestion. reason drives the label shown in the UI.
function makeSuggestion(name, reason) {
  return { name, reason }
}

export function getSuggestions(currentItems, history, max = 6) {
  const present = new Set(currentItems.map((i) => i.name.toLowerCase()))
  const suggestions = []
  const seen = new Set()

  const add = (name, reason) => {
    const key = name.toLowerCase()
    if (present.has(key) || seen.has(key)) return
    seen.add(key)
    suggestions.push(makeSuggestion(name, reason))
  }

  // 1. History: most frequently purchased items not on the list
  const freq = history || {}
  const ranked = Object.entries(freq).sort((a, b) => b[1] - a[1])
  for (const [name, count] of ranked) {
    if (count >= 2) add(name, 'running low')
  }

  // 2. Seasonal picks for the current month
  const month = new Date().getMonth()
  for (const name of SEASONAL[month] || []) {
    add(name, 'in season')
  }

  // 3. Staples the user hasn't added
  for (const name of STAPLES) {
    add(name, 'popular staple')
  }

  return suggestions.slice(0, max)
}

export const REASON_LABELS = {
  'running low': { text: 'You buy this often', color: '#FF7A1A' },
  'in season': { text: 'In season now', color: '#16A34A' },
  'popular staple': { text: 'Popular staple', color: '#6B7A70' },
}
