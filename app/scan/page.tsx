import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/app/_components/page-header";
import { Scanner } from "@/app/scan/_components/scanner";

export const metadata: Metadata = {
  title: "Scanner",
  description:
    "Scan paper documents to PDF with your camera — straightened, cleaned up and ready to share. Free, and nothing is uploaded.",
};

export default function ScanPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8 sm:py-16">
      <PageHeader eyebrow="Document scanner" title="Scan to PDF">
        Turn paper into a clean PDF with your camera, then share it by email or any app. Free, with no
        watermark, and your documents never leave this device.
      </PageHeader>
      {/* The open document comes from the URL, which is only known in the browser. */}
      <Suspense>
        <Scanner />
      </Suspense>
    </div>
  );
}
