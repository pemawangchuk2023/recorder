// A recording that was interrupted (a crash, a closed tab, a full disk) ends
// in the middle of a fragment. Everything up to the last complete fragment is
// still a valid video, so that's where the file is cut.
//
// A fragmented MP4 is a row of boxes: ftyp, moov, then moof + mdat pairs.
// Each box starts with its size (4 bytes) and its type (4 letters).

const HEADER_BYTES = 16;

interface BoxHeader {
  type: string;
  // Bytes, header included; null means "runs to the end of the file".
  size: number | null;
}

function readHeader(bytes: Uint8Array): BoxHeader | null {
  if (bytes.byteLength < 8) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size32 = view.getUint32(0);
  const type = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  if (size32 === 0) {
    return { type, size: null };
  }
  if (size32 === 1) {
    if (bytes.byteLength < HEADER_BYTES) {
      return null;
    }
    const size = Number(view.getBigUint64(8));
    return size >= HEADER_BYTES ? { type, size } : null;
  }
  return size32 >= 8 ? { type, size: size32 } : null;
}

// How many bytes from the start of the file form a playable video: 0 when
// not even the header was written.
export async function completePrefixLength(file: Blob): Promise<number> {
  let offset = 0;
  let usable = 0;
  let hasHeader = false;
  let openFragment = false;

  while (offset < file.size) {
    const header = readHeader(
      new Uint8Array(await file.slice(offset, offset + HEADER_BYTES).arrayBuffer())
    );
    if (!header) {
      break;
    }
    const end = header.size === null ? file.size : offset + header.size;
    if (end > file.size) {
      break;
    }
    if (header.type === "moov") {
      hasHeader = true;
      usable = end;
    } else if (header.type === "moof") {
      openFragment = true;
    } else if (header.type === "mdat" && hasHeader) {
      // A fragment only counts once its media data is complete too.
      usable = end;
      openFragment = false;
    } else if (hasHeader && !openFragment) {
      usable = end;
    }
    offset = end;
  }
  return hasHeader ? usable : 0;
}
