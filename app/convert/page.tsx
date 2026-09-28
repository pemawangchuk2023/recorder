import type { Metadata } from "next";
import { PageHeader } from "@/app/_components/page-header";
import { Converter } from "@/app/convert/_components/converter";

export const metadata: Metadata = {
  title: "Converter",
  description:
    "Convert video and audio to MP4, WebM, MOV, MKV, GIF, MP3, M4A, WAV, OGG, FLAC or AAC — entirely in your browser.",
};

export default function ConvertPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8 sm:py-16">
      <PageHeader eyebrow="File converter" title="Convert video and audio">
        Turn any video into MP4, WebM, MOV, MKV or GIF, or pull out the sound as MP3,
        WAV and more. Files are converted on this computer and never uploaded.
      </PageHeader>
      <Converter />
    </div>
  );
}
