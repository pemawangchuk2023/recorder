"use client";

import { ArrowLeft, Pause, Play, Redo2, RotateCcw, Save, Undo2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorStage, type EditorTool } from "@/app/edit/_components/editor-stage";
import { Timeline } from "@/app/edit/_components/timeline";
import {
  AnnotatePanel,
  CROP_SHAPES,
  CropPanel,
  CutPanel,
  SpeedPanel,
  TranscriptCuts,
  toolButton,
  type EnvelopeState,
} from "@/app/edit/_components/tool-panels";
import { useBlobUrl } from "@/app/edit/_hooks/use-blob-url";
import { useEditHistory } from "@/app/edit/_hooks/use-edit-history";
import { ANNOTATION_COLORS } from "@/app/edit/_lib/draw-annotations";
import {
  addCut,
  clampRect,
  cropPixels,
  isPlanEmpty,
  keepOnly,
  keptRanges,
  keptSeconds,
  remapMarkers,
  remapSegments,
  restoreRange,
  skipTarget,
  type Annotation,
  type AnnotationKind,
  type EditPlan,
  type FrameRect,
  type TimeRange,
} from "@/app/edit/_lib/edit-plan";
import { canRenderEdits, readEnvelope, renderEdit } from "@/app/edit/_lib/render-edit";
import { useLeaveGuard } from "@/app/recorder/_hooks/use-leave-guard";
import { formatPreciseTime } from "@/app/recorder/_lib/format-time";
import { saveRecording } from "@/app/recorder/_lib/save-recording";
import { ShortcutsHelp } from "@/components/shortcuts-help";
import { EDITOR_SHORTCUTS } from "@/constants/shortcuts";
import { formatBytes } from "@/lib/format-bytes";
import { addRecording, isQuotaError } from "@/lib/library/library";
import { titleToFilename } from "@/lib/library/titles";
import { fileVersionOf, type LibraryRecording } from "@/lib/library/types";
import { cn } from "@/lib/utils";

const TOOLS: { id: EditorTool; label: string }[] = [
  { id: "cut", label: "Cut" },
  { id: "crop", label: "Crop" },
  { id: "speed", label: "Speed" },
  { id: "annotate", label: "Annotate" },
  { id: "transcript", label: "By text" },
];

const NEW_ANNOTATION: Record<AnnotationKind, FrameRect> = {
  text: { x: 0.3, y: 0.76, width: 0.4, height: 0.1 },
  arrow: { x: 0.38, y: 0.38, width: 0.2, height: 0.2 },
  box: { x: 0.3, y: 0.3, width: 0.4, height: 0.3 },
  blur: { x: 0.3, y: 0.42, width: 0.4, height: 0.16 },
};
const NEW_ANNOTATION_SECONDS = 4;

type SaveState =
  | { status: "idle" }
  | { status: "rendering"; progress: number }
  | { status: "saved"; id: string; size: number }
  // The edit was made but the library had no room for it.
  | { status: "full"; video: Blob }
  | { status: "failed"; message: string };

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

interface EditorWorkspaceProps {
  recording: LibraryRecording;
  video: Blob;
}

export function EditorWorkspace({ recording, video }: EditorWorkspaceProps) {
  const duration = recording.duration;
  const frameWidth = recording.width ?? 1920;
  const frameHeight = recording.height ?? 1080;
  const history = useEditHistory(`recorder-edit:${recording.id}:${fileVersionOf(recording)}`);
  const { plan, update, endMerge, undo, redo } = history;

  const videoRef = useRef<HTMLVideoElement>(null);
  const url = useBlobUrl(video);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tool, setTool] = useState<EditorTool>("cut");
  const [selection, setSelection] = useState<TimeRange | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [cropShape, setCropShape] = useState("free");
  const [envelope, setEnvelope] = useState<EnvelopeState>({ status: "reading", progress: 0 });
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const isRendering = save.status === "rendering";
  useLeaveGuard(isRendering);

  const planRef = useRef(plan);
  useEffect(() => {
    planRef.current = plan;
  });

  // Reads how loud the recording is throughout, for the waveform and pauses.
  useEffect(() => {
    const controller = new AbortController();
    readEnvelope(video, (progress) => setEnvelope({ status: "reading", progress }), controller.signal)
      .then((result) => setEnvelope(result ? { status: "ready", envelope: result } : { status: "none" }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setEnvelope({ status: "none" });
        }
      });
    return () => controller.abort();
  }, [video]);

  // Follows the video: moves the playhead, and jumps over cut parts so the
  // preview plays like the saved video will.
  useEffect(() => {
    let frame = 0;
    let shown = -1;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const element = videoRef.current;
      if (!element) {
        return;
      }
      if (!element.paused) {
        const target = skipTarget(element.currentTime, planRef.current.cuts);
        if (target !== null) {
          if (target >= duration - 0.05) {
            element.pause();
            element.currentTime = duration;
          } else {
            element.currentTime = target;
          }
        }
      }
      if (Math.abs(element.currentTime - shown) > 0.03) {
        shown = element.currentTime;
        setTime(shown);
      }
      setIsPlaying(!element.paused && !element.ended);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = plan.speed;
    }
  }, [plan.speed, url]);

  const seek = useCallback(
    (to: number) => {
      const element = videoRef.current;
      if (element) {
        element.currentTime = Math.min(duration, Math.max(0, to));
      }
    },
    [duration]
  );

  const togglePlay = useCallback(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }
    if (!element.paused) {
      element.pause();
      return;
    }
    // At the end (or the end of what's kept), play again from the top.
    const kept = keptRanges(planRef.current.cuts, duration);
    const lastKept = kept[kept.length - 1]?.end ?? duration;
    if (element.currentTime >= lastKept - 0.05) {
      element.currentTime = kept[0]?.start ?? 0;
    }
    void element.play().catch(() => {});
  }, [duration]);

  const changePlan = (patch: Partial<EditPlan>, mergeKey?: string) => {
    setSave((previous) => (previous.status === "rendering" ? previous : { status: "idle" }));
    update({ ...plan, ...patch }, mergeKey);
  };

  const applyCuts = (next: TimeRange[] | null): boolean => {
    if (!next) {
      return false;
    }
    changePlan({ cuts: next });
    setSelection(null);
    return true;
  };
  const cutSelection = () => (selection ? applyCuts(addCut(plan.cuts, selection, duration)) : false);
  const keepSelection = () => (selection ? applyCuts(keepOnly(plan.cuts, selection, duration)) : false);
  const addCuts = (cuts: TimeRange[]) => {
    let next: TimeRange[] | null = plan.cuts;
    for (const cut of cuts) {
      next = next ? addCut(next, cut, duration) : null;
    }
    return applyCuts(next);
  };

  const addAnnotation = (kind: AnnotationKind) => {
    const start = Math.min(time, Math.max(0, duration - 0.5));
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      kind,
      ...NEW_ANNOTATION[kind],
      start,
      end: Math.min(duration, start + NEW_ANNOTATION_SECONDS),
      text: kind === "text" ? "Your text" : "",
      color: kind === "text" ? ANNOTATION_COLORS[5] : ANNOTATION_COLORS[0],
      head: 0,
    };
    changePlan({ annotations: [...plan.annotations, annotation] });
    setSelectedAnnotation(annotation.id);
    videoRef.current?.pause();
  };
  const changeAnnotation = (id: string, patch: Partial<Annotation>, mergeKey?: string) => {
    changePlan(
      {
        annotations: plan.annotations.map((annotation) =>
          annotation.id === id ? { ...annotation, ...patch } : annotation
        ),
      },
      mergeKey
    );
  };
  const deleteAnnotation = (id: string) => {
    changePlan({ annotations: plan.annotations.filter((annotation) => annotation.id !== id) });
    setSelectedAnnotation(null);
  };

  // Keyboard shortcuts (listed under "Keyboard shortcuts").
  const shortcutsRef = useRef({ cutSelection, deleteAnnotation, selection, selectedAnnotation, time, tool });
  useEffect(() => {
    shortcutsRef.current = { cutSelection, deleteAnnotation, selection, selectedAnnotation, time, tool };
  });
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || abortRef.current) {
        return;
      }
      const current = shortcutsRef.current;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        (event.shiftKey ? redo : undo)();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      // Space on a focused button should press that button.
      const onControl = event.target instanceof HTMLElement && event.target.closest("button, a, summary, [role=tab]");
      if (key === " " && !onControl) {
        event.preventDefault();
        togglePlay();
      } else if (key === "arrowleft" || key === "arrowright") {
        event.preventDefault();
        seek(current.time + (key === "arrowleft" ? -1 : 1) * (event.shiftKey ? 5 : 1));
      } else if (key === "," || key === ".") {
        videoRef.current?.pause();
        seek(current.time + (key === "," ? -1 : 1) / 30);
      } else if (key === "i") {
        setTool("cut");
        setSelection({ start: current.time, end: Math.max(current.time, current.selection?.end ?? duration) });
      } else if (key === "o") {
        setTool("cut");
        setSelection({ start: Math.min(current.time, current.selection?.start ?? 0), end: current.time });
      } else if (key === "x" && current.selection) {
        current.cutSelection();
      } else if (key === "escape") {
        setSelection(null);
        setSelectedAnnotation(null);
      } else if ((key === "delete" || key === "backspace") && current.selectedAnnotation && current.tool === "annotate") {
        event.preventDefault();
        current.deleteAnnotation(current.selectedAnnotation);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, redo, undo, seek, togglePlay]);

  const kept = keptSeconds(plan.cuts, duration);
  const resultSeconds = kept / plan.speed;
  const pixels = cropPixels(plan.crop, frameWidth, frameHeight);
  const nothingToSave = isPlanEmpty(plan);
  const canRender = canRenderEdits();

  const saveEdit = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    videoRef.current?.pause();
    setSave({ status: "rendering", progress: 0 });
    let rendered: Blob | null = null;
    try {
      const result = await renderEdit(
        video,
        plan,
        (progress) => setSave({ status: "rendering", progress }),
        controller.signal
      );
      rendered = result.video;
      const ranges = keptRanges(plan.cuts, duration);
      const saved = await addRecording({
        title: `${recording.title} (edited)`.slice(0, 120),
        video: result.video,
        transcript: remapSegments(recording.transcript, ranges, plan.speed),
        chapters: remapMarkers(recording.chapters ?? [], ranges, plan.speed),
        folderId: recording.folderId ?? null,
      });
      setSave({ status: "saved", id: saved.id, size: saved.size });
    } catch (cause) {
      if (controller.signal.aborted) {
        setSave({ status: "idle" });
      } else if (rendered && isQuotaError(cause)) {
        setSave({ status: "full", video: rendered });
      } else {
        setSave({
          status: "failed",
          message:
            cause instanceof Error && cause.message
              ? cause.message
              : "The edit couldn't be saved. Your recording and your edits are unchanged.",
        });
      }
    }
    abortRef.current = null;
  };

  const cropAspect = (() => {
    const shape = CROP_SHAPES.find((each) => each.id === cropShape);
    if (!shape || shape.aspect === null) {
      return null;
    }
    return shape.aspect === "original" ? frameWidth / frameHeight : shape.aspect;
  })();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/library?v=${recording.id}`}
          className="-ml-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to “{recording.title.length > 40 ? `${recording.title.slice(0, 40)}…` : recording.title}”
        </Link>
        <ShortcutsHelp groups={EDITOR_SHORTCUTS} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {url && (
            <EditorStage
              videoRef={videoRef}
              src={url}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              time={time}
              tool={tool}
              crop={plan.crop}
              cropAspect={cropAspect}
              onCropChange={(crop) => changePlan({ crop }, "crop")}
              annotations={plan.annotations}
              selectedId={selectedAnnotation}
              onSelect={setSelectedAnnotation}
              onAnnotationChange={(id, rect) => changeAnnotation(id, clampRect(rect, 0.02), `move:${id}`)}
              onCommit={endMerge}
              onTogglePlay={togglePlay}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              disabled={isRendering}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-base font-semibold text-background hover:opacity-85 disabled:opacity-40"
            >
              {isPlaying ? <Pause className="size-4 fill-current" aria-hidden="true" /> : <Play className="size-4 fill-current" aria-hidden="true" />}
              {isPlaying ? "Pause" : "Play"}
            </button>
            <p className="text-base font-semibold tabular-nums">
              {formatPreciseTime(time)} <span className="font-normal text-muted-foreground">/ {formatPreciseTime(duration)}</span>
            </p>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={history.undo} disabled={!history.canUndo || isRendering} className={cn(toolButton, "px-3")} title="Undo (Ctrl+Z)">
                <Undo2 className="size-4" aria-hidden="true" />
                Undo
              </button>
              <button type="button" onClick={history.redo} disabled={!history.canRedo || isRendering} className={cn(toolButton, "px-3")} title="Redo (Ctrl+Shift+Z)">
                <Redo2 className="size-4" aria-hidden="true" />
                Redo
              </button>
              <button
                type="button"
                onClick={() => {
                  history.reset();
                  setSelection(null);
                  setSelectedAnnotation(null);
                }}
                disabled={nothingToSave || isRendering}
                className={cn(toolButton, "px-3")}
                title="Remove every edit (can be undone)"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>

          <Timeline
            duration={duration}
            time={time}
            cuts={plan.cuts}
            selection={selection}
            annotations={plan.annotations}
            selectedAnnotationId={selectedAnnotation}
            chapters={recording.chapters ?? []}
            envelope={envelope.status === "ready" ? envelope.envelope : null}
            onSeek={seek}
            onSelectionChange={(next) => {
              setSelection(next);
              if (next) {
                setTool("cut");
              }
            }}
            onSelectAnnotation={(id) => {
              setSelectedAnnotation(id);
              setTool("annotate");
            }}
          />

          <section aria-label="Save" className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">Save your edit</h2>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {nothingToSave
                    ? "No edits yet — cut, crop, change the speed or annotate first."
                    : `Result: ${formatPreciseTime(resultSeconds)} (from ${formatPreciseTime(duration)}) · ${pixels.width} × ${pixels.height}. Saved as a new recording; the original stays.`}
                </p>
              </div>
              {isRendering ? (
                <button type="button" onClick={() => abortRef.current?.abort()} className={toolButton}>
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={nothingToSave || !canRender}
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-base font-semibold text-white shadow-sm shadow-red-600/30 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="size-4" aria-hidden="true" />
                  Save as new recording
                </button>
              )}
            </div>
            {!canRender && (
              <p role="alert" className="text-sm font-medium text-amber-700 dark:text-amber-400">
                This browser can&apos;t re-encode video (it lacks WebCodecs), so edits can be previewed but
                not saved. Use an up-to-date Chrome, Edge, Safari or Firefox on a computer.
              </p>
            )}
            {save.status === "rendering" && (
              <div className="flex flex-col gap-2">
                <div
                  role="progressbar"
                  aria-label="Saving the edit"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(save.progress * 100)}
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div className="h-full rounded-full bg-red-600 transition-[width]" style={{ width: `${Math.round(save.progress * 100)}%` }} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Building the video on this device… {Math.round(save.progress * 100)}%. Keep this tab open;
                  long or 4K recordings take a while.
                </p>
              </div>
            )}
            {save.status === "saved" && (
              <p role="status" className="text-base">
                Saved ({formatBytes(save.size)}).{" "}
                <Link href={`/library?v=${save.id}`} className="font-semibold underline underline-offset-2 hover:no-underline">
                  Watch the edited recording
                </Link>
                , or keep editing here.
              </p>
            )}
            {save.status === "full" && (
              <p role="alert" className="text-base text-amber-700 dark:text-amber-400">
                The edited video is ready, but this browser&apos;s storage is full, so it couldn&apos;t be
                added to the library.{" "}
                <button
                  type="button"
                  onClick={() => void saveRecording(save.video, titleToFilename(`${recording.title} (edited)`, "mp4"))}
                  className="font-semibold underline underline-offset-2 hover:no-underline"
                >
                  Download it instead
                </button>
                , or free up space in the library and save again.
              </p>
            )}
            {save.status === "failed" && (
              <p role="alert" className="text-base text-red-700 dark:text-red-400">
                {save.message}
              </p>
            )}
            {!nothingToSave && save.status === "idle" && (
              <p className="text-sm text-muted-foreground">
                Your edits are remembered in this browser until you reset them, so you can come back
                later. Saving re-encodes the video once, at high quality.
              </p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-5 rounded-3xl border bg-card p-5 sm:p-6">
          <div role="tablist" aria-label="Editing tools" className="flex flex-wrap gap-1 rounded-2xl bg-muted p-1">
            {TOOLS.map((each) => (
              <button
                key={each.id}
                type="button"
                role="tab"
                id={`tool-tab-${each.id}`}
                aria-selected={tool === each.id}
                aria-controls="tool-panel"
                onClick={() => {
                  setTool(each.id);
                  if (each.id === "crop" && !plan.crop) {
                    setCropShape("free");
                  }
                }}
                className={cn(
                  "flex-1 rounded-xl px-2 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                  tool === each.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {each.label}
              </button>
            ))}
          </div>
          <fieldset id="tool-panel" role="tabpanel" aria-labelledby={`tool-tab-${tool}`} disabled={isRendering} className="min-w-0 disabled:opacity-60">
            {tool === "cut" && (
              <CutPanel
                duration={duration}
                time={time}
                cuts={plan.cuts}
                selection={selection}
                envelope={envelope}
                onSelectionChange={setSelection}
                onCutSelection={cutSelection}
                onKeepSelection={keepSelection}
                onAddCuts={addCuts}
                onRestore={(cut) => changePlan({ cuts: restoreRange(plan.cuts, cut, duration) })}
                onSeek={seek}
              />
            )}
            {tool === "crop" && (
              <CropPanel
                crop={plan.crop}
                shapeId={cropShape}
                frameWidth={frameWidth}
                frameHeight={frameHeight}
                onChange={(crop, shapeId) => {
                  setCropShape(shapeId);
                  changePlan({ crop });
                }}
              />
            )}
            {tool === "speed" && (
              <SpeedPanel speed={plan.speed} keptSeconds={kept} onChange={(speed) => changePlan({ speed })} />
            )}
            {tool === "annotate" && (
              <AnnotatePanel
                annotations={plan.annotations}
                selectedId={selectedAnnotation}
                time={time}
                duration={duration}
                onAdd={addAnnotation}
                onSelect={setSelectedAnnotation}
                onChange={(id, patch, typing) => changeAnnotation(id, patch, typing ? `type:${id}` : undefined)}
                onDelete={deleteAnnotation}
                onSeek={seek}
              />
            )}
            {tool === "transcript" && (
              <TranscriptCuts
                transcript={recording.transcript}
                cuts={plan.cuts}
                time={time}
                onToggle={(segment, cut) =>
                  cut
                    ? applyCuts(addCut(plan.cuts, segment, duration))
                    : changePlan({ cuts: restoreRange(plan.cuts, segment, duration) })
                }
                onSeek={seek}
              />
            )}
          </fieldset>
        </aside>
      </div>
    </div>
  );
}
