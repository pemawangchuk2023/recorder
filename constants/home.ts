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
    title: "Sharp 1080p MP4",
    description:
      "Recorded at YouTube's recommended bitrates and saved as MP4 instantly — no converting, no waiting.",
    icon: "screen",
  },
  {
    title: "Your voice, clearly",
    description:
      "Noise suppression and echo cancellation on your mic, mixed with tab audio at separate volumes.",
    icon: "microphone",
  },
  {
    title: "Floating camera bubble",
    description:
      "A round camera badge floats over any app while you record. Pick any camera — or record just yourself.",
    icon: "camera",
  },
  {
    title: "Live captions",
    description:
      "English captions appear inside the video as you speak, transcribed on your own computer.",
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
      "A 3-second countdown, pause and resume, and keyboard shortcuts to stay out of your way.",
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
    title: "Save your MP4",
    description: "Stop when you're done, watch it back, and save the file to your computer.",
  },
];
