import type { Metadata } from "next";
import { Recorder } from "@/app/recorder/_components/recorder";

export const metadata: Metadata = {
  title: "Recorder",
  description:
    "Record your screen, voice and webcam as an MP4 with live captions — entirely in your browser.",
};

export default function RecorderPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Record your screen</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Choose your settings, press Start, then pick what to share. Your
          recording never leaves this computer.
        </p>
      </div>
      <Recorder />
    </div>
  );
}
