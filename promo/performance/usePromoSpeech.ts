'use client';
import { useEffect, useRef, useState } from 'react';

export const SAMPLE_PROMO = "You really think you're ready for me? Then prove it.";

// Existing local speech prototype, isolated from the Phase 1 face controller.
// Mouth articulation is intentionally deferred; speech never drives random motion.
export function usePromoSpeech() {
  const [text, setText] = useState(SAMPLE_PROMO);
  const [status, setStatus] = useState('READY');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const stop = () => {
    if (utterance.current) { utterance.current.onend = null; utterance.current.onerror = null; }
    utterance.current = null;
    window.speechSynthesis?.cancel();
    setStatus('READY');
  };
  const deliver = () => {
    stop();
    if (!text.trim()) return;
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setStatus('SPEECH UNAVAILABLE IN THIS BROWSER');
      return;
    }
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = .92;
    speech.pitch = .72;
    speech.volume = 1;
    speech.onend = () => setStatus('PROMO COMPLETE');
    speech.onerror = () => setStatus('SPEECH UNAVAILABLE IN THIS BROWSER');
    utterance.current = speech;
    setStatus('SPEAKING');
    window.speechSynthesis.speak(speech);
  };
  useEffect(() => () => {
    if (utterance.current) { utterance.current.onend = null; utterance.current.onerror = null; }
    window.speechSynthesis?.cancel();
  }, []);
  return { text, setText, status, stop, deliver };
}
