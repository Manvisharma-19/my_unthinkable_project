# Voxa — AI Voice Shopping Agent

A voice-first shopping assistant that **listens, understands, and talks back**.
Speak naturally — *"add milk and eggs"*, *"buy 2 bottles of water"*,
*"find toothpaste under $5"* — and Voxa parses it, organizes your list, suggests
what you might need, and confirms out loud.

**Live demo:** _<https://manvi-unthinkable-voice-commanding.netlify.app/>_

---

## Full feature list

**Voice input**
- Voice command recognition via the Web Speech API
- Natural-language parsing for varied phrasing — *"I need apples"*,
  *"I want to buy bananas"*, *"add bananas to my list"*
- Multilingual voice input & replies (English, Spanish, French, German, Hindi,
  Italian, Portuguese)
- Typed-command fallback for browsers without speech support

**Smart suggestions** — history-based ("you buy this often"), seasonal produce,
and staples, plus substitute tips (e.g. almond milk for milk).

**List management** — add / remove / modify by voice or tap, automatic
categorization (Produce, Dairy, Bakery…), quantity + unit parsing
(*"add 2 bottles of water"*).

**Voice search** — product search with price/brand filtering
(*"find toothpaste under $5"*) against a mock catalog.

**UI/UX** — agent-forward mobile-first design, real-time transcript, confirmation
toasts, loading states, a settings drawer, keyboard accessibility, and
`prefers-reduced-motion` support.

---

## Run it locally

The app uses ES modules, so serve it over `http://` (don't open the file
directly). **No npm required** — pick one:

**VS Code Live Server (easiest):** install the *Live Server* extension, then
right-click `index.html` → **Open with Live Server**.

**Python:**
```bash
python3 -m http.server 8000
```
Then open http://localhost:8000.

> Voice needs a secure context (`https` or `localhost`), so use a server or the
> deployed site rather than double-clicking the file. Chrome, Edge, and Safari
> support the Web Speech API; Firefox falls back to typing.

### Turning on AI mode (optional)
1. Get a free API key from Google AI Studio (aistudio.google.com).
2. In the app, open **Settings (gear icon) → AI understanding → paste your key**.
3. The key is stored only in your browser. If Google renames its models, change
   the one model name at the top of `js/ai.js`.

---

## Deploy (no build step)

**Netlify Drop (~30 sec):** go to [app.netlify.com/drop](https://app.netlify.com/drop)
and drag the project folder onto the page. Instant HTTPS URL.

**GitHub Pages:** push to GitHub, then **Settings → Pages → Deploy from a
branch → `main` / root**.

**Vercel:** import the repo, framework preset **Other**, build command empty,
output directory `./`.

---

## Push to GitHub

```bash
git init
git add .
git commit -m "Voxa: AI voice shopping agent"
git branch -M main
git remote add origin https://github.com/<your-username>/voice-shopping-assistant.git
git push -u origin main
```

Create the empty repo first at github.com → **New repository** (don't add a
README there — this project already has one).

---

## Project structure

```
index.html            # Markup + loads CSS and the app module
css/styles.css        # Design system, agent orb states, drawer
js/
├── app.js            # State, agent flow, rendering, settings
├── speech.js         # Web Speech API: recognition + spoken replies
├── ai.js             # Optional Gemini NLU with graceful fallback
├── nlp.js            # Rule-based command parser (always-on fallback)
├── categories.js     # Auto-categorization keyword map
├── suggestions.js    # History / seasonal / staple suggestions
├── substitutes.js    # Alternative-product mapping
├── catalog.js        # Mock product catalog + price-filter search
└── languages.js      # Supported voice languages
```

## Tech

Vanilla JavaScript (ES modules) · Web Speech API (recognition + synthesis) ·
Google Gemini (optional) · localStorage.
