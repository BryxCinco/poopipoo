/**
 * Spoken directions with the browser's Web Speech API (no network, free).
 * Prefers a Filipino voice; most devices don't have one, so the default voice
 * reads the Filipino text instead.
 */

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith("fil")) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("tl")) ??
    null
  );
}

/** Speaks `text`, interrupting anything still being spoken (old directions are stale). */
export function speak(text: string): void {
  if (!isSpeechSupported()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fil-PH";
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
