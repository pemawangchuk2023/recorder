import type { Metadata } from "next";
import { Recorder } from "@/app/recorder/_components/recorder";

export const metadata: Metadata = {
  title: "Recorder",
  description:
    "Record your screen, voice and webcam as an MP4 with live captions — entirely in your browser.",
};

export default function RecorderPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Record your screen</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Choose your settings, press Start, then pick what to share. Your
          recording never leaves this computer.
        </p>
      </div>
      <Recorder />
    </div>
  );
}
