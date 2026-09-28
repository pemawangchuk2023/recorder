import type { Metadata } from "next";
import { PageHeader } from "@/app/_components/page-header";
import { Recorder } from "@/app/recorder/_components/recorder";

export const metadata: Metadata = {
  title: "Recorder",
  description:
    "Record your screen, voice and webcam as an MP4 with live captions — entirely in your browser.",
};

export default function RecorderPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8 sm:py-16">
      <PageHeader eyebrow="Screen recorder" title="Record your screen">
        Choose your settings, press Start, then pick what to share. Your
        recording never leaves this computer.
      </PageHeader>
      <Recorder />
    </div>
  );
}
