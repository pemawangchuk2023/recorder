# Screen Recorder

A private, Loom-style screen recorder and file converter that runs entirely in
the browser. There is no backend: recording, encoding, captions, the library
and conversion all happen on the visitor's own computer.

## Features

- **Recording modes** — Screen + camera, screen only, or camera only.
- **Sharp output** — WebCodecs H.264/HEVC MP4 at 720p, 1080p, 1440p or 4K,
  30 or 60 fps, with Standard / High / Max detail.
- **Camera bubble** — circle or rounded square, three sizes, any corner,
  mirror option, live preview, and a floating always-on-top bubble.
- **Audio** — microphone (voice or original sound) and computer sound, at
  separate volumes, with a live level meter.
- **Live captions** — on-device English transcription, burned in or kept as
  a searchable transcript and `.srt`.
- **Flow** — 0/3/5/10 s countdown (skippable), pause/resume, restart, discard,
  keyboard shortcuts; settings are remembered.
- **Review** — rename, trim, playback speed, save a frame as PNG, export to
  MP3, GIF, WebM and more.
- **Library** (`/library`) — every take is saved automatically to IndexedDB
  in this browser. Search titles and transcripts, sort, watch, rename,
  download or delete; storage usage and persistent-storage request included.
- **Converter** (`/convert`) — batch-convert video and audio between formats.

## Code layout

- `app/recorder/` — recorder UI (`_components`), React state (`_hooks`) and
  capture/encoding logic (`_lib`).
- `app/library/` — the library page.
- `lib/library/` — IndexedDB storage and the library API shared by both pages.
- `constants/` — copy, option lists and defaults.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

Screen recording needs an up-to-date Chrome or Edge on a computer.

