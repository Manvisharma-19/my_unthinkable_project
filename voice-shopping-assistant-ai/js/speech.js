// Voice I/O for the agent: speech recognition (input) + speech synthesis
// (spoken replies). Plain factory, no framework, no build step.

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
export const SPEECH_SUPPORTED = !!SpeechRecognition
export const TTS_SUPPORTED = typeof window !== 'undefined' && 'speechSynthesis' in window

const FRIENDLY_ERRORS = {
  'not-allowed': 'Microphone access was blocked. Enable it in your browser settings.',
  'service-not-allowed': 'Microphone access was blocked. Enable it in your browser settings.',
  'no-speech': "Didn't catch that. Try again.",
  'audio-capture': 'No microphone found. Check that one is connected.',
  network: 'Network issue reaching the speech service. Check your connection.',
  aborted: null,
}

// ---- Speech recognition -------------------------------------------------
// options: { lang, onResult, onInterim, onStart, onEnd, onError }
export function createSpeech(options = {}) {
  let lang = options.lang || 'en-US'
  let listening = false
  let continuousMode = false
  let manualStop = false
  let recognition = null

  if (SpeechRecognition) {
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = lang
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      if (interim && options.onInterim) options.onInterim(interim)
      if (final && options.onResult) options.onResult(final.trim())
    }

    recognition.onerror = (event) => {
      const friendly = FRIENDLY_ERRORS[event.error]
      if (friendly !== null && options.onError) {
        options.onError(friendly || 'Something went wrong with voice input.')
      }
    }

    recognition.onend = () => {
      listening = false
      if (options.onEnd) options.onEnd()
      // In hands-free mode, keep the session going unless the user stopped it.
      if (continuousMode && !manualStop) {
        setTimeout(() => api.start(), 350)
      }
    }
  }

  const api = {
    supported: SPEECH_SUPPORTED,
    isListening: () => listening,
    setLang(newLang) {
      lang = newLang
      if (recognition) recognition.lang = newLang
    },
    setContinuous(on) {
      continuousMode = on
    },
    start() {
      if (!recognition || listening) return
      manualStop = false
      try {
        recognition.lang = lang
        recognition.start()
        listening = true
        if (options.onStart) options.onStart()
      } catch {
        /* start() throws if already running; ignore */
      }
    },
    stop() {
      if (!recognition) return
      manualStop = true
      try {
        recognition.stop()
      } catch {
        /* ignore */
      }
      listening = false
    },
    toggle() {
      if (listening) this.stop()
      else this.start()
    },
  }

  return api
}

// ---- Text to speech (the agent's voice) ---------------------------------
let cachedVoices = []
if (TTS_SUPPORTED) {
  const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices()
  }
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

function pickVoice(lang) {
  if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices()
  const base = lang.split('-')[0]
  return (
    cachedVoices.find((v) => v.lang === lang) ||
    cachedVoices.find((v) => v.lang && v.lang.startsWith(base)) ||
    null
  )
}

// Speak text aloud. onStart/onEnd let the UI show a "speaking" state.
export function speak(text, { lang = 'en-US', onStart, onEnd } = {}) {
  if (!TTS_SUPPORTED || !text) {
    if (onEnd) onEnd()
    return
  }
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    const voice = pickVoice(lang)
    if (voice) utter.voice = voice
    utter.rate = 1.02
    utter.pitch = 1
    if (onStart) utter.onstart = onStart
    utter.onend = () => onEnd && onEnd()
    utter.onerror = () => onEnd && onEnd()
    window.speechSynthesis.speak(utter)
  } catch {
    if (onEnd) onEnd()
  }
}

export function cancelSpeech() {
  if (TTS_SUPPORTED) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
  }
}
