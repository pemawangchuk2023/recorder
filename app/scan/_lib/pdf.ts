// Writes a PDF with one scanned page per sheet. A PDF can hold JPEG pictures
// exactly as they are, so this needs no library: it lays out the file's
// structure and drops each page's JPEG in unchanged.

export type PageSize = "a4" | "letter" | "fit";

export const PAGE_SIZES: { value: PageSize; label: string }[] = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "US Letter" },
  { value: "fit", label: "Same shape as each scan" },
];

export interface PdfPage {
  jpeg: Uint8Array;
  // Size of the picture in pixels.
  width: number;
  height: number;
}

// Sheet sizes in points (1/72 inch), portrait.
const SHEETS: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

const encoder = new TextEncoder();

function number(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

// Any text, in the form PDF readers accept for every language.
function textString(text: string): string {
  let hex = "FEFF";
  for (let index = 0; index < text.length; index++) {
    hex += text.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase();
  }
  return `<${hex}>`;
}

function dateString(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `(D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z)`;
}

// How a JPEG stores colour: 1 value per pixel is grey, 3 is colour, 4 is
// print (CMYK). Read from the file's own header, so the PDF never
// mislabels a picture.
export function jpegColorSpace(jpeg: Uint8Array): "DeviceGray" | "DeviceRGB" | "DeviceCMYK" {
  let offset = 2;
  while (offset + 9 < jpeg.length && jpeg[offset] === 0xff) {
    const marker = jpeg[offset + 1];
    const size = (jpeg[offset + 2] << 8) | jpeg[offset + 3];
    // The "start of frame" block holds the picture's size and channel count.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const channels = jpeg[offset + 9];
      return channels === 1 ? "DeviceGray" : channels === 4 ? "DeviceCMYK" : "DeviceRGB";
    }
    offset += 2 + size;
  }
  return "DeviceRGB";
}

// The sheet for a picture, and where the picture sits on it: as large as
// fits, centred, turned to landscape for wide pages.
export function layoutPage(
  width: number,
  height: number,
  size: PageSize
): { sheetWidth: number; sheetHeight: number; x: number; y: number; drawWidth: number; drawHeight: number } {
  if (size === "fit") {
    const sheetWidth = SHEETS.a4[0];
    const sheetHeight = (sheetWidth * height) / width;
    return { sheetWidth, sheetHeight, x: 0, y: 0, drawWidth: sheetWidth, drawHeight: sheetHeight };
  }
  const [short, long] = SHEETS[size];
  const landscape = width > height;
  const sheetWidth = landscape ? long : short;
  const sheetHeight = landscape ? short : long;
  const scale = Math.min(sheetWidth / width, sheetHeight / height);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  return { sheetWidth, sheetHeight, x: (sheetWidth - drawWidth) / 2, y: (sheetHeight - drawHeight) / 2, drawWidth, drawHeight };
}

export function buildPdf(pages: PdfPage[], options: { title: string; size: PageSize; date?: Date }): Uint8Array {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const write = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const beginObject = (id: number) => {
    offsets[id] = length;
    write(`${id} 0 obj\n`);
  };

  // The second line marks the file as holding binary data.
  write("%PDF-1.4\n");
  write(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  // Object 1 is the catalogue, 2 the list of pages; then three per page
  // (the sheet, what's drawn on it, and the picture); last, the details.
  const pageId = (index: number) => 3 + index * 3;
  const infoId = 3 + pages.length * 3;

  beginObject(1);
  write("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  beginObject(2);
  write(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${pageId(index)} 0 R`).join(" ")}] >>\nendobj\n`);

  pages.forEach((page, index) => {
    const id = pageId(index);
    const layout = layoutPage(page.width, page.height, options.size);
    beginObject(id);
    write(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(layout.sheetWidth)} ${number(layout.sheetHeight)}] ` +
        `/Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>\nendobj\n`
    );
    const drawing = `q ${number(layout.drawWidth)} 0 0 ${number(layout.drawHeight)} ${number(layout.x)} ${number(layout.y)} cm /Im0 Do Q`;
    beginObject(id + 1);
    write(`<< /Length ${drawing.length} >>\nstream\n${drawing}\nendstream\nendobj\n`);
    beginObject(id + 2);
    write(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /${jpegColorSpace(page.jpeg)} ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`
    );
    write(page.jpeg);
    write("\nendstream\nendobj\n");
  });

  beginObject(infoId);
  write(
    `<< /Title ${textString(options.title)} /Producer ${textString("Screen Recorder document scanner")} ` +
      `/CreationDate ${dateString(options.date ?? new Date())} >>\nendobj\n`
  );

  // The index at the end: where each object starts, so readers can jump to it.
  const indexStart = length;
  write(`xref\n0 ${infoId + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= infoId; id++) {
    write(`${offsets[id].toString().padStart(10, "0")} 00000 n \n`);
  }
  write(`trailer\n<< /Size ${infoId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${indexStart}\n%%EOF\n`);

  const file = new Uint8Array(length);
  let position = 0;
  for (const part of parts) {
    file.set(part, position);
    position += part.length;
  }
  return file;
}
