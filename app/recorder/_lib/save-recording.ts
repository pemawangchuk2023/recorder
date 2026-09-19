export type SaveResult = "saved" | "downloaded" | "cancelled";

export function recordingFilename(date: Date, extension: string): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `recording-${day}-${pad(date.getHours())}${pad(date.getMinutes())}.${extension}`;
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function saveRecording(blob: Blob, filename: string): Promise<SaveResult> {
  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "MP4 video", accept: { "video/mp4": [".mp4"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return "cancelled";
      }
      // Anything else (e.g. blocked in an embedded frame): fall back to a download.
    }
  }

  downloadFile(blob, filename);
  return "downloaded";
}

// Hands the file to the system share sheet (Mail, Messages, AirDrop, Nearby
// Share…) — it still never touches a server of ours.
export function canShareFile(file: File): boolean {
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
}

export async function shareFile(file: File): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title: file.name });
    return true;
  } catch {
    // Cancelled from the share sheet, or the target app refused the file.
    return false;
  }
}
