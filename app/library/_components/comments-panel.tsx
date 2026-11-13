"use client";

import { MessageSquare, X } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import { formatTime } from "@/app/recorder/_lib/format-time";
import type { RecordingComment } from "@/lib/library/types";

const REACTIONS = ["👍", "❤️", "😂", "🎉", "👀", "❓"] as const;
const MAX_NOTE_LENGTH = 500;

interface CommentsPanelProps {
  comments: RecordingComment[];
  duration: number;
  playbackRef: RefObject<HTMLVideoElement | null>;
  onChange: (comments: RecordingComment[]) => void;
}

function newComment(time: number, text: string, kind: RecordingComment["kind"]): RecordingComment {
  return { id: crypto.randomUUID(), time, text, kind, createdAt: Date.now() };
}

function useCurrentTime(playbackRef: RefObject<HTMLVideoElement | null>): number {
  const [time, setTime] = useState(0);
  useEffect(() => {
    // Media events don't bubble, but they can be caught on the way down.
    const handle = (event: Event) => {
      if (playbackRef.current && event.target === playbackRef.current) {
        setTime(playbackRef.current.currentTime);
      }
    };
    document.addEventListener("timeupdate", handle, true);
    document.addEventListener("seeked", handle, true);
    return () => {
      document.removeEventListener("timeupdate", handle, true);
      document.removeEventListener("seeked", handle, true);
    };
  }, [playbackRef]);
  return time;
}

// Notes and emoji reactions pinned to moments of the video, like Loom's
// comments — kept on this device, since there is no server to share them.
export function CommentsPanel({ comments, duration, playbackRef, onChange }: CommentsPanelProps) {
  const time = useCurrentTime(playbackRef);
  const [draft, setDraft] = useState("");
  const sorted = [...comments].sort((a, b) => a.time - b.time || a.createdAt - b.createdAt);

  const add = (text: string, kind: RecordingComment["kind"]) => {
    const at = Math.min(duration, playbackRef.current?.currentTime ?? time);
    onChange([...comments, newComment(at, text, kind)]);
  };
  const seek = (to: number) => {
    if (playbackRef.current) {
      playbackRef.current.currentTime = to;
    }
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="comments-heading">
      <h3 id="comments-heading" className="flex items-center gap-2 text-lg font-semibold">
        <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
        Notes and reactions
        {comments.length > 0 && <span className="text-sm font-normal text-muted-foreground">{comments.length}</span>}
      </h3>

      {/* Where they fall in the video. */}
      {sorted.length > 0 && duration > 0 && (
        <div className="relative h-7 rounded-full bg-muted" aria-hidden="true">
          {sorted.map((comment) => (
            <button
              key={comment.id}
              type="button"
              tabIndex={-1}
              onClick={() => seek(comment.time)}
              title={`${formatTime(Math.floor(comment.time))} ${comment.text}`}
              className="absolute top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-sm hover:scale-125"
              style={{ left: `${Math.min(98, Math.max(2, (comment.time / duration) * 100))}%` }}
            >
              {comment.kind === "reaction" ? comment.text : <span className="size-2.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>
      )}

      <div role="group" aria-label={`React at ${formatTime(Math.floor(time))}`} className="flex flex-wrap gap-1.5">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => add(emoji, "reaction")}
            aria-label={`React with ${emoji} at ${formatTime(Math.floor(time))}`}
            className="grid size-10 place-items-center rounded-full text-xl ring-1 ring-border transition-transform hover:scale-110 hover:bg-muted"
          >
            {emoji}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) {
            add(draft.trim(), "note");
            setDraft("");
          }
        }}
      >
        <input
          value={draft}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          aria-label={`Note at ${formatTime(Math.floor(time))}`}
          placeholder={`Add a note at ${formatTime(Math.floor(time))}`}
          className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2 text-base"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {sorted.length > 0 ? (
        <ul className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-2xl border">
          {sorted.map((comment) => (
            <li key={comment.id} className="flex items-start gap-2 px-3 py-2">
              <button type="button" onClick={() => seek(comment.time)} className="flex min-w-0 flex-1 gap-3 text-left text-base">
                <span className="shrink-0 font-semibold tabular-nums text-brand">{formatTime(Math.floor(comment.time))}</span>
                <span className={comment.kind === "reaction" ? "text-xl leading-6" : "break-words"}>{comment.text}</span>
              </button>
              <button
                type="button"
                onClick={() => onChange(comments.filter((each) => each.id !== comment.id))}
                aria-label={`Remove ${comment.kind === "reaction" ? "reaction" : "note"} at ${formatTime(Math.floor(comment.time))}`}
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Pause on a moment and leave yourself a note or a reaction. They stay in this browser, and
          are included when you back the library up.
        </p>
      )}
    </section>
  );
}
