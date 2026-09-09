/** Resolve from the browser's measured media duration; cancel all listeners on STOP. */
export function measuredAudioDuration(audio: HTMLAudioElement, signal: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', loaded);
      audio.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted);
    };
    function loaded() {
      cleanup();
      const ms = audio.duration * 1000;
      if (!Number.isFinite(ms) || ms <= 0) reject(new Error('Invalid generated audio duration'));
      else resolve(ms);
    }
    function failed() { cleanup(); reject(new Error('Generated audio metadata failed')); }
    function aborted() { cleanup(); reject(new Error('Synthesis cancelled')); }
    audio.addEventListener('loadedmetadata', loaded, { once: true });
    audio.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted();
    else audio.load();
  });
}
