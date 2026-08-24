// A small mock product catalog so voice search ("find organic apples under $5")
// can return realistic results without any paid API. In production this would be
// a call to a products/search backend.

export const CATALOG = [
  { name: 'Organic Fuji Apples', brand: 'FreshFarm', size: '1 kg', price: 4.29, tags: ['organic', 'apple', 'apples', 'fruit'] },
  { name: 'Red Delicious Apples', brand: 'Valley', size: '1 kg', price: 2.99, tags: ['apple', 'apples', 'fruit'] },
  { name: 'Granny Smith Apples', brand: 'Orchard', size: '1.5 kg', price: 5.49, tags: ['apple', 'apples', 'fruit', 'green'] },
  { name: 'Organic Bananas', brand: 'FreshFarm', size: '1 bunch', price: 1.99, tags: ['organic', 'banana', 'bananas', 'fruit'] },
  { name: 'Whole Milk', brand: 'DairyPure', size: '1 gal', price: 3.49, tags: ['milk', 'dairy'] },
  { name: 'Almond Milk', brand: 'Silk', size: '1.75 L', price: 3.99, tags: ['almond milk', 'milk', 'plant-based', 'dairy-free'] },
  { name: 'Oat Milk', brand: 'Oatly', size: '1 L', price: 4.49, tags: ['oat milk', 'milk', 'plant-based', 'dairy-free'] },
  { name: 'Organic Free-Range Eggs', brand: 'HappyHen', size: '12 ct', price: 5.99, tags: ['organic', 'eggs', 'egg', 'dairy'] },
  { name: 'Large Eggs', brand: 'Valley', size: '12 ct', price: 2.79, tags: ['eggs', 'egg', 'dairy'] },
  { name: 'Whole Wheat Bread', brand: 'BakeHouse', size: '700 g', price: 3.19, tags: ['bread', 'wheat', 'bakery'] },
  { name: 'Sourdough Loaf', brand: 'ArtisanCo', size: '500 g', price: 4.99, tags: ['bread', 'sourdough', 'bakery'] },
  { name: 'Cheddar Cheese', brand: 'DairyPure', size: '400 g', price: 5.29, tags: ['cheese', 'cheddar', 'dairy'] },
  { name: 'Colgate Toothpaste', brand: 'Colgate', size: '100 ml', price: 2.49, tags: ['toothpaste', 'household', 'dental'] },
  { name: 'Sensodyne Toothpaste', brand: 'Sensodyne', size: '75 ml', price: 4.79, tags: ['toothpaste', 'household', 'dental'] },
  { name: 'Whitening Toothpaste', brand: 'CrestPro', size: '110 ml', price: 6.49, tags: ['toothpaste', 'household', 'dental'] },
  { name: 'Organic Baby Spinach', brand: 'FreshFarm', size: '200 g', price: 3.49, tags: ['organic', 'spinach', 'greens', 'vegetable'] },
  { name: 'Roma Tomatoes', brand: 'Valley', size: '1 kg', price: 2.89, tags: ['tomato', 'tomatoes', 'vegetable'] },
  { name: 'Basmati Rice', brand: 'RoyalGrain', size: '2 kg', price: 7.99, tags: ['rice', 'basmati', 'pantry'] },
  { name: 'Sparkling Water', brand: 'LaCroix', size: '8 x 355 ml', price: 4.49, tags: ['water', 'sparkling', 'beverages'] },
  { name: 'Spring Water', brand: 'AquaPure', size: '6 x 1 L', price: 3.29, tags: ['water', 'beverages'] },
]

const STOPWORDS = new Set([
  'find', 'me', 'a', 'an', 'the', 'some', 'for', 'of', 'with', 'please',
  'search', 'look', 'up', 'buy', 'get', 'show', 'i', 'want', 'need',
  'under', 'below', 'over', 'above', 'less', 'than', 'cheaper', 'brand',
])

// Parse a search phrase like "organic apples under $5" or "toothpaste below 5"
export function parseSearchQuery(phrase) {
  const text = phrase.toLowerCase()
  let maxPrice = null
  let minPrice = null

  const under = text.match(/(?:under|below|less than|cheaper than)\s*\$?\s*(\d+(?:\.\d+)?)/)
  if (under) maxPrice = parseFloat(under[1])
  const over = text.match(/(?:over|above|more than)\s*\$?\s*(\d+(?:\.\d+)?)/)
  if (over) minPrice = parseFloat(over[1])

  // Keywords = remaining meaningful words (strip prices/symbols)
  const cleaned = text
    .replace(/\$?\s*\d+(?:\.\d+)?/g, ' ')
    .replace(/[^a-z\s-]/g, ' ')
  const keywords = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !STOPWORDS.has(w))

  return { keywords, minPrice, maxPrice }
}

export function searchCatalog(phrase) {
  const { keywords, minPrice, maxPrice } = parseSearchQuery(phrase)

  let results = CATALOG.map((product) => {
    const haystack = (product.name + ' ' + product.brand + ' ' + product.tags.join(' ')).toLowerCase()
    let score = 0
    for (const kw of keywords) {
      if (haystack.includes(kw)) score += 1
    }
    return { product, score }
  })

  // If we have keywords, require at least one match; otherwise show all
  if (keywords.length > 0) results = results.filter((r) => r.score > 0)

  results = results.filter(({ product }) => {
    if (maxPrice != null && product.price > maxPrice) return false
    if (minPrice != null && product.price < minPrice) return false
    return true
  })

  results.sort((a, b) => b.score - a.score || a.product.price - b.product.price)
  return { items: results.map((r) => r.product), keywords, minPrice, maxPrice }
}
