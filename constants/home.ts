// Copy for the home page. Icons are named here and drawn by <FeatureIcon>, so
// this file stays plain data with no markup in it.
export type FeatureIconName =
  | "screen"
  | "music"
  | "camera"
  | "captions"
  | "lock"
  | "scissors"
  | "convert"
  | "zap"
  | "keyboard"
  | "wave";

export interface Feature {
  title: string;
  description: string;
  icon: FeatureIconName;
  // Wide cards span two columns in the bento grid on large screens.
  wide?: boolean;
}

export interface Step {
  title: string;
  description: string;
}

export interface Tool {
  name: string;
  tagline: string;
  href: string;
  cta: string;
  icon: FeatureIconName;
  points: readonly string[];
}

export interface Faq {
  question: string;
  answer: string;
}

export const HERO = {
  badge: "No account · No uploads · No install",
  titleStart: "Record your screen.",
  titleHighlight: "Convert anything.",
  titleEnd: "Keep it yours.",
  description:
    "Capture your screen, voice, webcam and computer sound as a sharp MP4 with live captions — then turn any video or audio into the format you need. Everything happens right here in your browser.",
  trust: ["Free to use", "No watermark", "Nothing leaves your computer"],
} as const;

export const STATS: readonly { value: string; label: string }[] = [
  { value: "0 bytes", label: "uploaded, ever" },
  { value: "11", label: "export formats" },
  { value: "1080p", label: "at up to 60 fps" },
  { value: "On-device", label: "live captions" },
];

export const FEATURES: readonly Feature[] = [
  {
    title: "Crisp, compact MP4",
    description:
      "Constant-quality encoding keeps text razor sharp while files stay small. Saved as MP4 the moment you stop — no waiting, no converting.",
    icon: "screen",
    wide: true,
  },
  {
    title: "Computer sound, crystal clear",
    description:
      "Record music, videos and demos straight from a Chrome tab — captured directly, so it sounds exactly like the original.",
    icon: "music",
  },
  {
    title: "Floating camera",
    description:
      "Your camera floats over any app while you record, so you can see yourself. Or record just your camera.",
    icon: "camera",
  },
  {
    title: "Captions and transcript",
    description:
      "Live English captions as you speak, plus a transcript and .srt file — transcribed on your own computer.",
    icon: "captions",
  },
  {
    title: "Convert to any format",
    description:
      "MP4, WebM, MOV, MKV, GIF, MP3, M4A, WAV, OGG, FLAC and AAC. Resize, rotate, trim, change volume — in batches.",
    icon: "convert",
    wide: true,
  },
  {
    title: "Trim before you save",
    description:
      "Cut the start and end, restart a take in one click, or pull out just the audio as an MP3.",
    icon: "scissors",
  },
  {
    title: "Made for flow",
    description:
      "A countdown, pause and resume, and keyboard shortcuts keep you focused on what you're showing.",
    icon: "keyboard",
    wide: true,
  },
  {
    title: "Private by design",
    description:
      "No account, no uploads, no tracking. Your files are processed in this tab and saved straight to your computer.",
    icon: "lock",
    wide: true,
  },
];

export const TOOLS: readonly Tool[] = [
  {
    name: "Screen recorder",
    tagline: "Show, don't tell.",
    href: "/recorder",
    cta: "Open the recorder",
    icon: "screen",
    points: [
      "Screen, window or tab — or just your camera",
      "Microphone and computer sound at separate volumes",
      "Live captions, transcript and .srt download",
      "Trim, then save as MP4, MP3, GIF and more",
    ],
  },
  {
    name: "File converter",
    tagline: "Any file, the format you need.",
    href: "/convert",
    cta: "Open the converter",
    icon: "convert",
    points: [
      "Drop in many files at once",
      "Video to MP4, WebM, MOV, MKV or GIF",
      "Extract audio as MP3, WAV, M4A, OGG, FLAC or AAC",
      "Resize, rotate, trim and adjust volume",
    ],
  },
];

export const STEPS: readonly Step[] = [
  {
    title: "Pick your setup",
    description:
      "Record your screen or just your camera, and choose your microphone, computer sound and captions.",
  },
  {
    title: "Share and talk",
    description:
      "Select a screen, window or tab. A short countdown gives you a moment to get ready.",
  },
  {
    title: "Trim and save",
    description:
      "Watch it back, trim the start and end, then save as MP4 — or convert it to any other format.",
  },
];

export const PRIVACY_POINTS: readonly { title: string; description: string }[] = [
  {
    title: "Processed in your browser",
    description: "Recording, encoding and converting all run on your own computer's processor.",
  },
  {
    title: "Never uploaded",
    description: "There's no server receiving your files — they go straight from memory to your disk.",
  },
  {
    title: "Nothing stored",
    description: "Close the tab and it's gone. No accounts, no history, no cookies tracking you.",
  },
];

export const FAQS: readonly Faq[] = [
  {
    question: "Is it really free, with no account?",
    answer:
      "Yes. There's nothing to sign up for and nothing to install — open the recorder or converter and start.",
  },
  {
    question: "Are my recordings or files uploaded anywhere?",
    answer:
      "No. Everything runs inside this browser tab on your own computer. Files are only saved when you download them.",
  },
  {
    question: "How do I record music or sound from YouTube?",
    answer:
      "Keep “Record computer sound” on. When you press Start, choose the “Chrome Tab” list, pick the tab playing the sound and keep “Also share tab audio” on. On a Mac, sharing a whole screen or window usually carries no sound.",
  },
  {
    question: "Which browsers work?",
    answer:
      "Screen recording works best in up-to-date Chrome or Edge on a computer. Phones can record the camera. The converter works in any modern Chromium browser.",
  },
  {
    question: "Which formats can I convert to?",
    answer:
      "Video: MP4, WebM, MOV, MKV and GIF. Audio: MP3, M4A, WAV, OGG, FLAC and AAC. You can also resize, rotate, trim, mute or change the volume.",
  },
  {
    question: "Why does my voice sound odd when music plays?",
    answer:
      "The microphone's voice mode removes echo and noise, which distorts music. Record music with “Record computer sound”, wear headphones, or switch the microphone to “Original sound”.",
  },
];
