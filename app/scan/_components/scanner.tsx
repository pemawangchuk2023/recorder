"use client";

import { FileText, Loader2, ScanLine } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useBlobUrl } from "@/app/edit/_hooks/use-blob-url";
import { AddPages } from "@/app/scan/_components/add-pages";
import { DocumentView } from "@/app/scan/_components/document-view";
import { useScanDocument, useScans } from "@/app/scan/_hooks/use-scans";
import type { ScanDocument } from "@/app/scan/_lib/scans";
import { formatBytes } from "@/lib/format-bytes";
import { formatRecordedAt } from "@/lib/format-date";

function Loading({ label }: { label: string }) {
  return (
    <div className="grid place-items-center py-24 text-muted-foreground">
      <Loader2 className="size-8 animate-spin" aria-label={label} />
    </div>
  );
}

function Problem({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-base text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {children}
    </p>
  );
}

function Cover({ thumbnail }: { thumbnail: Blob }) {
  const url = useBlobUrl(thumbnail);
  // A local object URL: next/image can't optimise it.
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="max-h-full max-w-full object-contain shadow-md" /> : null;
}

function DocumentCard({ document }: { document: ScanDocument }) {
  return (
    <li>
      <Link
        href={`/scan?d=${document.id}`}
        className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid aspect-[4/3] place-items-center bg-muted p-4">
          {document.thumbnail ? <Cover thumbnail={document.thumbnail} /> : <FileText className="size-10 text-muted-foreground" aria-hidden="true" />}
        </span>
        <span className="flex flex-col gap-1 p-4">
          <span className="truncate text-base font-semibold group-hover:underline">{document.title}</span>
          <span className="text-sm text-muted-foreground">
            {document.pageIds.length} page{document.pageIds.length === 1 ? "" : "s"} · {formatRecordedAt(document.updatedAt)} · {formatBytes(document.size)}
          </span>
        </span>
      </Link>
    </li>
  );
}

function OpenDocument({ id, reviewPageId }: { id: string; reviewPageId: string | null }) {
  const state = useScanDocument(id);
  const router = useRouter();
  if (state.status === "loading") {
    return <Loading label="Opening the document" />;
  }
  if (state.status === "error") {
    return <Problem>{state.message}</Problem>;
  }
  if (state.status === "missing") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-3xl border bg-card p-6 text-base">
        <p>That document isn&apos;t in this browser — it may have been deleted.</p>
        <Link href="/scan" className="font-semibold underline underline-offset-2 hover:no-underline">
          See all scans
        </Link>
      </div>
    );
  }
  return (
    <DocumentView
      document={state.document}
      pages={state.pages}
      reviewPageId={reviewPageId}
      onDeleted={() => router.replace("/scan")}
    />
  );
}

// The scanner's home: start a new document, or open one made earlier.
export function Scanner() {
  const params = useSearchParams();
  const id = params.get("d");
  const scans = useScans();
  const router = useRouter();

  if (id) {
    return <OpenDocument key={id} id={id} reviewPageId={params.get("p")} />;
  }
  if (scans.status === "loading") {
    return <Loading label="Loading your scans" />;
  }
  if (scans.status === "error") {
    return <Problem>{scans.message}</Problem>;
  }

  const total = scans.documents.reduce((sum, document) => sum + document.size, 0);

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="New scan" className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
            <ScanLine className="size-6" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">New scan</h2>
            <p className="text-base text-muted-foreground">
              Photograph each page, or pick photos you already took. Each page is straightened and
              cleaned up, and you can brighten or fix it before it&apos;s saved. Pages are joined into one PDF.
            </p>
          </div>
        </div>
        <AddPages
          documentId={null}
          primary
          onAdded={(documentId, review) => router.push(`/scan?d=${documentId}${review ? `&p=${review}` : ""}`)}
        />
      </section>

      {scans.documents.length > 0 ? (
        <section aria-label="Your scans" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">Your scans</h2>
            <p className="text-sm text-muted-foreground">
              {scans.documents.length} document{scans.documents.length === 1 ? "" : "s"} · {formatBytes(total)} in this browser
            </p>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scans.documents.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-base text-muted-foreground">
          Nothing scanned yet. Your documents will be kept here, in this browser only.
        </p>
      )}
    </div>
  );
}
