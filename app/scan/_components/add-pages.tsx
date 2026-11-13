"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";

function cameraProblem(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "The camera is blocked for this site. Click the icon at the left of the address bar, allow Camera, then try again. On a phone, also check the browser's camera permission in system settings.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device. Use “Choose photos” to add pictures you already have.";
  }
  if (name === "NotReadableError") {
    return "The camera couldn't be opened — another app may be using it. Close that app and try again.";
  }
  return "The camera couldn't be started. Use “Choose photos” instead.";
}

// A camera view that takes one photo per page. Photos pile up until Done.
function CameraDialog({ onDone, onClose }: { onDone: (photos: Blob[]) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setError("This browser can't use the camera here. Use “Choose photos” instead."));
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

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
    if (photo) {
      setPhotos((previous) => [...previous, photo]);
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white sm:inset-6 sm:rounded-3xl">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div>
              <Dialog.Title className="text-lg font-semibold">Scan with the camera</Dialog.Title>
              <Dialog.Description className="text-sm text-zinc-400">
                Lay the page on a darker surface, fill the view with it, and avoid shadows.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label="Close camera">
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="relative min-h-0 flex-1 bg-black">
            {error ? (
              <p role="alert" className="absolute inset-0 grid place-items-center p-8 text-center text-base">
                {error}
              </p>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setReady(true)}
                className="absolute inset-0 size-full object-contain"
              />
            )}
            {flash && <div aria-hidden="true" className="absolute inset-0 bg-white/70" />}
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <p role="status" className="min-w-24 text-base tabular-nums">
              {photos.length === 0 ? "No pages yet" : `${photos.length} page${photos.length === 1 ? "" : "s"}`}
            </p>
            <button
              type="button"
              onClick={() => void capture()}
              disabled={!ready || error !== null}
              aria-label="Take a photo of this page"
              className="grid size-16 place-items-center rounded-full bg-white ring-4 ring-white/30 transition-transform active:scale-95 disabled:opacity-30"
            >
              <span className="size-12 rounded-full border-2 border-zinc-900" />
            </button>
            <button
              type="button"
              onClick={() => onDone(photos)}
              disabled={photos.length === 0}
              className="min-w-24 rounded-full bg-red-600 px-5 py-2.5 text-base font-semibold hover:bg-red-500 disabled:opacity-30"
            >
              Done
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const button =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

// The two ways to get pages in: photograph them now, or pick pictures.
export function AddPages({
  onPhotos,
  busy,
  primary = false,
}: {
  onPhotos: (photos: Blob[]) => void;
  // Text shown while photos are being turned into pages; null when idle.
  busy: string | null;
  primary?: boolean;
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
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
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => inputRef.current?.click()}
        className={`${button} ring-1 ring-border hover:bg-muted`}
      >
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
            onPhotos(files);
          }
        }}
      />
      {busy && (
        <span role="status" className="text-base text-muted-foreground">
          {busy}
        </span>
      )}
      {cameraOpen && (
        <CameraDialog
          onClose={() => setCameraOpen(false)}
          onDone={(photos) => {
            setCameraOpen(false);
            onPhotos(photos);
          }}
        />
      )}
    </div>
  );
}
