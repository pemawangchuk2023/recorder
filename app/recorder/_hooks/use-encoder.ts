import { useEffect, useState } from "react";
import { canEncodeCodec, warmUpEncoder } from "@/app/recorder/_lib/mp4-encoder";
import { RESOLUTIONS, canUseWebCodecs } from "@/app/recorder/_lib/recording-format";
import type {
  FrameRate,
  Resolution,
  VideoCodecChoice,
} from "@/app/recorder/_lib/types";

const CODECS: VideoCodecChoice[] = ["avc", "hevc"];

// The codecs this computer can record at the chosen size and frame rate.
// Empty while checking, and when recording falls back to MediaRecorder.
export function useEncodableCodecs(
  resolution: Resolution,
  frameRate: FrameRate
): VideoCodecChoice[] {
  const [codecs, setCodecs] = useState<VideoCodecChoice[]>([]);

  useEffect(() => {
    if (!canUseWebCodecs()) {
      return;
    }
    let cancelled = false;
    const size = RESOLUTIONS[resolution];
    void Promise.all(CODECS.map((codec) => canEncodeCodec(codec, size, frameRate))).then(
      (supported) => {
        if (!cancelled) {
          setCodecs(CODECS.filter((_, index) => supported[index]));
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [resolution, frameRate]);

  return codecs;
}

// Starts the chosen encoder while the user is still setting up; see warmUpEncoder.
export function useEncoderWarmUp(codec: VideoCodecChoice, resolution: Resolution): void {
  useEffect(() => {
    if (canUseWebCodecs()) {
      const { width, height } = RESOLUTIONS[resolution];
      void warmUpEncoder(codec, width, height);
    }
  }, [codec, resolution]);
}
