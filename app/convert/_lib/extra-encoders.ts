import type { AudioCodec } from "mediabunny";

// Browsers can't encode MP3 or FLAC themselves. These WebAssembly encoders
// fill the gap; they're only downloaded the first time they're needed.
const EXTRA_ENCODERS: Partial<Record<AudioCodec, () => Promise<void>>> = {
  mp3: async () => (await import("@mediabunny/mp3-encoder")).registerMp3Encoder(),
  flac: async () => (await import("@mediabunny/flac-encoder")).registerFlacEncoder(),
};

const registered = new Set<AudioCodec>();

export async function ensureAudioEncoder(codec: AudioCodec): Promise<void> {
  const register = EXTRA_ENCODERS[codec];
  if (!register || registered.has(codec)) {
    return;
  }
  const { canEncodeAudio } = await import("mediabunny");
  if (!(await canEncodeAudio(codec))) {
    await register();
  }
  registered.add(codec);
}
