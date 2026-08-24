// Optional AI understanding layer.
//
// When the user supplies a free Google Gemini API key (Settings -> AI mode),
// utterances are sent to the model, which returns a structured intent. This
// handles free-form and conversational input the rule parser can't, e.g.
// "I'm making tacos tonight, add what I need" or "get rid of the dairy stuff".
//
// It ALWAYS degrades gracefully: on a missing key, network error, bad response,
// or invalid shape, it returns null and the caller falls back to the local
// rule-based parser. The app therefore works fully with zero setup.

// Gemini's free-tier flash model. If Google renames models, change this one line.
const DEFAULT_MODEL = 'gemini-1.5-flash'

const SYSTEM_PROMPT = `You convert a shopping voice command into JSON.
Return ONLY a JSON object, no markdown, no explanation.

Schema:
{
  "intent": "add" | "remove" | "search" | "clear" | "unknown",
  "items": [ { "name": string, "quantity": number, "unit": string|null } ],
  "query": string|null,
  "reply": string
}

Rules:
- "add": one or more items the user wants on the list. Expand implied items
  (e.g. a recipe) into concrete grocery items. quantity defaults to 1.
- "remove": items to take off the list.
- "search": user wants to find/buy a product now; put the search phrase in "query".
- "clear": empty the whole list. items = [].
- "unknown": if it isn't a shopping command.
- "reply": one short, friendly spoken confirmation (max 12 words).
- Item names should be simple and singular-ish ("apple", "chicken breast").

Examples:
Input: "add milk and a dozen eggs"
Output: {"intent":"add","items":[{"name":"milk","quantity":1,"unit":null},{"name":"eggs","quantity":12,"unit":null}],"query":null,"reply":"Added milk and a dozen eggs."}
Input: "I'm making guacamole, add what I need"
Output: {"intent":"add","items":[{"name":"avocado","quantity":3,"unit":null},{"name":"lime","quantity":2,"unit":null},{"name":"onion","quantity":1,"unit":null},{"name":"cilantro","quantity":1,"unit":null},{"name":"tomato","quantity":2,"unit":null}],"query":null,"reply":"Added guacamole ingredients."}
Input: "find me toothpaste under five dollars"
Output: {"intent":"search","items":[],"query":"toothpaste under $5","reply":"Searching toothpaste under five dollars."}
Input: "clear everything"
Output: {"intent":"clear","items":[],"query":null,"reply":"Cleared your list."}`

// Validate + normalize the model output into the shape the app expects.
function normalize(obj) {
  if (!obj || typeof obj !== 'object') return null
  const intent = obj.intent
  if (!['add', 'remove', 'search', 'clear', 'unknown'].includes(intent)) return null

  const items = Array.isArray(obj.items)
    ? obj.items
        .map((it) => ({
          name: String(it?.name || '').trim(),
          quantity: Number.isFinite(it?.quantity) ? Math.max(1, Math.round(it.quantity)) : 1,
          unit: it?.unit ? String(it.unit) : null,
        }))
        .filter((it) => it.name)
    : []

  if ((intent === 'add' || intent === 'remove') && items.length === 0) return null
  if (intent === 'search' && !obj.query) return null

  return {
    intent,
    items,
    query: obj.query ? String(obj.query) : null,
    reply: obj.reply ? String(obj.reply) : null,
    source: 'ai',
  }
}

function extractJson(text) {
  if (!text) return null
  // Strip code fences if the model added them, then grab the first {...} block.
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

// Returns a normalized intent object, or null to signal "fall back to rules".
export async function aiParse(text, { apiKey, model = DEFAULT_MODEL } = {}) {
  if (!apiKey || !text) return null

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const data = await res.json()
    const partText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    return normalize(extractJson(partText))
  } catch {
    return null // network/timeout/parse error -> caller uses rule parser
  }
}

export { normalize as _normalizeForTest, extractJson as _extractJsonForTest }
