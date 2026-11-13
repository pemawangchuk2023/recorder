"use client";

import { ExternalLink, NotebookPen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "recorder-speaker-notes-v1";
const MAX_LENGTH = 20000;

function readNotes(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

// The page shown in the separate notes window. It is self-contained: big
// text, a size control, and a scroll that moves by itself at a chosen pace.
function notesDocument(notes: string): string {
  const escaped = notes.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Speaker notes</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0a0a0a; color: #fafafa; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  header { position: sticky; top: 0; display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; padding: 10px 14px; background: #171717; border-bottom: 1px solid #262626; font-size: 14px; }
  button { font: inherit; font-weight: 600; color: inherit; background: #262626; border: 1px solid #404040; border-radius: 999px; padding: 6px 14px; cursor: pointer; }
  button:hover { background: #333; }
  button[aria-pressed="true"] { background: #dc2626; border-color: #dc2626; }
  label { display: inline-flex; gap: 6px; align-items: center; }
  input[type=range] { width: 110px; accent-color: #dc2626; }
  main { padding: 24px 28px 70vh; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.5; font-size: 28px; }
</style>
</head>
<body>
<header>
  <button id="scroll" type="button" aria-pressed="false">Start scrolling</button>
  <label>Pace <input id="pace" type="range" min="10" max="120" value="40" aria-label="Scrolling pace"></label>
  <label>Text size <input id="size" type="range" min="16" max="56" value="28" aria-label="Text size"></label>
  <button id="top" type="button">Back to top</button>
</header>
<main id="notes">${escaped}</main>
<script>
  var scrolling = false, last = 0, carry = 0;
  var button = document.getElementById("scroll"), pace = document.getElementById("pace");
  function step(now) {
    if (!scrolling) return;
    carry += (now - last) / 1000 * Number(pace.value);
    last = now;
    var whole = Math.floor(carry);
    if (whole > 0) { window.scrollBy(0, whole); carry -= whole; }
    requestAnimationFrame(step);
  }
  function set(on) {
    scrolling = on;
    button.setAttribute("aria-pressed", String(on));
    button.textContent = on ? "Stop scrolling" : "Start scrolling";
    if (on) { last = performance.now(); requestAnimationFrame(step); }
  }
  button.onclick = function () { set(!scrolling); };
  document.getElementById("top").onclick = function () { set(false); window.scrollTo(0, 0); };
  document.getElementById("size").oninput = function (event) { document.getElementById("notes").style.fontSize = event.target.value + "px"; };
  document.addEventListener("keydown", function (event) { if (event.key === " " && event.target === document.body) { event.preventDefault(); set(!scrolling); } });
  window.addEventListener("message", function (event) {
    if (event.origin === self.origin && event.data && typeof event.data.notes === "string") {
      document.getElementById("notes").textContent = event.data.notes;
    }
  });
</script>
</body>
</html>`;
}

// A script to read from while recording, like Loom's speaker notes: typed
// here, remembered in this browser, and shown in a separate window that can
// scroll by itself.
export function SpeakerNotes() {
  const [notes, setNotes] = useState("");
  const [blocked, setBlocked] = useState(false);
  const windowRef = useRef<Window | null>(null);

  useEffect(() => {
    // Read after mounting: storage only exists in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(readNotes());
    return () => windowRef.current?.close();
  }, []);

  const change = (next: string) => {
    setNotes(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembered, but still usable now.
    }
    // The open notes window follows what's typed.
    windowRef.current?.postMessage({ notes: next }, window.location.origin);
  };

  const open = () => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.focus();
      return;
    }
    const popup = window.open("", "recorder-speaker-notes", "popup,width=520,height=640");
    if (!popup) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    popup.document.open();
    popup.document.write(notesDocument(notes));
    popup.document.close();
    windowRef.current = popup;
  };

  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <details className="group rounded-3xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-3xl px-5 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
        <NotebookPen className="size-5 text-muted-foreground" aria-hidden="true" />
        Speaker notes
        <span className="ml-auto text-sm font-medium text-muted-foreground">
          {words > 0 ? `${words} words · about ${Math.max(1, Math.round(words / 150))} min to read` : "A script only you see"}
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t p-5">
        <label className="flex flex-col gap-2 text-sm font-medium">
          What you want to say
          <textarea
            value={notes}
            maxLength={MAX_LENGTH}
            rows={6}
            onChange={(event) => change(event.target.value)}
            placeholder="Type or paste your talking points…"
            className="resize-y rounded-2xl border border-input bg-background px-4 py-3 text-base font-normal leading-relaxed"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={open}
            disabled={!notes.trim()}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Open notes window
          </button>
          <span className="text-sm text-muted-foreground">Big text, with a scroll that moves by itself.</span>
        </div>
        {blocked && (
          <p role="alert" className="text-sm font-medium text-amber-700 dark:text-amber-400">
            The browser blocked the notes window. Allow pop-ups for this site (the icon at the right of
            the address bar), then press the button again.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          The notes stay out of your video when you share a tab or a window. If you share your
          <strong className="font-semibold"> entire screen</strong>, everything on it is recorded,
          including the notes window — put it on a second monitor, or share a window instead. Notes
          are saved in this browser only.
        </p>
      </div>
    </details>
  );
}
