// Lightweight rule-based NLP for shopping voice commands.
// Returns an intent object the app can act on. No external services required,
// which keeps the app fully client-side and free to host.
//
// Supported intents: add, remove, search, clear, unknown.
// Handles varied phrasing, quantities (digits + number words), units,
// and multiple items joined by "and".

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, dozen: 12, couple: 2,
  fifteen: 15, twenty: 20, thirty: 30, fifty: 50, hundred: 100,
}

const UNITS = [
  'bottle', 'bottles', 'can', 'cans', 'box', 'boxes', 'bag', 'bags', 'pack',
  'packs', 'packet', 'packets', 'carton', 'cartons', 'jar', 'jars', 'loaf',
  'loaves', 'bunch', 'bunches', 'dozen', 'piece', 'pieces', 'kg', 'kilo',
  'kilos', 'kilogram', 'kilograms', 'g', 'gram', 'grams', 'lb', 'lbs', 'pound',
  'pounds', 'liter', 'liters', 'litre', 'litres', 'l', 'ml', 'oz', 'ounce',
  'ounces', 'gallon', 'gallons', 'cup', 'cups', 'dozen',
]

// Trigger phrases per intent. Longer/more specific phrases first.
const ADD_TRIGGERS = [
  'i want to buy', 'i would like to buy', "i'd like to buy", 'i want to add',
  'i need to buy', 'add to my list', 'put on my list', 'i want', 'i need',
  'i would like', "i'd like", 'add', 'buy', 'get', 'grab', 'purchase', 'put',
]
const REMOVE_TRIGGERS = [
  'remove', 'delete', 'take off', 'take out', 'drop', 'get rid of',
  'cross off', 'clear off',
]
const SEARCH_TRIGGERS = [
  'search for', 'search', 'find me', 'find', 'look for', 'look up',
  'do you have', 'show me',
]
const CLEAR_TRIGGERS = [
  'clear my list', 'clear the list', 'clear list', 'empty my list',
  'empty the list', 'clear everything', 'remove everything', 'delete everything',
  'start over', 'reset my list', 'clear all',
]

// Filler words to strip from the tail of an item phrase.
const FILLERS = [
  'to my list', 'to the list', 'on my list', 'on the list', 'from my list',
  'from the list', 'please', 'to my cart', 'for me',
]

function stripFillers(text) {
  let t = ' ' + text.trim() + ' '
  for (const f of FILLERS) {
    t = t.replace(new RegExp('\\s' + escapeRe(f) + '\\s', 'gi'), ' ')
  }
  return t.replace(/\s+/g, ' ').trim()
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function startsWithTrigger(text, triggers) {
  for (const t of triggers) {
    if (text === t || text.startsWith(t + ' ')) {
      return { matched: t, rest: text.slice(t.length).trim() }
    }
  }
  return null
}

function containsTrigger(text, triggers) {
  for (const t of triggers) {
    const idx = text.indexOf(t)
    if (idx !== -1) {
      return { matched: t, rest: text.slice(idx + t.length).trim() }
    }
  }
  return null
}

// Parse a single item phrase into { name, quantity, unit }.
function parseItem(phrase) {
  let words = stripFillers(phrase).toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return null

  let quantity = 1
  let unit = null

  // Leading quantity: digits or number word
  if (words.length && /^\d+$/.test(words[0])) {
    quantity = parseInt(words[0], 10)
    words = words.slice(1)
  } else if (words.length && NUMBER_WORDS[words[0]] != null) {
    // Don't consume "a"/"an" if it's the only word left meaning the item
    if (!((words[0] === 'a' || words[0] === 'an') && words.length === 1)) {
      quantity = NUMBER_WORDS[words[0]]
      words = words.slice(1)
    }
  }

  // Optional unit + "of": "bottles of water", "kg of rice"
  if (words.length && UNITS.includes(words[0])) {
    unit = words[0]
    words = words.slice(1)
    if (words[0] === 'of') words = words.slice(1)
  }

  const name = words.join(' ').trim()
  if (!name) return null
  return { name: titleCase(name), quantity, unit }
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

// Split "milk and eggs and bread" / "milk, eggs, bread" into parts.
function splitItems(text) {
  return text
    .split(/\s*,\s*|\s+and\s+|\s*&\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseCommand(rawInput) {
  const input = (rawInput || '').toLowerCase().trim().replace(/[.!?]+$/, '')
  if (!input) return { intent: 'unknown', raw: rawInput }

  // 1. Clear (check first — most specific)
  if (containsTrigger(input, CLEAR_TRIGGERS)) {
    return { intent: 'clear', raw: rawInput }
  }

  // 2. Remove
  const rem = startsWithTrigger(input, REMOVE_TRIGGERS)
  if (rem) {
    const items = splitItems(rem.rest).map(parseItem).filter(Boolean)
    if (items.length) return { intent: 'remove', items, raw: rawInput }
  }

  // 3. Search (needs a query after the trigger)
  const srch = startsWithTrigger(input, SEARCH_TRIGGERS)
  if (srch && srch.rest) {
    return { intent: 'search', query: stripFillers(srch.rest), raw: rawInput }
  }

  // 4. Add
  const addM = startsWithTrigger(input, ADD_TRIGGERS)
  if (addM) {
    const items = splitItems(addM.rest).map(parseItem).filter(Boolean)
    if (items.length) return { intent: 'add', items, raw: rawInput }
  }

  // 5. Fallback: if it's a short phrase with no verb, treat as an add.
  const bareItems = splitItems(input).map(parseItem).filter(Boolean)
  if (bareItems.length && input.split(/\s+/).length <= 6) {
    return { intent: 'add', items: bareItems, raw: rawInput, inferred: true }
  }

  return { intent: 'unknown', raw: rawInput }
}
