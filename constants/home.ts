// Copy for the home page. Icons are named here and drawn by <FeatureIcon>, so
// this file stays plain data with no markup in it.
export type FeatureIconName =
  | "screen"
  | "microphone"
  | "camera"
  | "captions"
  | "lock"
  | "keyboard";

export interface Feature {
  title: string;
  description: string;
  icon: FeatureIconName;
}

export interface Step {
  title: string;
  description: string;
}

export const FEATURES: readonly Feature[] = [
  {
    title: "Crisp, compact MP4",
    description:
      "Constant-quality encoding keeps text razor sharp while files stay small. Saved as MP4 instantly — no converting.",
    icon: "screen",
  },
  {
    title: "Your voice, clearly",
    description:
      "Noise suppression and echo cancellation on your mic, mixed with tab audio at separate volumes.",
    icon: "microphone",
  },
  {
    title: "Floating camera",
    description:
      "Your camera floats over any app while you record, so you can see yourself. Pick any camera — or record just yourself.",
    icon: "camera",
  },
  {
    title: "Captions and transcript",
    description:
      "Live English captions as you speak, plus a transcript and .srt file — all transcribed on your own computer.",
    icon: "captions",
  },
  {
    title: "Private by design",
    description:
      "No account, no uploads, no tracking. Your recording is saved straight to your computer.",
    icon: "lock",
  },
  {
    title: "Made for flow",
    description:
      "Countdown, pause, one-click restart and keyboard shortcuts — then trim the start and end before you save.",
    icon: "keyboard",
  },
];

export const STEPS: readonly Step[] = [
  {
    title: "Pick your setup",
    description:
      "Record your screen or just your camera, and choose your camera, microphone and captions.",
  },
  {
    title: "Share and talk",
    description:
      "Select a screen, window or tab. A short countdown gives you a moment to get ready.",
  },
  {
    title: "Trim and save",
    description:
      "Watch it back, trim the start and end, then save the MP4 or share it straight from your computer.",
  },
];
