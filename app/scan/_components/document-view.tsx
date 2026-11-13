"use client";

import { ArrowLeft, ArrowRight, Download, FileText, Mail, Pencil, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useBlobUrl } from "@/app/edit/_hooks/use-blob-url";
import { RecordingTitle } from "@/app/recorder/_components/recording-title";
import { downloadFile } from "@/app/recorder/_lib/save-recording";
import { AddPages } from "@/app/scan/_components/add-pages";
import { PageEditor } from "@/app/scan/_components/page-editor";
import { PAGE_SIZES, type PageSize } from "@/app/scan/_lib/pdf";
import {
  deleteDocument,
  deletePage,
  documentPdf,
  movePage,
  renameDocument,
  type ScanDocument,
  type ScanPage,
} from "@/app/scan/_lib/scans";
import { formatBytes } from "@/lib/format-bytes";
import { formatRecordedAt } from "@/lib/format-date";
import { titleToFilename } from "@/lib/library/titles";

const pill =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const iconButton =
  "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30";

// Whether this device's share sheet takes PDF files (phones, and Chrome or
// Edge on Windows and ChromeOS do; most other desktop browsers don't).
function canSharePdf(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
    return false;
  }
  try {
    return navigator.canShare({ files: [new File(["%PDF-"], "scan.pdf", { type: "application/pdf" })] });
  } catch {
    return false;
  }
}

function PageCard({
  page,
  number,
  count,
  document,
  onEdit,
}: {
  page: ScanPage;
  number: number;
  count: number;
  document: ScanDocument;
  onEdit: () => void;
}) {
  const url = useBlobUrl(page.image);
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <button type="button" onClick={onEdit} aria-label={`Adjust page ${number}`} className="grid aspect-[3/4] place-items-center bg-muted p-3">
        {url && (
          // A local object URL: next/image can't optimise it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Page ${number}`} className="max-h-full max-w-full object-contain shadow-md" />
        )}
      </button>
      <div className="flex items-center justify-between gap-1 px-3 py-2">
        <span className="text-sm font-semibold tabular-nums">
          Page {number}
          {!page.edgesFound && page.corners.every((corner) => corner.x % 1 === 0 && corner.y % 1 === 0) && (
            <span className="ml-2 font-normal text-amber-700 dark:text-amber-400">edges not found</span>
          )}
        </span>
        <span className="flex items-center">
          <button type="button" className={iconButton} disabled={number === 1} onClick={() => void movePage(document, page.id, -1)} aria-label={`Move page ${number} earlier`} title="Move earlier">
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className={iconButton} disabled={number === count} onClick={() => void movePage(document, page.id, 1)} aria-label={`Move page ${number} later`} title="Move later">
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className={iconButton} onClick={onEdit} aria-label={`Adjust page ${number}`} title="Adjust corners, look and rotation">
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className={iconButton} onClick={() => setConfirming(true)} aria-label={`Delete page ${number}`} title="Delete page">
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </span>
      </div>
      {confirming && (
        <div role="alertdialog" aria-label={`Delete page ${number}?`} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/95 p-4 text-center backdrop-blur-sm">
          <p className="text-base font-semibold">Delete page {number}?</p>
          <div className="flex gap-2">
            <button type="button" autoFocus onClick={() => setConfirming(false)} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border hover:bg-muted">
              Keep
            </button>
            <button type="button" onClick={() => void deletePage(page)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

interface DocumentViewProps {
  document: ScanDocument;
  pages: ScanPage[];
  // A page to open for adjusting straight away (one just added from photos).
  reviewPageId: string | null;
  onDeleted: () => void;
}

export function DocumentView({ document, pages, reviewPageId, onDeleted }: DocumentViewProps) {
  const [editingId, setEditingId] = useState<string | null>(reviewPageId);
  const [working, setWorking] = useState<"share" | "download" | "email" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const shareable = useMemo(() => canSharePdf(), []);
  const filename = titleToFilename(document.title, "pdf");
  const editing = pages.find((page) => page.id === editingId);

  const makePdf = async (): Promise<File> => new File([await documentPdf(document, pageSize)], filename, { type: "application/pdf" });

  const run = async (action: "share" | "download" | "email") => {
    setWorking(action);
    setMessage(null);
    try {
      const file = await makePdf();
      if (action === "share") {
        try {
          await navigator.share({ files: [file], title: document.title });
        } catch (cause) {
          // Closing the share sheet isn't a failure.
          if (!(cause instanceof DOMException && cause.name === "AbortError")) {
            throw cause;
          }
        }
      } else {
        downloadFile(file, filename);
        if (action === "email") {
          window.location.href = `mailto:?subject=${encodeURIComponent(document.title)}&body=${encodeURIComponent(
            `Please find “${filename}” attached.`
          )}`;
          setMessage(`“${filename}” is in your downloads. A web page isn't allowed to attach files to an email by itself, so drag it into the draft that just opened.`);
        } else {
          setMessage(`Downloaded “${filename}” (${formatBytes(file.size)}).`);
        }
      }
    } catch {
      setMessage("The PDF couldn't be made or shared. Try downloading it instead.");
    }
    setWorking(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/scan" className="-ml-3 inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All scans
      </Link>

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-1.5">
          <RecordingTitle title={document.title} onRename={(title) => void renameDocument(document.id, title)} className="text-2xl" />
          <p className="text-sm text-muted-foreground">
            {pages.length} page{pages.length === 1 ? "" : "s"} · {formatRecordedAt(document.createdAt)} · {formatBytes(document.size)} stored
          </p>
        </div>

        {confirmingDelete ? (
          <div role="alertdialog" aria-labelledby="delete-scan-question" className="flex flex-wrap items-center gap-3">
            <p id="delete-scan-question" className="text-base font-medium">
              Delete this document and its {pages.length} page{pages.length === 1 ? "" : "s"}? It can&apos;t be recovered.
            </p>
            <button type="button" autoFocus onClick={() => setConfirmingDelete(false)} className={`${pill} ring-1 ring-border hover:bg-muted`}>
              Keep it
            </button>
            <button
              type="button"
              onClick={async () => {
                await deleteDocument(document.id);
                onDeleted();
              }}
              className={`${pill} bg-red-600 text-white hover:bg-red-500`}
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {shareable && (
              <button type="button" onClick={() => void run("share")} disabled={working !== null || pages.length === 0} className={`${pill} bg-red-600 text-white shadow-sm shadow-red-600/30 hover:bg-red-500`}>
                <Share2 className="size-4" aria-hidden="true" />
                {working === "share" ? "Preparing…" : "Share PDF…"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void run("download")}
              disabled={working !== null || pages.length === 0}
              className={shareable ? `${pill} ring-1 ring-border hover:bg-muted` : `${pill} bg-red-600 text-white shadow-sm shadow-red-600/30 hover:bg-red-500`}
            >
              <Download className="size-4" aria-hidden="true" />
              {working === "download" ? "Preparing…" : "Download PDF"}
            </button>
            {!shareable && (
              <button type="button" onClick={() => void run("email")} disabled={working !== null || pages.length === 0} className={`${pill} ring-1 ring-border hover:bg-muted`}>
                <Mail className="size-4" aria-hidden="true" />
                Email it
              </button>
            )}
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
              Paper
              <select value={pageSize} onChange={(event) => setPageSize(event.target.value as PageSize)} className="rounded-full border border-input bg-card px-3 py-2 text-sm">
                {PAGE_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setConfirmingDelete(true)} className={`${pill} ml-auto text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50`} aria-label="Delete document" title="Delete document">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {shareable
            ? "Share opens your device's own share sheet: WhatsApp, Messenger, email, Bluetooth and whatever else is installed. The PDF goes straight from this device to the app you pick."
            : "This browser has no share sheet for files, so download the PDF and attach it in your email or chat app. On a phone, or in Chrome or Edge on Windows, a Share button appears here."}
        </p>
        {message && (
          <p role="status" className="text-base font-medium">
            {message}
          </p>
        )}
      </div>

      {editing ? (
        <PageEditor key={editing.id} page={editing} pageNumber={pages.indexOf(editing) + 1} onClose={() => setEditingId(null)} />
      ) : (
        <>
          <AddPages documentId={document.id} onAdded={(_, review) => review && setEditingId(review)} />
          {pages.length > 0 ? (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {pages.map((page, index) => (
                <PageCard key={page.id} page={page} number={index + 1} count={pages.length} document={document} onEdit={() => setEditingId(page.id)} />
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed p-8 text-center text-base text-muted-foreground">
              This document has no pages. Add some above, or delete it.
            </p>
          )}
        </>
      )}
    </div>
  );
}
