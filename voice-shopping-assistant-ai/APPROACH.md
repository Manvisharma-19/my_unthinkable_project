# Approach

**Architecture.** Voxa is a voice agent built with plain HTML, CSS, and vanilla
JavaScript (ES modules) — no framework, no build step. Voice input *and* spoken
replies use the browser's native Web Speech API, so it ships as free static
files with no keys required to work.

**Understanding — hybrid NLU.** A fast rule-based parser classifies each
utterance into an intent (add / remove / search / clear) and extracts items,
quantities, and units, handling varied phrasing and number words. On top, an
optional AI layer (Google Gemini free tier) understands free-form and recipe
requests — *"I'm making tacos, add what I need."* The AI path validates the
model's JSON and, on any error, falls back to the rule parser, so the app never
breaks and needs no setup by default.

**Agent feel.** A reactive orb shows idle / listening / thinking / speaking
states, a conversation feed logs the exchange, and Voxa confirms actions aloud.
An optional hands-free mode keeps the mic open.

**Smart features.** Keyword-based categorization; suggestions from purchase
history, seasonality, and staples; and price/brand-filtered search over a mock
catalog structured for a real API.

**UX.** Mobile-first, accessible, with live transcripts, toasts, loading states,
and graceful fallbacks throughout.
