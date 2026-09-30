import { saveRecording, type SaveResult } from "@/app/recorder/_lib/save-recording";
import { getRecordingVideo } from "@/lib/library/library";
import { titleToFilename } from "@/lib/library/titles";
import type { LibraryRecording } from "@/lib/library/types";

// Saves a library recording to disk, named after its title.
export async function downloadRecording(recording: LibraryRecording): Promise<SaveResult | null> {
  const video = await getRecordingVideo(recording.id);
  if (!video) {
    return null;
  }
  return saveRecording(video, titleToFilename(recording.title, "mp4"));
}
