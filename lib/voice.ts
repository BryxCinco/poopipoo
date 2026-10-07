import type { Locale } from "@/lib/i18n/config";

/**
 * Spoken directions with the browser's Web Speech API (no network, free).
 * Tagalog: prefers a Filipino voice; most devices don't have one, so the
 * default voice reads the Filipino text instead. English: an English voice.
 */

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(locale: Locale): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const lang = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace("_", "-");
  if (locale === "en") {
    return voices.find((v) => lang(v) === "en-ph") ?? voices.find((v) => lang(v).startsWith("en")) ?? null;
  }
  return voices.find((v) => lang(v).startsWith("fil")) ?? voices.find((v) => lang(v).startsWith("tl")) ?? null;
}

/** Speaks `text`, interrupting anything still being spoken (old directions are stale). */
export function speak(text: string, locale: Locale): void {
  if (!isSpeechSupported()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale === "en" ? "en-PH" : "fil-PH";
  const voice = pickVoice(locale);
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
