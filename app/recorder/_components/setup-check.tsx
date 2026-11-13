"use client";

import { CircleAlert, CircleCheck, CircleX, Info, Stethoscope } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { isFloatingBubbleSupported } from "@/app/recorder/_hooks/use-floating-bubble";
import { getEnglishModelStatus, type CaptionModelStatus } from "@/app/recorder/_lib/live-captions";
import {
  canUseWebCodecs,
  getMp4MimeType,
  isScreenCaptureSupported,
} from "@/app/recorder/_lib/recording-format";
import { formatBytes } from "@/lib/format-bytes";
import { getStorageInfo, requestPersistentStorage, type StorageInfo } from "@/lib/library/library";
import { canRecordToDisk } from "@/lib/takes/take-files";
import { cn } from "@/lib/utils";

type Level = "ok" | "warn" | "fail" | "info";
type Permission = PermissionState | "unknown";
type Device = "microphone" | "camera";

interface Check {
  label: string;
  level: Level;
  detail: ReactNode;
  action?: { label: string; run: () => void };
}

interface Facts {
  secure: boolean;
  webCodecs: boolean;
  basicRecorder: boolean;
  screen: boolean;
  chromium: boolean;
  mac: boolean;
  disk: boolean;
  floating: boolean;
  microphone: Permission;
  camera: Permission;
  captions: CaptionModelStatus;
  storage: StorageInfo | null;
}

const ICONS: Record<Level, { icon: typeof Info; className: string; word: string }> = {
  ok: { icon: CircleCheck, className: "text-emerald-600 dark:text-emerald-400", word: "Ready" },
  warn: { icon: CircleAlert, className: "text-amber-600 dark:text-amber-400", word: "Limited" },
  fail: { icon: CircleX, className: "text-red-600 dark:text-red-400", word: "Not available" },
  info: { icon: Info, className: "text-sky-600 dark:text-sky-400", word: "Good to know" },
};

async function queryPermission(name: Device): Promise<PermissionStatus | null> {
  try {
    return await navigator.permissions.query({ name: name as PermissionName });
  } catch {
    // Firefox and Safari can't be asked about these; they prompt when needed.
    return null;
  }
}

async function gatherFacts(): Promise<Facts> {
  const [microphone, camera, captions, storage] = await Promise.all([
    queryPermission("microphone"),
    queryPermission("camera"),
    getEnglishModelStatus(),
    getStorageInfo().catch(() => null),
  ]);
  const agent = navigator.userAgent;
  return {
    secure: window.isSecureContext,
    webCodecs: canUseWebCodecs(),
    basicRecorder: getMp4MimeType() !== null,
    screen: isScreenCaptureSupported(),
    chromium: /Chrome\//.test(agent) && !/Firefox\//.test(agent),
    mac: /Macintosh|Mac OS X/.test(agent),
    disk: canRecordToDisk(),
    floating: isFloatingBubbleSupported(),
    microphone: microphone?.state ?? "unknown",
    camera: camera?.state ?? "unknown",
    captions,
    storage,
  };
}

function deviceCheck(device: Device, state: Permission, onAllow: () => void): Check {
  const label = device === "microphone" ? "Microphone" : "Camera";
  if (state === "granted") {
    return { label, level: "ok", detail: `This site may use your ${device}.` };
  }
  if (state === "denied") {
    return {
      label,
      level: "fail",
      detail: (
        <>
          Blocked for this site. Click the icon at the left of the address bar, set {label} to
          Allow, then reload. If it&apos;s already allowed there, check your system settings: on
          Windows, Settings → Privacy &amp; security → {label} (also turn on access for desktop
          apps); on a Mac, System Settings → Privacy &amp; Security → {label}.
        </>
      ),
    };
  }
  return {
    label,
    level: "info",
    detail:
      state === "prompt"
        ? `Your browser will ask the first time it's needed. You can allow it now to skip that later.`
        : `Your browser will ask each time the ${device} is needed.`,
    action: { label: "Allow now", run: onAllow },
  };
}

function buildChecks(facts: Facts, allow: (device: Device) => void, protect: () => void): Check[] {
  const checks: Check[] = [];
  if (!facts.secure) {
    checks.push({
      label: "Secure page",
      level: "fail",
      detail: "Browsers only allow recording on https:// pages (or localhost). Open this site over HTTPS.",
    });
  }
  checks.push(
    facts.webCodecs
      ? { label: "Video quality", level: "ok", detail: "Full quality: sharp constant-quality MP4 up to 4K, with pause and steady timing." }
      : facts.basicRecorder
        ? {
            label: "Video quality",
            level: "warn",
            detail:
              "This browser uses its basic built-in recorder: fixed bitrate, no camera bubble, burned-in captions or 9:16 layout. Use an up-to-date Chrome or Edge on a computer for the full recorder.",
          }
        : {
            label: "Video quality",
            level: "fail",
            detail: "This browser can't record MP4 video. Use an up-to-date Chrome or Edge on a computer.",
          }
  );
  checks.push(
    facts.screen
      ? { label: "Screen sharing", level: "ok", detail: "You'll pick a tab, a window or the whole screen each time you press Start. On a Mac, also allow your browser under System Settings → Privacy & Security → Screen & System Audio Recording." }
      : { label: "Screen sharing", level: "warn", detail: "Phones and tablets can't share their screen, so only Camera mode is available here." }
  );
  checks.push(deviceCheck("microphone", facts.microphone, () => allow("microphone")));
  checks.push(deviceCheck("camera", facts.camera, () => allow("camera")));
  if (facts.screen) {
    checks.push(
      facts.chromium
        ? {
            label: "Computer sound",
            level: "info",
            detail: facts.mac
              ? "On a Mac, a shared Chrome tab is the dependable way to record sound: choose the “Chrome Tab” list and keep “Also share tab audio” on. Shared windows and whole screens usually stay silent."
              : "A shared tab always carries its sound (keep “Also share tab audio” on). Sharing the entire screen can include all system sound on Windows and ChromeOS; a single window can't.",
          }
        : {
            label: "Computer sound",
            level: "warn",
            detail: "This browser can't capture computer sound. Your microphone still records. Chrome and Edge can record a tab's sound.",
          }
    );
  }
  checks.push(
    facts.disk
      ? { label: "Crash protection", level: "ok", detail: "Each take is written to this device while it records. If the tab crashes or closes, it's offered back next time (minus up to the last 10 seconds)." }
      : { label: "Crash protection", level: "warn", detail: "This browser can't write a take to disk while recording, so it's held in memory until you press Stop. Keep this tab open, and prefer shorter recordings." }
  );
  if (facts.storage && facts.storage.quota > 0) {
    const free = Math.max(0, facts.storage.quota - facts.storage.used);
    checks.push(
      facts.storage.persisted
        ? { label: "Storage", level: "ok", detail: `${formatBytes(free)} free for this site, and protected: the browser won't clear your library to make room.` }
        : {
            label: "Storage",
            level: "info",
            detail: `${formatBytes(free)} free for this site. The browser may clear the library if the disk runs very low, and clearing site data always removes it — download recordings you want to keep.`,
            action: { label: "Protect my library", run: protect },
          }
    );
  }
  checks.push(
    facts.captions === "available"
      ? { label: "Live captions", level: "ok", detail: "The on-device English speech model is installed. Speech is never sent anywhere." }
      : facts.captions === "unsupported" || facts.captions === "unavailable"
        ? { label: "Live captions", level: "warn", detail: "This browser has no on-device speech recognition, so recordings have no captions or transcript. Chrome on a computer supports it." }
        : { label: "Live captions", level: "info", detail: "Available after a one-time download of Chrome's English speech model — turn on Captions in the settings to start it." }
  );
  if (facts.screen && !facts.floating) {
    checks.push({
      label: "Floating camera",
      level: "info",
      detail: "The always-on-top camera bubble needs Chrome or Edge. The camera is still drawn into the video.",
    });
  }
  return checks;
}

// What this browser and device can do, and how to fix what's blocked —
// before the first recording rather than in an error halfway through.
export function SetupCheck() {
  const [facts, setFacts] = useState<Facts | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setFacts(await gatherFacts());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const statuses: PermissionStatus[] = [];
    const update = () => {
      void gatherFacts().then((next) => {
        if (!cancelled) {
          setFacts(next);
        }
      });
    };
    update();
    // Re-check when a permission is granted or blocked from the address bar.
    void Promise.all([queryPermission("microphone"), queryPermission("camera")]).then((found) => {
      found.forEach((status) => {
        if (status && !cancelled) {
          status.addEventListener("change", update);
          statuses.push(status);
        }
      });
    });
    return () => {
      cancelled = true;
      statuses.forEach((status) => status.removeEventListener("change", update));
    };
  }, []);

  const allow = async (device: Device) => {
    setNote(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        device === "microphone" ? { audio: true } : { video: true }
      );
      stream.getTracks().forEach((track) => track.stop());
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setNote(
        name === "NotFoundError" || name === "OverconstrainedError"
          ? `No ${device} was found on this device.`
          : name === "NotReadableError"
            ? `The ${device} is in use by another app. Close it there and try again.`
            : `The ${device} wasn't allowed. Use the icon at the left of the address bar to change it.`
      );
    }
    await refresh();
  };

  const protect = async () => {
    const granted = await requestPersistentStorage();
    setNote(
      granted
        ? null
        : "The browser didn't grant protected storage. Chrome decides this by itself, usually once you use the site regularly or install it as an app."
    );
    await refresh();
  };

  if (!facts) {
    return null;
  }
  const checks = buildChecks(facts, (device) => void allow(device), () => void protect());
  const problems = checks.filter((check) => check.level === "fail").length;
  const limits = checks.filter((check) => check.level === "warn").length;
  const summary =
    problems > 0
      ? `${problems} thing${problems === 1 ? "" : "s"} to fix`
      : limits > 0
        ? `Ready, with ${limits} limit${limits === 1 ? "" : "s"} in this browser`
        : "Everything is ready";

  return (
    <details className="group rounded-3xl border bg-card" open={problems > 0}>
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-3xl px-5 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
        <Stethoscope className="size-5 text-muted-foreground" aria-hidden="true" />
        Check my setup
        <span
          className={cn(
            "ml-auto text-sm font-medium",
            problems > 0 ? "text-red-600 dark:text-red-400" : limits > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
          )}
        >
          {summary}
        </span>
      </summary>
      <ul className="flex flex-col divide-y border-t px-5">
        {checks.map((check) => {
          const { icon: Icon, className, word } = ICONS[check.level];
          return (
            <li key={check.label} className="flex items-start gap-3 py-3.5">
              <Icon className={cn("mt-0.5 size-5 shrink-0", className)} aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-base font-medium">
                  {check.label} <span className="sr-only">— {word}</span>
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">{check.detail}</p>
              </div>
              {check.action && (
                <button
                  type="button"
                  onClick={check.action.run}
                  className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border hover:bg-muted"
                >
                  {check.action.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {note && (
        <p role="status" className="border-t px-5 py-3.5 text-sm font-medium text-amber-700 dark:text-amber-400">
          {note}
        </p>
      )}
    </details>
  );
}
