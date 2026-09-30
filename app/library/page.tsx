import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/app/_components/page-header";
import { Library } from "@/app/library/_components/library";

export const metadata: Metadata = {
  title: "Library",
  description:
    "Every recording you make, kept privately in this browser. Watch, rename, download or delete — nothing is uploaded.",
};

export default function LibraryPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8 sm:py-16">
      <PageHeader eyebrow="Library" title="Your recordings">
        Kept privately in this browser — never uploaded. Watch, rename, download
        or delete them any time.
      </PageHeader>
      {/* The watched recording comes from the URL, which is only known in the browser. */}
      <Suspense>
        <Library />
      </Suspense>
    </div>
  );
}
