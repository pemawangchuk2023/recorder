import { addRecording, isQuotaError } from "@/lib/library/library";

export interface ImportResult {
  added: number;
  // File names that weren't MP4 video the browser can read.
  rejected: string[];
  // True when storage ran out part-way.
  full: boolean;
}

// MP4 and MOV files announce themselves with "ftyp" right after the first
// four bytes. The library names and plays everything as MP4, so other
// containers are turned away (the Converter can make an MP4 of them).
async function isMp4(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(4, 8).arrayBuffer());
  return String.fromCharCode(...head) === "ftyp";
}

// Adds MP4 files from disk to the library — a backup being restored, or any
// video to trim, crop or annotate in the editor. The files are copied into
// this browser's storage; nothing is uploaded.
export async function importVideos(files: File[], folderId: string | null): Promise<ImportResult> {
  const result: ImportResult = { added: 0, rejected: [], full: false };
  for (const file of files) {
    const title = file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Imported video";
    try {
      if (!(await isMp4(file))) {
        result.rejected.push(file.name);
        continue;
      }
      const video = file.type === "video/mp4" ? file : file.slice(0, file.size, "video/mp4");
      await addRecording({ title, video, transcript: [], chapters: [], folderId });
      result.added++;
    } catch (cause) {
      if (isQuotaError(cause)) {
        result.full = true;
        break;
      }
      result.rejected.push(file.name);
    }
  }
  return result;
}
