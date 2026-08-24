// Languages offered for voice recognition. The `code` is a BCP-47 tag passed
// to the Web Speech API. NLP parsing is tuned for English; other languages
// still transcribe and add the raw item text, which covers the core use case.

export const LANGUAGES = [
  { code: 'en-US', label: 'English (US)', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'en-GB', label: 'English (UK)', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'es-ES', label: 'Espa\u00F1ol', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'fr-FR', label: 'Fran\u00E7ais', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'de-DE', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'hi-IN', label: 'Hindi', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'it-IT', label: 'Italiano', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'pt-BR', label: 'Portugu\u00EAs', flag: '\u{1F1E7}\u{1F1F7}' },
]
