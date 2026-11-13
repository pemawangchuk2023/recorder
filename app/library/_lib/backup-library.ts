import { toSrt } from "@/app/recorder/_lib/transcript";
import { getRecordingVideo } from "@/lib/library/library";
import { titleToFilename } from "@/lib/library/titles";
import type { LibraryFolder, LibraryRecording } from "@/lib/library/types";

// Browser storage can be wiped by "Clear site data" or a browser reset. A
// backup writes every recording as an ordinary file into a folder the user
// picks — on their own disk, with no upload involved.

export function canBackUpToFolder(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export interface BackupProgress {
  done: number;
  total: number;
  title: string;
}

export interface BackupResult {
  written: number;
  // Titles that couldn't be read from the library.
  skipped: string[];
  folderName: string;
}

// "Demo.mp4", then "Demo (2).mp4" for a second recording with the same title.
export function uniqueName(base: string, extension: string, taken: Set<string>): string {
  let name = `${base}.${extension}`;
  for (let copy = 2; taken.has(name.toLowerCase()); copy++) {
    name = `${base} (${copy}).${extension}`;
  }
  taken.add(name.toLowerCase());
  return name;
}

async function writeFile(directory: FileSystemDirectoryHandle, name: string, data: Blob | string): Promise<void> {
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

// Resolves to null if the folder picker was cancelled.
export async function backUpLibrary(
  recordings: LibraryRecording[],
  folders: LibraryFolder[],
  onProgress: (progress: BackupProgress) => void,
  signal: AbortSignal
): Promise<BackupResult | null> {
  let root: FileSystemDirectoryHandle;
  try {
    root = await window.showDirectoryPicker!({ id: "recorder-backup", mode: "readwrite", startIn: "videos" });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      return null;
    }
    throw cause;
  }

  const folderNames = new Map(folders.map((folder) => [folder.id, titleToFilename(folder.name, "x").slice(0, -2)]));
  const takenByDirectory = new Map<string, Set<string>>();
  const skipped: string[] = [];
  const index: unknown[] = [];
  let written = 0;

  for (const [position, recording] of recordings.entries()) {
    signal.throwIfAborted();
    onProgress({ done: position, total: recordings.length, title: recording.title });
    const video = await getRecordingVideo(recording.id).catch(() => null);
    if (!video) {
      skipped.push(recording.title);
      continue;
    }
    const folderName = recording.folderId ? (folderNames.get(recording.folderId) ?? "") : "";
    const directory = folderName ? await root.getDirectoryHandle(folderName, { create: true }) : root;
    const taken = takenByDirectory.get(folderName) ?? new Set<string>();
    takenByDirectory.set(folderName, taken);

    const base = titleToFilename(recording.title, "mp4").replace(/\.mp4$/, "");
    const videoName = uniqueName(base, "mp4", taken);
    await writeFile(directory, videoName, video);
    if (recording.transcript.length > 0) {
      await writeFile(directory, videoName.replace(/\.mp4$/, ".srt"), toSrt(recording.transcript));
    }
    index.push({
      file: folderName ? `${folderName}/${videoName}` : videoName,
      title: recording.title,
      recordedAt: new Date(recording.createdAt).toISOString(),
      durationSeconds: Math.round(recording.duration * 10) / 10,
      chapters: recording.chapters ?? [],
      summary: recording.summary ?? null,
      notes: (recording.comments ?? []).map((comment) => ({
        atSeconds: Math.round(comment.time * 10) / 10,
        text: comment.text,
      })),
    });
    written++;
  }
  await writeFile(root, "recordings.json", JSON.stringify(index, null, 2));
  onProgress({ done: recordings.length, total: recordings.length, title: "" });
  return { written, skipped, folderName: root.name };
}
