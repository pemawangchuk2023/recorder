// Anything above this peak level counts as sound (about −66 dBFS).
const SOUND_THRESHOLD = 0.0005;
const CHECK_INTERVAL_MS = 500;

// Calls onSilent once if the analysed signal stays completely silent for
// `seconds`. Stops watching as soon as any sound comes through.
export function watchForSilence(
  analyser: AnalyserNode,
  seconds: number,
  onSilent: () => void
): () => void {
  const samples = new Float32Array(analyser.fftSize);
  const startedAt = performance.now();
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    if (samples.some((value) => Math.abs(value) > SOUND_THRESHOLD)) {
      clearInterval(timer);
    } else if (performance.now() - startedAt >= seconds * 1000) {
      clearInterval(timer);
      onSilent();
    }
  }, CHECK_INTERVAL_MS);
  return () => clearInterval(timer);
}
