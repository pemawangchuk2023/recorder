import type {
  ConversionAudioOptions,
  ConversionVideoOptions,
  InputAudioTrack,
  InputVideoTrack,
} from "mediabunny";
import { volumeProcessor } from "@/app/convert/_lib/adjust-volume";
import { convertToGif } from "@/app/convert/_lib/convert-to-gif";
import { ensureAudioEncoder } from "@/app/convert/_lib/extra-encoders";
import { createOutputFormat, FORMAT_CODECS } from "@/app/convert/_lib/output-formats";
import { fitShortSide, rotatedSize, targetShortSide } from "@/app/convert/_lib/output-size";
import type { ConvertSettings, TrimRange } from "@/app/convert/_lib/types";
import { OUTPUT_FORMATS } from "@/constants/converter";

type Mediabunny = typeof import("mediabunny");

export interface ConvertOptions {
  trim: TrimRange | null;
  onProgress: (progress: number) => void;
  signal: AbortSignal;
}

// Converts entirely in this tab: the file is read from memory and the result
// is built in memory, so nothing is uploaded or stored anywhere.
export async function convertMedia(
  file: Blob,
  settings: ConvertSettings,
  { trim, onProgress, signal }: ConvertOptions
): Promise<Blob> {
  if (settings.format === "gif") {
    return convertToGif(file, settings, trim, onProgress, signal);
  }

  const mediabunny = await import("mediabunny");
  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, ConversionCanceledError, Input, Output } =
    mediabunny;
  const format = OUTPUT_FORMATS[settings.format];
  const codecs = FORMAT_CODECS[settings.format];
  await ensureAudioEncoder(codecs.audio[0]);

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    if (format.kind === "audio" && !(await input.getPrimaryAudioTrack())) {
      throw new Error(`This file has no sound to save as ${format.label}.`);
    }
    const output = new Output({
      format: createOutputFormat(mediabunny, settings.format),
      target: new BufferTarget(),
    });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      trim: trim ?? undefined,
      video:
        format.kind === "audio"
          ? { discard: true }
          : (track) => videoOptions(mediabunny, track, settings, trim),
      audio: settings.removeAudio
        ? { discard: true }
        : (track) => audioOptions(mediabunny, track, settings),
      showWarnings: false,
    });
    if (!conversion.isValid) {
      throw new Error(`This browser can't convert this file to ${format.label}.`);
    }

    const cancel = () => void conversion.cancel();
    signal.addEventListener("abort", cancel, { once: true });
    conversion.onProgress = onProgress;
    try {
      await conversion.execute();
    } catch (cause) {
      if (cause instanceof ConversionCanceledError) {
        signal.throwIfAborted();
      }
      throw cause;
    } finally {
      signal.removeEventListener("abort", cancel);
    }

    const buffer = output.target.buffer;
    if (!buffer) {
      throw new Error("The conversion produced no data.");
    }
    return new Blob([buffer], { type: format.mimeType });
  } finally {
    input.dispose();
  }
}

// Copies the video untouched when it already fits the format and nothing about
// the picture changes — instant and lossless. Otherwise it's re-encoded.
async function videoOptions(
  { Quality, canEncodeVideo, getFirstEncodableVideoCodec }: Mediabunny,
  track: InputVideoTrack,
  settings: ConvertSettings,
  trim: TrimRange | null
): Promise<ConversionVideoOptions> {
  const codecs = FORMAT_CODECS[settings.format as keyof typeof FORMAT_CODECS].video;
  const inputCodec = await track.getCodec();
  const size = rotatedSize(
    { width: await track.getDisplayWidth(), height: await track.getDisplayHeight() },
    settings.rotate
  );
  const shortSide = targetShortSide(settings.resolution, null);
  const scaled = shortSide ? fitShortSide(size, shortSide) : null;
  const canCopy = inputCodec !== null && codecs.includes(inputCodec);
  const needsEncode =
    !canCopy ||
    scaled !== null ||
    settings.rotate !== 0 ||
    settings.flip ||
    settings.frameRate !== "original" ||
    // A cut that doesn't land on a key frame must re-encode to start exactly there.
    (trim !== null && trim.start > 0);
  if (!needsEncode) {
    return {};
  }

  const outputSize = scaled ?? size;
  const quality = new Quality(settings.quality);
  const codec =
    canCopy && (await canEncodeVideo(inputCodec, { ...outputSize, quality }))
      ? inputCodec
      : await getFirstEncodableVideoCodec(codecs, { ...outputSize, quality });
  if (!codec) {
    throw new Error("This browser can't encode video for this format.");
  }
  return {
    codec,
    quality,
    rotate: settings.rotate,
    flip: settings.flip,
    // The scaled size already keeps the aspect ratio, so "fill" never stretches.
    ...(scaled ? { ...scaled, fit: "fill" as const } : {}),
    frameRate: settings.frameRate === "original" ? undefined : settings.frameRate,
    forceTranscode: true,
  };
}

async function audioOptions(
  mediabunny: Mediabunny,
  track: InputAudioTrack,
  settings: ConvertSettings
): Promise<ConversionAudioOptions> {
  const codecs = FORMAT_CODECS[settings.format as keyof typeof FORMAT_CODECS].audio;
  const inputCodec = await track.getCodec();
  const numberOfChannels = settings.channels === "original" ? undefined : settings.channels;
  const sampleRate = settings.sampleRate === "original" ? undefined : settings.sampleRate;
  const changesSound =
    (numberOfChannels !== undefined && numberOfChannels !== (await track.getNumberOfChannels())) ||
    (sampleRate !== undefined && sampleRate !== (await track.getSampleRate())) ||
    settings.volume !== 100;
  if (inputCodec !== null && codecs.includes(inputCodec) && !changesSound) {
    return {};
  }

  const codec = await mediabunny.getFirstEncodableAudioCodec(codecs, { numberOfChannels, sampleRate });
  if (!codec) {
    throw new Error("This browser can't encode audio for this format.");
  }
  return {
    codec,
    quality: new mediabunny.Quality(settings.quality),
    numberOfChannels,
    sampleRate,
    process: settings.volume !== 100 ? volumeProcessor(mediabunny, settings.volume / 100) : undefined,
    forceTranscode: true,
  };
}
