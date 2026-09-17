export type SaveResult = "saved" | "downloaded" | "cancelled";

function defaultFilename(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `recording-${day}-${pad(date.getHours())}${pad(date.getMinutes())}.mp4`;
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function saveRecording(blob: Blob): Promise<SaveResult> {
  const filename = defaultFilename(new Date());

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

  download(blob, filename);
  return "downloaded";
}
