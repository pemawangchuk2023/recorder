export {};

declare global {
  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
  }

  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
    excludeAcceptAllOption?: boolean;
  }

  function showSaveFilePicker(
    options?: SaveFilePickerOptions
  ): Promise<FileSystemFileHandle>;

  interface Window {
    showSaveFilePicker?: typeof showSaveFilePicker;
  }

  interface DisplayMediaStreamOptions {
    systemAudio?: "include" | "exclude";
    surfaceSwitching?: "include" | "exclude";
    selfBrowserSurface?: "include" | "exclude";
    monitorTypeSurfaces?: "include" | "exclude";
  }

  // Document Picture-in-Picture (Chrome/Edge 116+): an always-on-top window.
  interface DocumentPictureInPicture extends EventTarget {
    readonly window: Window | null;
    requestWindow(options?: {
      width?: number;
      height?: number;
      disallowReturnToOpener?: boolean;
    }): Promise<Window>;
  }

  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }

  // Chromium "breakout box" APIs (MediaStreamTrackProcessor/Generator) are
  // typed by @types/dom-mediacapture-transform.

  // Web Speech API, including Chrome's on-device additions (processLocally,
  // available/install, start(audioTrack)).
  type SpeechRecognitionAvailability =
    | "unavailable"
    | "downloadable"
    | "downloading"
    | "available";

  interface SpeechRecognitionOptions {
    langs: string[];
    processLocally?: boolean;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    readonly [index: number]: SpeechRecognitionAlternative | undefined;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    processLocally: boolean;
    unspokenPunctuation?: boolean;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: ((event: Event) => void) | null;
    start(audioTrack?: MediaStreamTrack): void;
    stop(): void;
    abort(): void;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
    available(options: SpeechRecognitionOptions): Promise<SpeechRecognitionAvailability>;
    install(options: SpeechRecognitionOptions): Promise<boolean>;
  };
}
