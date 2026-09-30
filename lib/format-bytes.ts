export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// "−64%" when the new file is smaller, "+12%" when it's bigger.
export function formatSizeChange(before: number, after: number): string {
  const change = Math.round(((after - before) / before) * 100);
  return change < 0 ? `−${-change}%` : `+${change}%`;
}

export function replaceExtension(filename: string, extension: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return `${base}.${extension}`;
}
