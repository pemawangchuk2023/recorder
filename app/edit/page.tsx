import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/app/_components/page-header";
import { Editor } from "@/app/edit/_components/editor";

export const metadata: Metadata = {
  title: "Editor",
  description:
    "Cut, crop, speed up and annotate a recording — and blur anything private — entirely in your browser.",
};

export default function EditPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8 sm:py-16">
      <PageHeader eyebrow="Editor" title="Edit your recording">
        Cut out mistakes and pauses, crop the picture, change the speed, and add labels, arrows or
        blur. Nothing is uploaded, and the original is never changed.
      </PageHeader>
      {/* The recording comes from the URL, which is only known in the browser. */}
      <Suspense>
        <Editor />
      </Suspense>
    </div>
  );
}
