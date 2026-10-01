"use client";

import { Captions, Image as ImageIcon, Loader2 } from "lucide-react";
import { useState, type RefObject } from "react";
import { CompatibilityList } from "@/app/_components/youtube/compatibility-list";
import { CopyButton } from "@/app/_components/youtube/copy-button";
import { Field, Hint, Switch, control } from "@/app/recorder/_components/settings-controls";
import { toYouTubeChapters } from "@/app/recorder/_lib/chapters";
import { downloadFile } from "@/app/recorder/_lib/save-recording";
import { toSrt } from "@/app/recorder/_lib/transcript";
import type { Chapter, TranscriptSegment } from "@/app/recorder/_lib/types";
import { YOUTUBE_TITLE_MAX } from "@/constants/youtube";
import { checkYouTubeCompatibility } from "@/lib/youtube/compatibility";
import { buildDescription, isShortsVideo, parseTags, validateDetails } from "@/lib/youtube/metadata";
import { thumbnailFromVideo } from "@/lib/youtube/thumbnail";

interface YouTubeReadyPanelProps {
  video: Blob;
  title: string;
  // Filename without extension, for the thumbnail and captions.
  baseName: string;
  duration: number;
  codec: string | null;
  width: number | null;
  height: number | null;
  transcript: TranscriptSegment[];
  chapters: Chapter[];
  // For taking the thumbnail from the frame on screen.
  playbackRef: RefObject<HTMLVideoElement | null>;
}

const fileButton =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

// Everything YouTube Studio asks for, prepared here: a format check, the
// title, description (with chapters) and tags to paste, and the thumbnail
// and caption files to attach. Nothing is sent anywhere.
export function YouTubeReadyPanel({
  video,
  title: initialTitle,
  baseName,
  duration,
  codec,
  width,
  height,
  transcript,
  chapters,
  playbackRef,
}: YouTubeReadyPanelProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [addChapters, setAddChapters] = useState(true);
  const [thumbnailState, setThumbnailState] = useState<"idle" | "working" | "failed">("idle");

  const shorts = isShortsVideo(width, height, duration);
  const checks = checkYouTubeCompatibility({ codec, width, height, duration });
  const youtubeChapters = toYouTubeChapters(chapters, duration);
  const withShortsTag = shorts && !description.includes("#Shorts") ? `${description}\n\n#Shorts`.trim() : description;
  const fullDescription = buildDescription(withShortsTag, addChapters ? youtubeChapters.text : "");
  const tags = parseTags(tagsText);
  const problems = validateDetails(title, fullDescription, tags);

  const downloadThumbnail = async () => {
    setThumbnailState("working");
    const time = playbackRef.current?.currentTime ?? 0;
    const image = await thumbnailFromVideo(video, time).catch(() => null);
    if (image) {
      downloadFile(image, `${baseName} thumbnail.jpg`);
      setThumbnailState("idle");
    } else {
      setThumbnailState("failed");
    }
  };

  return (
    <section className="flex flex-col gap-5" aria-labelledby="youtube-heading">
      <div className="flex flex-col gap-1">
        <h3 id="youtube-heading" className="text-lg font-semibold">
          Ready for YouTube
        </h3>
        <p className="text-sm text-muted-foreground">
          A check against YouTube&apos;s formats, plus everything to paste and attach in YouTube Studio.
        </p>
      </div>

      <CompatibilityList checks={checks} />

      <div className="flex flex-col gap-4">
        <Field label={`Title · ${title.length}/${YOUTUBE_TITLE_MAX}`}>
          <div className="flex gap-2">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={control} />
            <CopyButton text={title.trim()} label="Copy" />
          </div>
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="What's this video about?"
            className={`${control} resize-y`}
          />
        </Field>
        {youtubeChapters.text && (
          <Switch
            label="Add chapters to the description"
            description={youtubeChapters.problem ?? "Viewers can jump to each part from the timeline."}
            checked={addChapters}
            onChange={setAddChapters}
          />
        )}
        {fullDescription && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground/80">Description as it will appear</span>
            <pre className="max-h-48 overflow-y-auto rounded-xl bg-muted px-3 py-2 font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {fullDescription}
            </pre>
            <CopyButton text={fullDescription} label="Copy description" />
          </div>
        )}

        <Field label="Tags (separated by commas)">
          <div className="flex gap-2">
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="tutorial, product demo"
              className={control}
            />
            <CopyButton text={tags.join(", ")} label="Copy" />
          </div>
        </Field>

        {problems.map((problem) => (
          <Hint key={problem} tone="warning">
            {problem}
          </Hint>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground/80">Files for YouTube Studio</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadThumbnail()}
            disabled={thumbnailState === "working"}
            className={fileButton}
          >
            {thumbnailState === "working" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImageIcon className="size-4" aria-hidden="true" />
            )}
            Thumbnail from current frame
          </button>
          {transcript.length > 0 && (
            <button
              type="button"
              onClick={() =>
                downloadFile(new Blob([toSrt(transcript)], { type: "application/x-subrip" }), `${baseName}.srt`)
              }
              className={fileButton}
            >
              <Captions className="size-4" aria-hidden="true" />
              Captions (.srt)
            </button>
          )}
        </div>
        {thumbnailState === "failed" ? (
          <Hint tone="warning">That frame couldn&apos;t be saved. Try another spot in the video.</Hint>
        ) : (
          <Hint>
            Pause on the frame you want first. It&apos;s saved at YouTube&apos;s recommended 1280 px, as a JPEG
            under its 2 MB limit.
          </Hint>
        )}
      </div>
    </section>
  );
}
