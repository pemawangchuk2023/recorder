import { useCallback, useEffect, useRef, useState } from "react";
import { useCountdown } from "@/app/recorder/_hooks/use-countdown";
import { createAudioMixer, type AudioMixer } from "@/app/recorder/_lib/audio-mixer";
import {
  describeDeviceError,
  describeScreenCaptureError,
} from "@/app/recorder/_lib/errors";
import {
  getEnglishModelStatus,
  startLiveCaptions,
  type LiveCaptioner,
} from "@/app/recorder/_lib/live-captions";
import {
  AUDIO_BITRATE,
  RESOLUTIONS,
  getMp4MimeType,
  videoBitrate,
} from "@/app/recorder/_lib/recording-format";
import type { RecorderSettings, RecorderStatus } from "@/app/recorder/_lib/types";
import {
  createVideoCompositor,
  isVideoCompositorSupported,
  type VideoCompositor,
} from "@/app/recorder/_lib/video-compositor";

const COUNTDOWN_SECONDS = 3;
const TIMESLICE_MS = 1000;

const VOICE_PROCESSING: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

async function getMicrophone(deviceId: string | undefined): Promise<MediaStream> {
  if (!deviceId) {
    return navigator.mediaDevices.getUserMedia({ audio: VOICE_PROCESSING });
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { ...VOICE_PROCESSING, deviceId: { exact: deviceId } },
    });
  } catch (cause) {
    // The previously chosen mic may have been unplugged — use the default.
    if (
      cause instanceof DOMException &&
      (cause.name === "OverconstrainedError" || cause.name === "NotFoundError")
    ) {
      return navigator.mediaDevices.getUserMedia({ audio: VOICE_PROCESSING });
    }
    throw cause;
  }
}

function stopTracks(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export interface ScreenRecorder {
  status: RecorderStatus;
  isCountingDown: boolean;
  countdownValue: number | null;
  elapsedSeconds: number;
  blob: Blob | null;
  error: string | null;
  notices: string[];
  previewStream: MediaStream | null;
  micAnalyser: AnalyserNode | null;
  start: (settings: RecorderSettings) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setMicGain: (value: number) => void;
  setSystemAudioGain: (value: number) => void;
}

export function useScreenRecorder(): ScreenRecorder {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);

  const countdown = useCountdown(COUNTDOWN_SECONDS);
  const countdownResolverRef = useRef<(() => void) | null>(null);
  // Set when stop() or unmount happens while start() is still awaiting a
  // permission prompt or the countdown; start() checks it after every await.
  const startAbortedRef = useRef(false);
  const isAcquiringRef = useRef(false);

  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const audioMixerRef = useRef<AudioMixer | null>(null);
  const compositorRef = useRef<VideoCompositor | null>(null);
  const captionerRef = useRef<LiveCaptioner | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Active recording time, excluding pauses.
  const activeMsRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getActiveMs = useCallback(() => {
    const running =
      segmentStartRef.current !== null
        ? performance.now() - segmentStartRef.current
        : 0;
    return activeMsRef.current + running;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor(getActiveMs() / 1000));
    }, 1000);
  }, [getActiveMs, stopTimer]);

  const endSegment = useCallback(() => {
    if (segmentStartRef.current !== null) {
      activeMsRef.current += performance.now() - segmentStartRef.current;
      segmentStartRef.current = null;
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    countdown.cancel();
    countdownResolverRef.current?.();
    countdownResolverRef.current = null;
  }, [countdown]);

  const cleanup = useCallback(() => {
    stopTimer();
    segmentStartRef.current = null;
    mediaRecorderRef.current = null;

    captionerRef.current?.stop();
    captionerRef.current = null;
    compositorRef.current?.stop();
    compositorRef.current = null;

    stopTracks(displayStreamRef.current);
    stopTracks(micStreamRef.current);
    stopTracks(webcamStreamRef.current);
    displayStreamRef.current = null;
    micStreamRef.current = null;
    webcamStreamRef.current = null;

    void audioMixerRef.current?.close();
    audioMixerRef.current = null;

    setMicAnalyser(null);
    setPreviewStream(null);
  }, [stopTimer]);

  // Returns true when a real recording was stopped (onstop will follow).
  const finishRecording = useCallback((): boolean => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return false;
    }
    stopTimer();
    endSegment();
    recorder.stop();
    return true;
  }, [endSegment, stopTimer]);

  useEffect(() => {
    return () => {
      startAbortedRef.current = true;
      cancelCountdown();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The 1s timer is throttled while this tab is hidden; resync on return.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && segmentStartRef.current !== null) {
        setElapsedSeconds(Math.floor(getActiveMs() / 1000));
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [getActiveMs]);

  const start = useCallback(
    async (settings: RecorderSettings) => {
      const mimeType = getMp4MimeType();
      if (!mimeType || typeof navigator.mediaDevices?.getDisplayMedia !== "function") {
        setError("Screen recording isn't supported in this browser. Use an up-to-date Chrome or Edge on desktop.");
        return;
      }

      // status stays "idle" through permission prompts and the countdown, so
      // these refs are what prevent a second start() from racing the first.
      if (
        isAcquiringRef.current ||
        displayStreamRef.current !== null ||
        mediaRecorderRef.current !== null
      ) {
        return;
      }
      isAcquiringRef.current = true;

      setError(null);
      setBlob(null);
      setNotices([]);
      setElapsedSeconds(0);
      chunksRef.current = [];
      activeMsRef.current = 0;
      segmentStartRef.current = null;
      startAbortedRef.current = false;

      const { width, height } = RESOLUTIONS[settings.resolution];
      const newNotices: string[] = [];
      const abort = () => {
        cleanup();
        setStatus("idle");
      };

      let displayStream: MediaStream;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: settings.frameRate },
          },
          // Tab/system audio should be captured as-is, not voice-processed.
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          systemAudio: "include",
          surfaceSwitching: "include",
        });
      } catch (cause) {
        setError(describeScreenCaptureError(cause));
        return;
      } finally {
        isAcquiringRef.current = false;
      }
      if (startAbortedRef.current) {
        stopTracks(displayStream);
        return;
      }
      displayStreamRef.current = displayStream;

      const videoTrack = displayStream.getVideoTracks()[0];
      if (!videoTrack) {
        abort();
        setError("The browser didn't provide a video track for the shared screen.");
        return;
      }
      // "detail" keeps text sharp; "motion" keeps 60 fps smooth.
      videoTrack.contentHint = settings.frameRate === 60 ? "motion" : "detail";
      // Fires when the user clicks the browser's own "Stop sharing" button.
      videoTrack.onended = () => {
        startAbortedRef.current = true;
        cancelCountdown();
        finishRecording();
      };
      const systemAudioTrack = displayStream.getAudioTracks()[0] ?? null;

      let micStream: MediaStream | null = null;
      if (settings.mic.enabled) {
        try {
          micStream = await getMicrophone(settings.mic.deviceId);
        } catch (cause) {
          newNotices.push(describeDeviceError(cause, "microphone"));
        }
        micStreamRef.current = micStream;
        if (startAbortedRef.current) {
          return abort();
        }
      }

      let webcamStream: MediaStream | null = null;
      if (settings.webcam.enabled) {
        if (!isVideoCompositorSupported()) {
          newNotices.push("This browser can't draw a webcam bubble — recording the screen only.");
        } else {
          try {
            webcamStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
            });
          } catch (cause) {
            newNotices.push(describeDeviceError(cause, "camera"));
          }
          webcamStreamRef.current = webcamStream;
          if (startAbortedRef.current) {
            return abort();
          }
        }
      }

      const micTrack = micStream?.getAudioTracks()[0] ?? null;
      let captionsReady = false;
      if (settings.captions.enabled) {
        if (!micTrack) {
          newNotices.push("Captions need the microphone — recording without captions.");
        } else if (!isVideoCompositorSupported()) {
          newNotices.push("This browser can't draw captions into the video — recording without captions.");
        } else {
          const modelStatus = await getEnglishModelStatus();
          if (startAbortedRef.current) {
            return abort();
          }
          if (modelStatus === "available") {
            captionsReady = true;
          } else if (modelStatus === "downloading") {
            newNotices.push("The English speech model is still downloading — this recording won't have captions.");
          } else if (modelStatus === "downloadable") {
            newNotices.push("English captions aren't set up yet — recording without captions. Click “Set up English captions” under Captions first.");
          } else {
            newNotices.push("This browser can't transcribe speech on-device, so this recording has no captions.");
          }
        }
      }

      let outputVideoTrack: MediaStreamTrack = videoTrack;
      const webcamTrack = webcamStream?.getVideoTracks()[0] ?? null;
      if (webcamTrack || captionsReady) {
        try {
          compositorRef.current = createVideoCompositor({
            screenTrack: videoTrack,
            webcamTrack,
            maxWidth: width,
            maxHeight: height,
            frameRate: settings.frameRate,
            corner: settings.webcam.corner,
            size: settings.webcam.size,
          });
          outputVideoTrack = compositorRef.current.videoTrack;
        } catch {
          newNotices.push("The video overlay couldn't be drawn — recording the screen without the webcam bubble or captions.");
          stopTracks(webcamStream);
          webcamStreamRef.current = null;
          captionsReady = false;
        }
      }

      if (!systemAudioTrack) {
        newNotices.push(
          micTrack
            ? "This share has no tab or system audio, so only your microphone is recorded. To include sound, share a Chrome tab with “Also share tab audio” turned on."
            : "This recording has no audio — the share has no tab or system audio, and no microphone is being recorded."
        );
      }
      setNotices(newNotices);

      const mixer = createAudioMixer({
        systemAudioTrack,
        micTrack,
        micGain: settings.mic.gain,
        systemAudioGain: settings.systemAudio.gain,
      });
      audioMixerRef.current = mixer;
      setMicAnalyser(mixer?.micAnalyser ?? null);

      const outputStream = new MediaStream([
        outputVideoTrack,
        ...(mixer?.outputTrack ? [mixer.outputTrack] : []),
      ]);
      setPreviewStream(outputStream);

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(outputStream, {
          mimeType,
          videoBitsPerSecond: videoBitrate(settings.resolution, settings.frameRate),
          audioBitsPerSecond: AUDIO_BITRATE,
        });
      } catch {
        abort();
        setError("The recording couldn't be started. Please try again.");
        return;
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setError("Recording failed unexpectedly and had to stop.");
      };
      recorder.onstop = () => {
        setBlob(new Blob(chunksRef.current, { type: recorder.mimeType }));
        setStatus("stopped");
        cleanup();
      };

      await new Promise<void>((resolve) => {
        countdownResolverRef.current = resolve;
        countdown.start(resolve);
      });
      countdownResolverRef.current = null;
      if (startAbortedRef.current) {
        return abort();
      }

      recorder.start(TIMESLICE_MS);
      segmentStartRef.current = performance.now();
      setStatus("recording");
      startTimer();

      const compositor = compositorRef.current;
      if (captionsReady && micTrack && compositor) {
        captionerRef.current = startLiveCaptions(micTrack, {
          onText: (text) => compositor.setCaption(text),
          onError: (message) =>
            setNotices((previous) =>
              previous.includes(message) ? previous : [...previous, message]
            ),
        });
      }
    },
    [cancelCountdown, cleanup, countdown, finishRecording, startTimer]
  );

  const stop = useCallback(() => {
    startAbortedRef.current = true;
    cancelCountdown();
    // If recording hadn't begun yet, start() sees the abort flag and cleans up.
    finishRecording();
  }, [cancelCountdown, finishRecording]);

  const pause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== "recording") {
      return;
    }
    recorder.pause();
    captionerRef.current?.pause();
    stopTimer();
    endSegment();
    setStatus("paused");
  }, [endSegment, stopTimer]);

  const resume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== "paused") {
      return;
    }
    recorder.resume();
    captionerRef.current?.resume();
    segmentStartRef.current = performance.now();
    startTimer();
    setStatus("recording");
  }, [startTimer]);

  const setMicGain = useCallback((value: number) => {
    audioMixerRef.current?.setMicGain(value);
  }, []);

  const setSystemAudioGain = useCallback((value: number) => {
    audioMixerRef.current?.setSystemAudioGain(value);
  }, []);

  return {
    status,
    isCountingDown: countdown.isRunning,
    countdownValue: countdown.value,
    elapsedSeconds,
    blob,
    error,
    notices,
    previewStream,
    micAnalyser,
    start,
    stop,
    pause,
    resume,
    setMicGain,
    setSystemAudioGain,
  };
}
