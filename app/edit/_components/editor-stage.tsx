"use client";

import { useEffect, useRef, type RefObject } from "react";
import { RectHandle } from "@/app/edit/_components/rect-handle";
import { drawAnnotations } from "@/app/edit/_lib/draw-annotations";
import { annotationsAt, type Annotation, type FrameRect } from "@/app/edit/_lib/edit-plan";

export type EditorTool = "cut" | "crop" | "speed" | "annotate" | "transcript";

interface EditorStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  frameWidth: number;
  frameHeight: number;
  time: number;
  tool: EditorTool;
  crop: FrameRect | null;
  // Width ÷ height the crop must keep, in pixels; null when free.
  cropAspect: number | null;
  onCropChange: (crop: FrameRect) => void;
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAnnotationChange: (id: string, rect: FrameRect) => void;
  // A drag or nudge has ended.
  onCommit: () => void;
  onTogglePlay: () => void;
}

const KIND_NAMES: Record<Annotation["kind"], string> = {
  text: "Text label",
  arrow: "Arrow",
  box: "Box",
  blur: "Blur",
};

// The video being edited, with the crop frame and annotations on top. What's
// drawn here is drawn by the same code when the edit is saved.
export function EditorStage({
  videoRef,
  src,
  frameWidth,
  frameHeight,
  time,
  tool,
  crop,
  cropAspect,
  onCropChange,
  annotations,
  selectedId,
  onSelect,
  onAnnotationChange,
  onCommit,
  onTogglePlay,
}: EditorStageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotationsRef = useRef(annotations);
  useEffect(() => {
    annotationsRef.current = annotations;
  });

  // Redraws the annotations every frame: blur boxes show the video beneath
  // them, which changes as it plays.
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const container = frameRef.current;
      if (!canvas || !video || !container) {
        return;
      }
      const scale = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.round(container.clientWidth * scale);
      const height = Math.round(container.clientHeight * scale);
      if (width === 0 || height === 0) {
        return;
      }
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.clearRect(0, 0, width, height);
      const active = annotationsAt(annotationsRef.current, video.currentTime);
      if (active.length === 0) {
        return;
      }
      const hasPicture = video.readyState >= 2 && video.videoWidth > 0;
      drawAnnotations(
        ctx,
        active,
        { x: 0, y: 0, width, height },
        hasPicture ? { image: video, x: 0, y: 0, width: video.videoWidth, height: video.videoHeight } : null
      );
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [videoRef]);

  const visible = annotationsAt(annotations, time);
  const selected = visible.find((annotation) => annotation.id === selectedId);
  const frameAspect = frameWidth / frameHeight;

  return (
    <div className="flex justify-center rounded-3xl bg-zinc-950 p-2 shadow-lg ring-1 ring-zinc-900/10 dark:ring-white/10">
      <div
        ref={frameRef}
        className="relative overflow-hidden bg-black"
        style={{ aspectRatio: `${frameWidth} / ${frameHeight}`, width: `min(100%, calc(62vh * ${frameAspect}))` }}
      >
        {/* The preview has no captions track: captions are burned into the picture when recorded. */}
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="auto"
          onClick={onTogglePlay}
          className="absolute inset-0 size-full"
        />
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />

        {tool === "annotate" &&
          visible
            .filter((annotation) => annotation.id !== selectedId)
            .map((annotation) => (
              <button
                key={annotation.id}
                type="button"
                onClick={() => onSelect(annotation.id)}
                aria-label={`Select ${KIND_NAMES[annotation.kind].toLowerCase()}${annotation.kind === "text" ? ` “${annotation.text}”` : ""}`}
                className="absolute cursor-pointer rounded-sm outline-none hover:ring-2 hover:ring-white/80 focus-visible:ring-4 focus-visible:ring-sky-400"
                style={{
                  left: `${annotation.x * 100}%`,
                  top: `${annotation.y * 100}%`,
                  width: `${annotation.width * 100}%`,
                  height: `${annotation.height * 100}%`,
                }}
              />
            ))}
        {tool === "annotate" && selected && (
          <RectHandle
            rect={selected}
            containerRef={frameRef}
            label={KIND_NAMES[selected.kind]}
            onChange={(rect) => onAnnotationChange(selected.id, rect)}
            onCommit={onCommit}
            className="border-dashed"
          />
        )}

        {crop && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.width * 100}%`,
              height: `${crop.height * 100}%`,
              // Darkens everything outside the crop.
              boxShadow: "0 0 0 100vmax rgba(0, 0, 0, 0.62)",
            }}
          />
        )}
        {tool === "crop" && crop && (
          <RectHandle
            rect={crop}
            containerRef={frameRef}
            label="Crop frame"
            aspect={cropAspect ? cropAspect / frameAspect : undefined}
            minSize={0.1}
            onChange={onCropChange}
            onCommit={onCommit}
          />
        )}
      </div>
    </div>
  );
}
