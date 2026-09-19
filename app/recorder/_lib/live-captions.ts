import type { TranscriptSegment } from "@/app/recorder/_lib/types";

const ENGLISH_ON_DEVICE: SpeechRecognitionOptions = {
  langs: ["en-US"],
  processLocally: true,
};

const CLEAR_AFTER_SILENCE_MS = 3000;
const RESTART_DELAY_MS = 300;
const MAX_CAPTION_WORDS = 40;

export type CaptionModelStatus = SpeechRecognitionAvailability | "unsupported";

// processLocally is what keeps this private: without it, Chrome's speech
// recognition streams audio to a cloud service. Never fall back to that.
function isOnDeviceRecognitionPresent(): boolean {
  return (
    typeof SpeechRecognition === "function" &&
    "processLocally" in SpeechRecognition.prototype &&
    typeof SpeechRecognition.available === "function" &&
    typeof SpeechRecognition.install === "function"
  );
}

export async function getEnglishModelStatus(): Promise<CaptionModelStatus> {
  if (!isOnDeviceRecognitionPresent()) {
    return "unsupported";
  }
  try {
    return await SpeechRecognition.available(ENGLISH_ON_DEVICE);
  } catch {
    return "unavailable";
  }
}

// Chrome downloads its own speech model here (a one-time browser component
// download). No audio is involved. Call from a click handler.
export function installEnglishModel(): Promise<boolean> {
  return SpeechRecognition.install(ENGLISH_ON_DEVICE);
}

export interface LiveCaptioner {
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

interface LiveCaptionHandlers {
  // The words to show on screen right now ("" clears the caption).
  onText: (text: string) => void;
  // A finished line for the transcript.
  onSegment: (segment: TranscriptSegment) => void;
  onError: (message: string) => void;
  // Current position in the recording, in seconds (pauses excluded).
  now: () => number;
}

function describeRecognitionError(code: string): string | null {
  switch (code) {
    case "no-speech":
    case "aborted":
      return null;
    case "language-not-supported":
      return "English captions stopped: Chrome's on-device English speech model isn't installed. Set it up under Captions, then record again.";
    case "not-allowed":
    case "service-not-allowed":
      return "Captions were blocked by the browser — the recording continues without them.";
    case "audio-capture":
      return "Captions couldn't hear the microphone — the recording continues without them.";
    default:
      return `Captions stopped (${code}) — the recording continues without them.`;
  }
}

export function startLiveCaptions(
  micTrack: MediaStreamTrack,
  { onText, onSegment, onError, now }: LiveCaptionHandlers
): LiveCaptioner {
  let active = true;
  let paused = false;
  let recognition: SpeechRecognition | null = null;
  let clearTimer: ReturnType<typeof setTimeout> | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  // Chrome reports one ever-growing transcript per session; words before
  // this index were already shown and cleared after a pause in speech.
  let hiddenWordCount = 0;

  const clearTimers = () => {
    if (clearTimer !== null) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
    if (restartTimer !== null) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const begin = () => {
    const instance = new SpeechRecognition();
    instance.lang = "en-US";
    instance.continuous = true;
    instance.interimResults = true;
    instance.processLocally = true;
    if ("unspokenPunctuation" in instance) {
      instance.unspokenPunctuation = true;
    }

    // The API doesn't time its results, so a line is timed from when its
    // first words appeared until it was finalized.
    const firstHeardAt: number[] = [];
    let finishedCount = 0;

    instance.onresult = (event) => {
      if (recognition !== instance) {
        return;
      }
      for (let index = event.resultIndex; index < event.results.length; index++) {
        firstHeardAt[index] ??= now();
      }
      while (finishedCount < event.results.length && event.results[finishedCount].isFinal) {
        const text = event.results[finishedCount][0]?.transcript.trim();
        if (text) {
          onSegment({ start: firstHeardAt[finishedCount] ?? now(), end: now(), text });
        }
        finishedCount++;
      }

      const words = Array.from(
        event.results,
        (result) => result[0]?.transcript ?? ""
      )
        .join(" ")
        .split(/\s+/)
        .filter(Boolean);
      onText(words.slice(hiddenWordCount).slice(-MAX_CAPTION_WORDS).join(" "));

      if (clearTimer !== null) {
        clearTimeout(clearTimer);
      }
      clearTimer = setTimeout(() => {
        hiddenWordCount = words.length;
        onText("");
      }, CLEAR_AFTER_SILENCE_MS);
    };

    instance.onerror = (event) => {
      if (recognition !== instance) {
        return;
      }
      const message = describeRecognitionError(event.error);
      if (message) {
        active = false;
        onError(message);
      }
    };

    // Chrome ends sessions on its own (long silence, internal limits).
    instance.onend = () => {
      if (recognition !== instance || !active || paused) {
        return;
      }
      recognition = null;
      hiddenWordCount = 0;
      restartTimer = setTimeout(begin, RESTART_DELAY_MS);
    };

    recognition = instance;
    try {
      instance.start(micTrack);
    } catch {
      active = false;
      recognition = null;
      onError("Captions couldn't start — the recording continues without them.");
    }
  };

  const halt = () => {
    clearTimers();
    const instance = recognition;
    recognition = null;
    instance?.abort();
    onText("");
  };

  begin();

  return {
    pause() {
      if (!active || paused) {
        return;
      }
      paused = true;
      halt();
    },
    resume() {
      if (!active || !paused) {
        return;
      }
      paused = false;
      hiddenWordCount = 0;
      begin();
    },
    stop() {
      active = false;
      halt();
    },
  };
}
