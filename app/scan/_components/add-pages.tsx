"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { PageAdjust } from "@/app/scan/_components/page-adjust";
import { detectPage } from "@/app/scan/_lib/detect-edges";
import { isConvex, type Corners } from "@/app/scan/_lib/geometry";
import { findCorners, grayCopy, preparePhoto, type PageSettings } from "@/app/scan/_lib/process-page";
import { DEFAULT_FILTER, addPage, addPhotos, isStorageFull } from "@/app/scan/_lib/scans";

const STORAGE_FULL =
  "Browser storage is full, so the page couldn't be saved. Delete scans or recordings you no longer need.";

function cameraProblem(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "The camera is blocked for this site. Tap the icon at the left of the address bar, allow Camera, then try again. On a phone, also check the browser's camera permission in system settings.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device. Use “Choose photos” to add pictures you already have.";
  }
  if (name === "NotReadableError") {
    return "The camera couldn't be opened — another app may be using it. Close that app and try again.";
  }
  return "The camera couldn't be started. Use “Choose photos” instead.";
}

// The largest box of the given shape that fits inside an element.
function useFittedBox(aspect: number | null): [React.RefObject<HTMLDivElement | null>, { width: number; height: number } | null] {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !aspect) {
      return;
    }
    const measure = () => {
      const { clientWidth, clientHeight } = element;
      const width = Math.min(clientWidth, clientHeight * aspect);
      setBox({ width, height: width / aspect });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [aspect]);
  return [ref, box];
}

interface Shot {
  photo: Blob;
  settings: PageSettings;
  edgesFound: boolean;
}

interface CameraDialogProps {
  documentId: string | null;
  // Called when the dialog closes; `savedTo` is the document pages went
  // into, or null when nothing was saved.
  onClose: (savedTo: string | null) => void;
}

// Scanning with the camera: line the page up (its outline lights up when
// it's found), snap, then look the scanned page over and fix anything
// before it is saved.
function CameraDialog({ documentId, onClose }: CameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [outline, setOutline] = useState<Corners | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [working, setWorking] = useState<"snap" | "next" | "finish" | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(documentId);
  const [savedCount, setSavedCount] = useState(0);
  const [viewRef, box] = useFittedBox(shot ? null : aspect);
  const reviewing = shot !== null;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() =>
        setError("This page can't use the camera here (it needs HTTPS). Use “Choose photos” instead — on a phone that can take a picture too.")
      );
      return;
    }
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        // The back camera on phones; as much detail as the camera offers.
        video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } },
      })
      .then((opened) => {
        if (cancelled) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        if (videoRef.current) {
          videoRef.current.srcObject = opened;
        }
      })
      .catch((cause: unknown) => !cancelled && setError(cameraProblem(cause)));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Looks for the page a few times a second and outlines it.
  useEffect(() => {
    if (reviewing || !aspect) {
      return;
    }
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || video.readyState < 2) {
        return;
      }
      try {
        const { gray, width, height } = grayCopy(video, video.videoWidth, video.videoHeight);
        const found = detectPage(gray, width, height);
        setOutline(found && isConvex(found) ? found : null);
      } catch {
        setOutline(null);
      }
    }, 300);
    return () => clearInterval(timer);
  }, [reviewing, aspect]);

  const snap = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      return;
    }
    setWorking("snap");
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      const frame = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
      if (!frame) {
        throw new Error("no frame");
      }
      const photo = await preparePhoto(frame);
      const { corners, found } = await findCorners(photo);
      setShot({
        photo,
        settings: { corners, filter: DEFAULT_FILTER, turns: 0, brightness: 0, contrast: 0 },
        edgesFound: found,
      });
    } catch {
      setError("The photo couldn't be taken. Try again.");
    }
    setWorking(null);
  };

  const save = async (then: "next" | "finish") => {
    if (!shot) {
      return;
    }
    setWorking(then);
    setError(null);
    try {
      const saved = await addPage(savedTo, shot.photo, shot.settings, shot.edgesFound);
      setSavedTo(saved.id);
      setSavedCount((count) => count + 1);
      if (then === "finish") {
        onClose(saved.id);
        return;
      }
      setShot(null);
    } catch (cause) {
      setError(isStorageFull(cause) ? STORAGE_FULL : "The page couldn't be saved. Try again.");
    }
    setWorking(null);
  };

  const pageNumber = savedCount + 1;
  const points = outline?.map((corner) => `${corner.x * 100},${corner.y * 100}`).join(" ");

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose(savedCount > 0 ? savedTo : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
          // Dragging a corner or a slider must not be taken for "clicked outside".
          onInteractOutside={(event) => event.preventDefault()}
          className={
            reviewing
              ? "fixed inset-0 z-50 flex flex-col bg-background sm:inset-6 sm:rounded-3xl"
              : "fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white sm:inset-6 sm:rounded-3xl"
          }
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold">
                {reviewing ? `Page ${pageNumber}: check and adjust` : `Scan page ${pageNumber}`}
              </Dialog.Title>
              <Dialog.Description className={reviewing ? "text-sm text-muted-foreground" : "text-sm text-zinc-400"}>
                {reviewing
                  ? "This is how the page will be saved. Brighten it, change its look or fix its edges first."
                  : outline
                    ? "Page found — hold steady and take the photo."
                    : "Fill the view with the page. A darker surface underneath helps find its edges."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className={`grid size-10 shrink-0 place-items-center rounded-full ${reviewing ? "hover:bg-muted" : "hover:bg-white/10"}`}
              aria-label="Close the scanner"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          {/* The camera keeps running underneath the review, ready for the next page. */}
          <div ref={viewRef} className={reviewing ? "hidden" : "relative grid min-h-0 flex-1 place-items-center bg-black"}>
            {error && !aspect ? (
              <p role="alert" className="p-8 text-center text-base">
                {error}
              </p>
            ) : (
              <div className="relative" style={box ? { width: box.width, height: box.height } : { width: "100%", height: "100%" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(event) => setAspect(event.currentTarget.videoWidth / event.currentTarget.videoHeight)}
                  className="absolute inset-0 size-full object-contain"
                />
                {points && (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
                    <polygon points={points} fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                )}
              </div>
            )}
          </div>

          {reviewing && shot && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
              <PageAdjust
                photo={shot.photo}
                settings={shot.settings}
                edgesFound={shot.edgesFound}
                onChange={(settings) => setShot({ ...shot, settings })}
              />
            </div>
          )}

          {error && (aspect || reviewing) && (
            <p role="alert" className="px-5 py-2 text-sm font-medium text-red-500">
              {error}
            </p>
          )}

          {reviewing && shot ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setShot(null)}
                disabled={working !== null}
                className="mr-auto rounded-full px-4 py-2.5 text-base font-semibold ring-1 ring-border hover:bg-muted disabled:opacity-40"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={() => void save("next")}
                disabled={working !== null || !isConvex(shot.settings.corners)}
                className="rounded-full px-4 py-2.5 text-base font-semibold ring-1 ring-border hover:bg-muted disabled:opacity-40"
              >
                {working === "next" ? "Saving…" : "Save, scan next page"}
              </button>
              <button
                type="button"
                onClick={() => void save("finish")}
                disabled={working !== null || !isConvex(shot.settings.corners)}
                className="rounded-full bg-red-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-red-500 disabled:opacity-40"
              >
                {working === "finish" ? "Saving…" : "Save and finish"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 items-center px-5 py-4">
              <p role="status" className="text-base tabular-nums">
                {savedCount === 0 ? "" : `${savedCount} page${savedCount === 1 ? "" : "s"} saved`}
              </p>
              <button
                type="button"
                onClick={() => void snap()}
                disabled={!aspect || working !== null}
                aria-label="Take the photo"
                className="grid size-16 place-items-center justify-self-center rounded-full bg-white ring-4 ring-white/30 transition-transform active:scale-95 disabled:opacity-30"
              >
                <span className="size-12 rounded-full border-2 border-zinc-900" />
              </button>
              <span />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const button =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

interface AddPagesProps {
  // The document pages are added to; null starts a new one.
  documentId: string | null;
  // Pages were added to this document. `reviewPageId` is a page that hasn't
  // been looked over yet (photos picked from files) and should be opened.
  onAdded: (documentId: string, reviewPageId: string | null) => void;
  primary?: boolean;
}

// The two ways to get pages in: scan them with the camera, or pick pictures.
export function AddPages({ documentId, onAdded, primary = false }: AddPagesProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: File[]) => {
    setMessage(null);
    setBusy(`Preparing page 1 of ${files.length}…`);
    try {
      const { document, added } = await addPhotos(documentId, files, (done, total) =>
        setBusy(done < total ? `Preparing page ${done + 1} of ${total}…` : "Opening…")
      );
      onAdded(document.id, added[0] ?? null);
    } catch (cause) {
      setMessage(isStorageFull(cause) ? STORAGE_FULL : cause instanceof Error ? cause.message : "A page couldn't be added.");
    }
    setBusy(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => setCameraOpen(true)}
          className={`${button} ${primary ? "bg-red-600 text-white shadow-sm shadow-red-600/30 hover:bg-red-500" : "ring-1 ring-border hover:bg-muted"}`}
        >
          <Camera className="size-4" aria-hidden="true" />
          Scan with camera
        </button>
        <button type="button" disabled={busy !== null} onClick={() => inputRef.current?.click()} className={`${button} ring-1 ring-border hover:bg-muted`}>
          <ImagePlus className="size-4" aria-hidden="true" />
          Choose photos
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (files.length > 0) {
              void addFiles(files);
            }
          }}
        />
        {busy && (
          <span role="status" className="text-base text-muted-foreground">
            {busy}
          </span>
        )}
      </div>
      {message && (
        <p role="alert" className="text-base font-medium text-red-700 dark:text-red-400">
          {message}
        </p>
      )}
      {cameraOpen && (
        <CameraDialog
          documentId={documentId}
          onClose={(savedTo) => {
            setCameraOpen(false);
            if (savedTo) {
              onAdded(savedTo, null);
            }
          }}
        />
      )}
    </div>
  );
}
