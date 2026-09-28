import type { MediaInfo } from "@/app/convert/_lib/types";

const CODEC_NAMES: Record<string, string> = {
  avc: "H.264",
  hevc: "HEVC",
  av1: "AV1",
  vp9: "VP9",
  vp8: "VP8",
  prores: "ProRes",
  aac: "AAC",
  opus: "Opus",
  mp3: "MP3",
  vorbis: "Vorbis",
  flac: "FLAC",
};

export function codecName(codec: string | null): string | null {
  if (!codec) {
    return null;
  }
  if (codec.startsWith("pcm") || codec === "ulaw" || codec === "alaw") {
    return "PCM";
  }
  return CODEC_NAMES[codec] ?? codec.toUpperCase();
}

export async function readMediaInfo(file: Blob): Promise<MediaInfo> {
  const { ALL_FORMATS, BlobSource, Input } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const format = await input.getFormat();
    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!videoTrack && !audioTrack) {
      throw new Error("This file has no video or audio in it.");
    }
    return {
      duration: await input.computeDuration(),
      container: format.name,
      video: videoTrack
        ? {
            codec: codecName(await videoTrack.getCodec()),
            width: await videoTrack.getDisplayWidth(),
            height: await videoTrack.getDisplayHeight(),
          }
        : null,
      audio: audioTrack
        ? {
            codec: codecName(await audioTrack.getCodec()),
            sampleRate: await audioTrack.getSampleRate(),
            channels: await audioTrack.getNumberOfChannels(),
          }
        : null,
    };
  } finally {
    input.dispose();
  }
}
