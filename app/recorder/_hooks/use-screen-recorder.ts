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
import { warmUpEncoder } from "@/app/recorder/_lib/mp4-encoder";
import {
  RESOLUTIONS,
  canUseWebCodecs,
  isRecordingSupported,
} from "@/app/recorder/_lib/recording-format";
import {
  createRecordingSession,
  type RecordingAudio,
  type RecordingSession,
} from "@/app/recorder/_lib/recording-session";
import type {
  RecorderSettings,
  RecorderStatus,
  TranscriptSegment,
} from "@/app/recorder/_lib/types";
import {
  createVideoCompositor,
  isVideoCompositorSupported,
  type VideoCompositor,
} from "@/app/recorder/_lib/video-compositor";

const COUNTDOWN_SECONDS = 3;

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

export interface StartOptions {
  // The live camera from useCamera; the recorder uses a clone and never stops the original.
  cameraStream: MediaStream | null;
  // When a full screen is shared, a floating bubble is already visible in the
  // capture, so it must not be drawn into the video a second time.
  floatingBubbleOpen: boolean;
}

// Everything a take records from. Kept so Restart can record a fresh take
// from the same screen share, camera and microphone without asking again.
interface TakeSetup {
  settings: RecorderSettings;
  videoTrack: MediaStreamVideoTrack;
  audio: RecordingAudio | null;
  compositor: VideoCompositor | null;
  // The microphone, when captions are ready to transcribe it.
  captionTrack: MediaStreamTrack | null;
  useWebCodecs: boolean;
}

export interface ScreenRecorder {
  status: RecorderStatus;
  isCountingDown: boolean;
  countdownValue: number | null;
  // True while the last frames are encoded after Stop.
  isFinishing: boolean;
  elapsedSeconds: number;
  blob: Blob | null;
  transcript: TranscriptSegment[];
  error: string | null;
  notices: string[];
  previewStream: MediaStream | null;
  micAnalyser: AnalyserNode | null;
  start: (settings: RecorderSettings, options: StartOptions) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  discard: () => void;
  setMicGain: (value: number) => void;
  setSystemAudioGain: (value: number) => void;
}

export function useScreenRecorder(): ScreenRecorder {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [isFinishing, setIsFinishing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);

  const countdown = useCountdown(COUNTDOWN_SECONDS);
  const countdownResolverRef = useRef<(() => void) | null>(null);
  // True from start() until cleanup. status stays "idle" through permission
  // prompts and the countdown, so this is what blocks a second start().
  const busyRef = useRef(false);
  // Set when stop(), discard() or unmount happens while a take is still being
  // set up; every await in start() and beginTake() checks it.
  const startAbortedRef = useRef(false);

  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioMixerRef = useRef<AudioMixer | null>(null);
  const compositorRef = useRef<VideoCompositor | null>(null);
  const captionerRef = useRef<LiveCaptioner | null>(null);
  const takeSetupRef = useRef<TakeSetup | null>(null);
  const sessionRef = useRef<RecordingSession | null>(null);
  const finishingRef = useRef(false);
  const transcriptRef = useRef<TranscriptSegment[]>([]);

  // Active recording time, excluding pauses. segmentStartRef is null while
  // paused (or not recording).
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

  const resetTakeTime = useCallback(() => {
    stopTimer();
    activeMsRef.current = 0;
    segmentStartRef.current = null;
    setElapsedSeconds(0);
    transcriptRef.current = [];
  }, [stopTimer]);

  const addNotice = useCallback((message: string) => {
    setNotices((previous) => (previous.includes(message) ? previous : [...previous, message]));
  }, []);

  const cancelCountdown = useCallback(() => {
    countdown.cancel();
    countdownResolverRef.current?.();
    countdownResolverRef.current = null;
  }, [countdown]);

  // Releases the screen, camera, microphone and everything built on them.
  // Any session must already be finished or cancelled.
  const cleanup = useCallback(() => {
    stopTimer();
    segmentStartRef.current = null;
    takeSetupRef.current = null;
    sessionRef.current = null;

    captionerRef.current?.stop();
    captionerRef.current = null;
    compositorRef.current?.stop();
    compositorRef.current = null;

    stopTracks(displayStreamRef.current);
    stopTracks(micStreamRef.current);
    cameraTrackRef.current?.stop();
    displayStreamRef.current = null;
    micStreamRef.current = null;
    cameraTrackRef.current = null;

    void audioMixerRef.current?.close();
    audioMixerRef.current = null;

    setMicAnalyser(null);
    setPreviewStream(null);
    busyRef.current = false;
  }, [stopTimer]);

  // Stops encoding and keeps the take.
  const finishTake = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || finishingRef.current) {
      return;
    }
    finishingRef.current = true;
    setIsFinishing(true);
    stopTimer();
    endSegment();
    captionerRef.current?.stop();
    captionerRef.current = null;
    try {
      const recorded = await session.finish();
      setBlob(recorded);
      setTranscript([...transcriptRef.current]);
      setStatus("stopped");
    } catch {
      setError("The recording couldn't be finished. Please try again.");
      setStatus("idle");
    } finally {
      finishingRef.current = false;
      setIsFinishing(false);
      cleanup();
    }
  }, [cleanup, endSegment, stopTimer]);

  const stop = useCallback(() => {
    startAbortedRef.current = true;
    cancelCountdown();
    // If a take hadn't begun yet, the pending start sees the abort flag and cleans up.
    void finishTake();
  }, [cancelCountdown, finishTake]);

  useEffect(() => {
    return () => {
      startAbortedRef.current = true;
      cancelCountdown();
      void sessionRef.current?.cancel();
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

  // Counts down, then starts encoding a new take.
  const beginTake = useCallback(
    async (setup: TakeSetup) => {
      const abort = () => {
        cleanup();
        setStatus("idle");
      };
      const { settings, compositor } = setup;

      await new Promise<void>((resolve) => {
        countdownResolverRef.current = resolve;
        countdown.start(resolve);
      });
      countdownResolverRef.current = null;
      if (startAbortedRef.current) {
        return abort();
      }

      if (setup.useWebCodecs) {
        // Normally finished long ago; see warmUpEncoder.
        const { width, height } = RESOLUTIONS[settings.resolution];
        await warmUpEncoder(settings.codec, width, height);
      }

      let session: RecordingSession | null = null;
      try {
        const created = await createRecordingSession({
          videoTrack: setup.videoTrack,
          audio: setup.audio,
          codec: settings.codec,
          resolution: settings.resolution,
          frameRate: settings.frameRate,
          compositedSize:
            setup.useWebCodecs && compositor
              ? { width: compositor.width, height: compositor.height }
              : null,
          // Only this take's own failure may end it, not a cancelled earlier one.
          onError: () => {
            if (session && sessionRef.current === session) {
              setError("Recording failed unexpectedly and had to stop.");
              void finishTake();
            }
          },
        });
        session = created.session;
        if (created.notice) {
          addNotice(created.notice);
        }
        if (!startAbortedRef.current) {
          await session.start();
        }
      } catch {
        abort();
        setError("The recording couldn't be started. Please try again.");
        return;
      }
      if (startAbortedRef.current) {
        void session.cancel();
        return abort();
      }

      sessionRef.current = session;
      segmentStartRef.current = performance.now();
      setStatus("recording");
      startTimer();

      if (setup.captionTrack) {
        captionerRef.current = startLiveCaptions(setup.captionTrack, {
          onText: (text) => {
            if (settings.captions.burnIn) {
              compositor?.setCaption(text);
            }
          },
          onSegment: (segment) => transcriptRef.current.push(segment),
          onError: addNotice,
          now: () => getActiveMs() / 1000,
        });
      }
    },
    [addNotice, cleanup, countdown, finishTake, getActiveMs, startTimer]
  );

  const start = useCallback(
    async (settings: RecorderSettings, { cameraStream, floatingBubbleOpen }: StartOptions) => {
      if (!isRecordingSupported()) {
        setError("Recording isn't supported in this browser. Use an up-to-date Chrome or Edge.");
        return;
      }
      const recordsCamera = settings.source === "camera";
      const liveCameraTrack = settings.camera.enabled
        ? (cameraStream?.getVideoTracks()[0] ?? null)
        : null;
      if (recordsCamera && !liveCameraTrack) {
        setError("Turn on your camera to record camera only.");
        return;
      }
      if (busyRef.current) {
        return;
      }
      busyRef.current = true;

      setError(null);
      setBlob(null);
      setTranscript([]);
      setNotices([]);
      resetTakeTime();
      startAbortedRef.current = false;

      const { width, height } = RESOLUTIONS[settings.resolution];
      const useWebCodecs = canUseWebCodecs();
      if (useWebCodecs) {
        void warmUpEncoder(settings.codec, width, height);
      }
      const newNotices: string[] = [];
      const abort = () => {
        cleanup();
        setStatus("idle");
      };

      // The recorder works on its own copy of the camera track, so stopping a
      // recording never turns off the live camera bubble.
      const cameraTrack = liveCameraTrack?.clone() ?? null;
      cameraTrackRef.current = cameraTrack;

      let mainVideoTrack: MediaStreamVideoTrack;
      let systemAudioTrack: MediaStreamTrack | null = null;
      let sharesFullScreen = false;

      if (recordsCamera && cameraTrack) {
        mainVideoTrack = cameraTrack;
        cameraTrack.onended = stop;
      } else {
        const wantsComputerSound = settings.systemAudio.enabled;
        let displayStream: MediaStream;
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: width },
              height: { ideal: height },
              frameRate: { ideal: settings.frameRate },
              // Opens Chrome's picker on its tab list, where "Also share tab
              // audio" lives — the one share that always carries sound.
              ...(wantsComputerSound ? { displaySurface: "browser" } : {}),
            },
            // Computer sound is captured as-is, not voice-processed.
            audio: wantsComputerSound
              ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
              : false,
            systemAudio: wantsComputerSound ? "include" : "exclude",
            // Recording the recorder's own tab is never what anyone wants.
            selfBrowserSurface: "exclude",
            surfaceSwitching: "include",
          });
        } catch (cause) {
          abort();
          setError(describeScreenCaptureError(cause));
          return;
        }
        displayStreamRef.current = displayStream;
        if (startAbortedRef.current) {
          return abort();
        }

        const videoTrack = displayStream.getVideoTracks()[0];
        if (!videoTrack) {
          abort();
          setError("The browser didn't provide a video track for the shared screen.");
          return;
        }
        // "detail" keeps text sharp; "motion" keeps 60 fps smooth.
        videoTrack.contentHint = settings.frameRate === 60 ? "motion" : "detail";
        // Fires when the user clicks the browser's own "Stop sharing" button.
        videoTrack.onended = stop;
        mainVideoTrack = videoTrack;
        systemAudioTrack = displayStream.getAudioTracks()[0] ?? null;
        sharesFullScreen = videoTrack.getSettings().displaySurface === "monitor";
      }

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

      const micTrack = micStream?.getAudioTracks()[0] ?? null;
      const { burnIn } = settings.captions;
      let captionsReady = false;
      if (settings.captions.enabled) {
        if (!micTrack) {
          newNotices.push("Captions need the microphone — recording without captions.");
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

      // Draw the camera bubble into the video, unless this is a camera-only
      // recording or the floating bubble is already part of a full-screen capture.
      const drawsBubble =
        !recordsCamera && cameraTrack !== null && !(sharesFullScreen && floatingBubbleOpen);
      if (!recordsCamera && cameraTrack && !drawsBubble) {
        cameraTrack.stop();
      }

      // WebCodecs recording always goes through the compositor: its steady
      // frame rate keeps pauses and still screens correctly timed.
      let outputVideoTrack = mainVideoTrack;
      const wantsCompositor = useWebCodecs || drawsBubble || (captionsReady && burnIn);
      if (wantsCompositor && isVideoCompositorSupported()) {
        try {
          compositorRef.current = createVideoCompositor({
            screenTrack: mainVideoTrack,
            webcamTrack: drawsBubble ? cameraTrack : null,
            maxWidth: width,
            maxHeight: height,
            frameRate: settings.frameRate,
            corner: settings.camera.corner,
            size: settings.camera.size,
          });
          outputVideoTrack = compositorRef.current.videoTrack;
        } catch {
          // Covered by the notices below; the plain capture is recorded instead.
        }
      }
      const compositor = compositorRef.current;
      if (drawsBubble && !compositor) {
        newNotices.push("This browser can't draw the camera bubble into the video — recording the screen only.");
      }
      if (captionsReady && burnIn && !compositor) {
        newNotices.push("This browser can't draw captions into the video — they'll be in the transcript only.");
      }

      if (!recordsCamera && !systemAudioTrack) {
        if (settings.systemAudio.enabled) {
          newNotices.push(
            micTrack
              ? "Your voice is being recorded, but computer sound isn't: this share doesn't include it. To record it, share a Chrome tab and keep “Also share tab audio” on."
              : "This recording has no audio: the share doesn't include computer sound and the microphone is off. Share a Chrome tab and keep “Also share tab audio” on."
          );
        } else if (!micTrack) {
          newNotices.push("This recording has no audio. Turn on the microphone or “Record computer sound” to include sound.");
        }
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

      const audio: RecordingAudio | null =
        mixer?.outputTrack
          ? { track: mixer.outputTrack, context: mixer.context, node: mixer.output }
          : null;
      setPreviewStream(new MediaStream([outputVideoTrack, ...(audio ? [audio.track] : [])]));

      const setup: TakeSetup = {
        settings,
        videoTrack: outputVideoTrack,
        audio,
        compositor,
        captionTrack: captionsReady ? micTrack : null,
        useWebCodecs: useWebCodecs && compositor !== null,
      };
      takeSetupRef.current = setup;
      await beginTake(setup);
    },
    [beginTake, cleanup, resetTakeTime, stop]
  );

  const pause = useCallback(() => {
    const session = sessionRef.current;
    if (!session || finishingRef.current || segmentStartRef.current === null) {
      return;
    }
    session.pause();
    captionerRef.current?.pause();
    stopTimer();
    endSegment();
    setStatus("paused");
  }, [endSegment, stopTimer]);

  const resume = useCallback(() => {
    const session = sessionRef.current;
    if (!session || finishingRef.current || segmentStartRef.current !== null) {
      return;
    }
    session.resume();
    captionerRef.current?.resume();
    segmentStartRef.current = performance.now();
    startTimer();
    setStatus("recording");
  }, [startTimer]);

  // Throws the current take away and records a new one from the same screen,
  // camera and microphone — no need to pick the screen again.
  const restart = useCallback(() => {
    const setup = takeSetupRef.current;
    const session = sessionRef.current;
    if (!setup || !session || finishingRef.current) {
      return;
    }
    sessionRef.current = null;
    void session.cancel();
    captionerRef.current?.stop();
    captionerRef.current = null;
    resetTakeTime();
    setStatus("idle");
    void beginTake(setup);
  }, [beginTake, resetTakeTime]);

  const discard = useCallback(() => {
    startAbortedRef.current = true;
    cancelCountdown();
    if (finishingRef.current) {
      return;
    }
    const session = sessionRef.current;
    sessionRef.current = null;
    void session?.cancel();
    // Before a take is set up, the pending start() sees the abort flag and
    // cleans up itself.
    if (takeSetupRef.current) {
      resetTakeTime();
      cleanup();
      setStatus("idle");
    }
  }, [cancelCountdown, cleanup, resetTakeTime]);

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
    isFinishing,
    elapsedSeconds,
    blob,
    transcript,
    error,
    notices,
    previewStream,
    micAnalyser,
    start,
    stop,
    pause,
    resume,
    restart,
    discard,
    setMicGain,
    setSystemAudioGain,
  };
}
