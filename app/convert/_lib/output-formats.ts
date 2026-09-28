import type { AudioCodec, OutputFormat, VideoCodec } from "mediabunny";
import type { OutputFormatId } from "@/app/convert/_lib/types";

type Mediabunny = typeof import("mediabunny");

// The codecs each format is written with, most compatible first. A source
// already in one of these is copied as-is when nothing else changes.
interface FormatCodecs {
  video: VideoCodec[];
  audio: AudioCodec[];
}

export const FORMAT_CODECS: Record<Exclude<OutputFormatId, "gif">, FormatCodecs> = {
  mp4: { video: ["avc", "hevc", "av1", "vp9"], audio: ["aac", "opus", "mp3"] },
  webm: { video: ["vp9", "vp8", "av1"], audio: ["opus", "vorbis"] },
  mov: { video: ["avc", "hevc", "prores"], audio: ["aac", "pcm-s16"] },
  mkv: { video: ["avc", "hevc", "vp9", "av1", "vp8"], audio: ["opus", "aac", "flac", "mp3", "vorbis"] },
  mp3: { video: [], audio: ["mp3"] },
  m4a: { video: [], audio: ["aac"] },
  wav: { video: [], audio: ["pcm-s16"] },
  ogg: { video: [], audio: ["opus", "vorbis"] },
  flac: { video: [], audio: ["flac"] },
  aac: { video: [], audio: ["aac"] },
};

export function createOutputFormat(
  mediabunny: Mediabunny,
  id: Exclude<OutputFormatId, "gif">
): OutputFormat {
  switch (id) {
    case "mp4":
    case "m4a":
      return new mediabunny.Mp4OutputFormat({ fastStart: "in-memory" });
    case "mov":
      return new mediabunny.MovOutputFormat({ fastStart: "in-memory" });
    case "webm":
      return new mediabunny.WebMOutputFormat();
    case "mkv":
      return new mediabunny.MkvOutputFormat();
    case "mp3":
      return new mediabunny.Mp3OutputFormat();
    case "wav":
      return new mediabunny.WavOutputFormat();
    case "ogg":
      return new mediabunny.OggOutputFormat();
    case "flac":
      return new mediabunny.FlacOutputFormat();
    case "aac":
      return new mediabunny.AdtsOutputFormat();
  }
}
