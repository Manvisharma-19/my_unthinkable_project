// Voxa — AI voice shopping agent. Vanilla JS, no build step.

import { createSpeech, speak, cancelSpeech, SPEECH_SUPPORTED, TTS_SUPPORTED } from './speech.js'
import { aiParse } from './ai.js'
import { parseCommand } from './nlp.js'
import { categorize, CATEGORY_META } from './categories.js'
import { getSuggestions, REASON_LABELS } from './suggestions.js'
import { getSubstitutes } from './substitutes.js'
import { searchCatalog } from './catalog.js'
import { LANGUAGES } from './languages.js'

// ---- Storage ------------------------------------------------------------
const LS = {
  items: 'voxa.items',
  history: 'voxa.history',
  lang: 'voxa.lang',
  settings: 'voxa.settings',
}
function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback }
  catch { return fallback }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

// ---- State --------------------------------------------------------------
const state = {
  items: load(LS.items, []),
  history: load(LS.history, {}),
  lang: load(LS.lang, 'en-US'),
  settings: Object.assign(
    { aiEnabled: false, apiKey: '', voiceReplies: true, continuous: false },
    load(LS.settings, {}),
  ),
  search: null,
  searching: false,
  feed: [],
  status: 'idle', // idle | listening | thinking | speaking
}

let idCounter = 0
const newId = () => `${Date.now()}-${idCounter++}`

// ---- DOM refs -----------------------------------------------------------
const el = {}
;[
  'banner', 'orb', 'orb-icon', 'agent-status', 'agent-transcript', 'feed',
  'search-panel', 'list-body', 'list-count', 'clear-all', 'suggestions-panel',
  'typed-input', 'send-btn', 'settings-btn', 'drawer', 'drawer-close', 'scrim',
  'lang-select', 'tts-toggle', 'cont-toggle', 'ai-toggle', 'ai-key-row',
  'api-key', 'mode-tag',
].forEach((id) => (el[id] = document.getElementById(id)))

// ---- Helpers ------------------------------------------------------------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)
function listWords(names) {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// ---- Agent status / feed ------------------------------------------------
const STATUS_TEXT = {
  idle: () => (state.items.length ? `${state.items.filter((i) => !i.done).length} to buy` : 'Tap to speak'),
  listening: () => 'Listening\u2026',
  thinking: () => 'Thinking\u2026',
  speaking: () => 'Voxa is replying',
}
function setStatus(status) {
  state.status = status
  el.orb.classList.remove('listening', 'thinking', 'speaking')
  if (status !== 'idle') el.orb.classList.add(status)
  el.orb.setAttribute('aria-label', status === 'listening' ? 'Stop listening' : 'Start voice input')
  el['orb-icon'].innerHTML = ICONS[status] || ICONS.idle
  el['agent-status'].textContent = STATUS_TEXT[status]()
  if (status !== 'listening') el['agent-transcript'].textContent = ''
}
function showInterim(text) {
  el['agent-transcript'].innerHTML = `<span class="interim">${escapeHtml(text)}</span>`
}
function pushFeed(role, text) {
  state.feed.push({ role, text })
  state.feed = state.feed.slice(-6) // keep it short
  renderFeed()
}
function renderFeed() {
  el.feed.innerHTML = state.feed
    .map((m) =>
      m.role === 'you'
        ? `<div class="feed-row you"><div class="bubble">${escapeHtml(m.text)}</div></div>`
        : `<div class="feed-row voxa"><div class="bubble"><span class="who">Voxa</span>${escapeHtml(m.text)}</div></div>`,
    )
    .join('')
  el.feed.scrollIntoView({ block: 'nearest' })
}

// ---- Actions ------------------------------------------------------------
function recordHistory(name) {
  const k = name.toLowerCase()
  state.history[k] = (state.history[k] || 0) + 1
  save(LS.history, state.history)
}
function addItem(name, quantity = 1, unit = null, { record = true } = {}) {
  const clean = name.trim()
  if (!clean) return null
  const category = categorize(clean)
  const existing = state.items.find((i) => i.name.toLowerCase() === clean.toLowerCase())
  if (existing) existing.quantity += quantity
  else state.items.push({ id: newId(), name: clean, quantity, unit, category, done: false })
  if (record) recordHistory(clean)
  persist()
  return category
}
function removeByName(name) {
  const key = name.trim().toLowerCase()
  const before = state.items.length
  state.items = state.items.filter((i) => !(i.name.toLowerCase() === key || i.name.toLowerCase().includes(key)))
  persist()
  return state.items.length < before
}
function removeById(id) { state.items = state.items.filter((i) => i.id !== id); persist() }
function toggleDone(id) { const it = state.items.find((i) => i.id === id); if (it) it.done = !it.done; persist() }
function changeQty(id, d) {
  const it = state.items.find((i) => i.id === id)
  if (!it) return
  it.quantity = Math.max(0, it.quantity + d)
  if (it.quantity === 0) state.items = state.items.filter((i) => i.id !== id)
  persist()
}
function clearList() { state.items = []; persist() }
function runSearch(query) {
  state.search = null; state.searching = true; renderSearch()
  setTimeout(() => {
    state.search = { ...searchCatalog(query), query }
    state.searching = false; renderSearch()
  }, 550)
}

// ---- Command handling (AI first, rules as fallback) ---------------------
async function handleCommand(text) {
  if (!text) return
  cancelSpeech()
  pushFeed('you', text)
  setStatus('thinking')

  let cmd = null
  const s = state.settings
  if (s.aiEnabled && s.apiKey) {
    cmd = await aiParse(text, { apiKey: s.apiKey })
  }
  if (!cmd) cmd = parseCommand(text) // graceful fallback

  const reply = executeCommand(cmd)
  pushFeed('voxa', reply)

  if (state.settings.voiceReplies && TTS_SUPPORTED) {
    setStatus('speaking')
    speak(reply, {
      lang: state.lang,
      onEnd: () => setStatus(state.settings.continuous && SPEECH_SUPPORTED ? 'listening' : 'idle'),
    })
  } else {
    setStatus('idle')
  }
}

// Runs the intent and returns a spoken/written reply string.
function executeCommand(cmd) {
  switch (cmd.intent) {
    case 'add': {
      const names = []
      for (const it of cmd.items) {
        addItem(it.name, it.quantity || 1, it.unit || null)
        names.push(it.quantity > 1 ? `${it.quantity} ${it.name}` : it.name)
      }
      const subs = getSubstitutes(cmd.items[0].name)
      const tip = subs.length ? ` Tip: try ${subs[0]} instead.` : ''
      return cmd.reply || `Added ${listWords(names)}.${tip}`
    }
    case 'remove': {
      const removed = []
      for (const it of cmd.items) if (removeByName(it.name)) removed.push(it.name)
      return removed.length
        ? cmd.reply || `Removed ${listWords(removed)}.`
        : "I couldn't find that on your list."
    }
    case 'search': {
      runSearch(cmd.query)
      return cmd.reply || `Here's what I found for "${cmd.query}".`
    }
    case 'clear':
      clearList()
      return cmd.reply || 'Cleared your list.'
    default:
      return 'I didn\u2019t catch a command. Try "add milk" or "find apples".'
  }
}

// ---- Rendering ----------------------------------------------------------
const CAT_ORDER = ['Produce', 'Dairy', 'Bakery', 'Meat', 'Seafood', 'Frozen', 'Pantry', 'Beverages', 'Snacks', 'Household', 'Other']

function renderList() {
  const items = state.items
  el['list-count'].textContent = items.length
  el['list-count'].style.display = items.length ? '' : 'none'
  el['clear-all'].style.display = items.length ? '' : 'none'
  if (items.length === 0) {
    el['list-body'].innerHTML = `
      <div class="empty">
        <div class="empty__emoji">\u{1F6D2}</div>
        <h3>Your list is empty</h3>
        <p>Tap the orb and say <code>add milk and eggs</code> or
        <code>buy 2 bottles of water</code>.</p>
      </div>`
    return
  }
  const groups = {}
  for (const it of items) (groups[it.category] ||= []).push(it)
  el['list-body'].innerHTML = CAT_ORDER.filter((c) => groups[c]).map((cat) => {
    const meta = CATEGORY_META[cat] || CATEGORY_META.Other
    const rows = groups[cat].map((item) => {
      const plural = item.unit && item.quantity > 1 && !item.unit.endsWith('s') ? 's' : ''
      const metaLine = item.unit ? `<div class="item__meta">${item.quantity} ${escapeHtml(item.unit)}${plural}</div>` : ''
      return `
        <div class="item ${item.done ? 'done' : ''}">
          <button class="check ${item.done ? 'on' : ''}" data-action="toggle" data-id="${item.id}" aria-label="Toggle ${escapeHtml(item.name)}" aria-pressed="${item.done}">${item.done ? ICONS.check : ''}</button>
          <div class="item__body"><div class="item__name">${escapeHtml(item.name)}</div>${metaLine}</div>
          <div class="qty" role="group" aria-label="Quantity for ${escapeHtml(item.name)}">
            <button data-action="dec" data-id="${item.id}" aria-label="Decrease">\u2212</button>
            <span>${item.quantity}</span>
            <button data-action="inc" data-id="${item.id}" aria-label="Increase">+</button>
          </div>
          <button class="icon-btn" data-action="remove" data-id="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">${ICONS.trash}</button>
        </div>`
    }).join('')
    return `<div class="cat-group"><div class="cat-head"><span class="dot" style="background:${meta.color}"></span>${meta.icon} ${cat}</div>${rows}</div>`
  }).join('')
}

function renderSuggestions() {
  const sugg = getSuggestions(state.items, state.history)
  if (!sugg.length) { el['suggestions-panel'].innerHTML = ''; return }
  const chips = sugg.map((s) => {
    const label = REASON_LABELS[s.reason] || REASON_LABELS['popular staple']
    return `<button class="chip" data-action="add-suggestion" data-name="${escapeHtml(s.name)}" aria-label="Add ${escapeHtml(s.name)} (${label.text})"><span class="plus">+</span>${escapeHtml(capitalize(s.name))}<span class="why" style="background:${label.color}1a;color:${label.color}">${label.text}</span></button>`
  }).join('')
  el['suggestions-panel'].innerHTML = `<div class="card card-pad"><div class="section-title">\u2728 Smart suggestions</div><div class="chips">${chips}</div></div>`
}

function renderSearch() {
  const { search, searching } = state
  if (!searching && !search) { el['search-panel'].innerHTML = ''; return }
  let inner = ''
  if (searching) inner = `<div class="loading-row"><span class="spinner"></span> Searching products\u2026</div>`
  else if (search) {
    const summary = (search.items.length > 0
      ? `${search.items.length} result${search.items.length > 1 ? 's' : ''} for "${escapeHtml(search.query)}"`
      : `No products matched "${escapeHtml(search.query)}"`) + (search.maxPrice != null ? ` \u00B7 under $${search.maxPrice}` : '')
    const results = search.items.map((p) => `
      <div class="result">
        <div class="result__body"><div class="result__name">${escapeHtml(p.name)}</div><div class="result__meta">${escapeHtml(p.brand)} \u00B7 ${escapeHtml(p.size)}</div></div>
        <div class="result__price">$${p.price.toFixed(2)}</div>
        <button class="result__add" data-action="add-search" data-name="${escapeHtml(p.name)}">Add</button>
      </div>`).join('')
    inner = `<div class="search-summary">${summary}</div><div class="results">${results}</div>`
  }
  el['search-panel'].innerHTML = `<div class="card card-pad"><div class="section-title">\u{1F50D} Search ${search ? '<button class="linkish" data-action="clear-search" style="margin-left:auto">Clear</button>' : ''}</div>${inner}</div>`
}

function persist() {
  save(LS.items, state.items)
  renderList()
  renderSuggestions()
  if (state.status === 'idle') el['agent-status'].textContent = STATUS_TEXT.idle()
}

// ---- Icons --------------------------------------------------------------
const ICONS = {
  idle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
  listening: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>`,
  thinking: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>`,
  speaking: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="10" x2="4" y2="14"/><line x1="9" y1="6" x2="9" y2="18"/><line x1="14" y1="9" x2="14" y2="15"/><line x1="19" y1="7" x2="19" y2="17"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
}

// ---- Speech agent -------------------------------------------------------
const speechAgent = createSpeech({
  lang: state.lang,
  onResult: (text) => handleCommand(text),
  onInterim: (text) => { setStatus('listening'); showInterim(text) },
  onStart: () => setStatus('listening'),
  onEnd: () => { if (state.status === 'listening') setStatus('idle') },
  onError: (msg) => { pushFeed('voxa', msg); setStatus('idle') },
})
speechAgent.setContinuous(state.settings.continuous)

// ---- Settings drawer ----------------------------------------------------
function openDrawer() { el.drawer.classList.add('open'); el.scrim.classList.add('open'); el.drawer.setAttribute('aria-hidden', 'false') }
function closeDrawer() { el.drawer.classList.remove('open'); el.scrim.classList.remove('open'); el.drawer.setAttribute('aria-hidden', 'true') }

function setSwitch(node, on) { node.setAttribute('aria-checked', on ? 'true' : 'false') }
function applyModeTag() {
  const ai = state.settings.aiEnabled && state.settings.apiKey
  el['mode-tag'].textContent = ai ? 'AI mode' : 'rule-based'
  el['mode-tag'].classList.toggle('ai', !!ai)
}
function saveSettings() { save(LS.settings, state.settings); applyModeTag() }

// ---- Init ---------------------------------------------------------------
function init() {
  // Language options
  el['lang-select'].innerHTML = LANGUAGES.map((l) => `<option value="${l.code}">${l.flag} ${l.label}</option>`).join('')
  el['lang-select'].value = state.lang
  el['lang-select'].addEventListener('change', (e) => {
    state.lang = e.target.value; save(LS.lang, state.lang); speechAgent.setLang(state.lang)
  })

  // Reflect stored settings in the UI
  setSwitch(el['tts-toggle'], state.settings.voiceReplies && TTS_SUPPORTED)
  setSwitch(el['cont-toggle'], state.settings.continuous)
  setSwitch(el['ai-toggle'], state.settings.aiEnabled)
  el['api-key'].value = state.settings.apiKey || ''
  el['ai-key-row'].style.display = state.settings.aiEnabled ? '' : 'none'
  applyModeTag()

  // Orb + mic support
  if (!SPEECH_SUPPORTED) {
    el.orb.setAttribute('aria-disabled', 'true')
    el.banner.style.display = 'flex'
    el['agent-status'].textContent = 'Type below to add items'
  }
  el.orb.addEventListener('click', () => { if (SPEECH_SUPPORTED) speechAgent.toggle() })

  // Typed dock
  const submitTyped = () => { const t = el['typed-input'].value.trim(); if (!t) return; handleCommand(t); el['typed-input'].value = '' }
  el['send-btn'].addEventListener('click', submitTyped)
  el['typed-input'].addEventListener('keydown', (e) => { if (e.key === 'Enter') submitTyped() })

  // Clear all
  el['clear-all'].addEventListener('click', () => { clearList(); pushFeed('voxa', 'Cleared your list.') })

  // Settings open/close
  el['settings-btn'].addEventListener('click', openDrawer)
  el['drawer-close'].addEventListener('click', closeDrawer)
  el.scrim.addEventListener('click', closeDrawer)

  // Toggles
  el['tts-toggle'].addEventListener('click', () => {
    if (!TTS_SUPPORTED) return
    state.settings.voiceReplies = !state.settings.voiceReplies
    setSwitch(el['tts-toggle'], state.settings.voiceReplies); saveSettings()
  })
  el['cont-toggle'].addEventListener('click', () => {
    state.settings.continuous = !state.settings.continuous
    setSwitch(el['cont-toggle'], state.settings.continuous)
    speechAgent.setContinuous(state.settings.continuous); saveSettings()
  })
  el['ai-toggle'].addEventListener('click', () => {
    state.settings.aiEnabled = !state.settings.aiEnabled
    setSwitch(el['ai-toggle'], state.settings.aiEnabled)
    el['ai-key-row'].style.display = state.settings.aiEnabled ? '' : 'none'
    saveSettings()
  })
  el['api-key'].addEventListener('input', (e) => { state.settings.apiKey = e.target.value.trim(); saveSettings() })

  // Event delegation for dynamic buttons
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const { action, id, name } = btn.dataset
    switch (action) {
      case 'toggle': toggleDone(id); break
      case 'inc': changeQty(id, 1); break
      case 'dec': changeQty(id, -1); break
      case 'remove': removeById(id); break
      case 'add-suggestion':
      case 'add-search': addItem(name); pushFeed('voxa', `Added ${name}.`); break
      case 'clear-search': state.search = null; renderSearch(); break
    }
  })

  // First paint
  setStatus('idle')
  renderList(); renderSuggestions(); renderSearch()
}

init()
