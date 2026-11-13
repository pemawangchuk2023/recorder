# Screen Recorder

A private, Loom-style screen recorder and file converter that runs entirely in
your browser. There is no backend and no account: recording, encoding,
captions, the library and conversion all happen on your own computer, and
nothing is uploaded.

[![CI](https://github.com/pemawangchuk2023/recorder/actions/workflows/ci.yml/badge.svg)](https://github.com/pemawangchuk2023/recorder/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<!-- Add a screenshot or short GIF of the recorder here, for example:
![The recorder](docs/screenshot.png) -->

## Features

- **Recording modes**: screen + camera, screen only, or camera only.
- **Sharp output**: WebCodecs H.264/HEVC MP4 at 720p, 1080p, 1440p or 4K,
  30 or 60 fps, with Standard / High / Max detail.
- **Camera bubble**: circle or rounded square, movable and resizable, mirror
  option, camera framing, and a floating always-on-top bubble.
- **Stacked 9:16 layout**: screen on top and camera below, for TikTok,
  Shorts and Reels.
- **Audio**: microphone (voice or original sound) and computer sound, at
  separate volumes, with a live level meter.
- **Live captions**: on-device English transcription, burned in or kept as a
  searchable transcript and `.srt`.
- **Flow**: 0/3/5/10 s countdown (skippable), pause/resume, restart, discard,
  keyboard shortcuts and chapter markers. Settings are remembered.
- **Crash protection**: each take is written to a private file on your device
  while it records. If the tab crashes or is closed, the recorder offers the
  take back next time (minus up to the last 10 seconds). Closing the tab
  mid-recording asks first, links open in a new tab, and a take stops by
  itself before browser storage runs out.
- **Setup check**: one panel shows what this browser can do and how to fix
  blocked camera, microphone or screen permissions.
- **Review**: rename, trim, playback speed, save a frame as PNG, and export to
  MP3, GIF, WebM and more, with a "Ready for YouTube" panel.
- **Editor** (`/edit`): cut any part out (start, end or middle), remove pauses
  in one click, cut a sentence by cutting it from the transcript, crop
  (free, 16:9, 9:16, 1:1, 4:5), change speed from 0.5× to 3× with natural
  pitch, and add text, arrows, boxes or blur boxes for anything private. Undo
  and redo; unsaved edits are remembered. Saving makes a new recording and
  never changes the original.
- **Library** (`/library`): every take is saved automatically to IndexedDB in
  your browser. Folders, search across titles and transcripts, sort, rename,
  multi-select to move or delete, add MP4 files from disk, see what uses the
  most space, and back the whole library up to a folder on your computer.
- **Speaker notes**: type a script, open it in its own window with big text
  and a self-moving scroll, and read from it while you record.
- **Notes and reactions**: pin a note or an emoji to any moment of a
  recording; click one to jump there. They stay on your device.
- **Custom thumbnails**: pause on a frame and make it the recording's cover.
- **On-device summary and title**: written from the transcript by Chrome's
  built-in language model, where the browser and computer support it. Nothing
  is sent anywhere.
- **Document scanner** (`/scan`): photograph paper pages with the camera, or
  pick photos. Each page's edges are found, the page is straightened and
  cleaned up (enhance, black & white, grey or original), and the pages are
  joined into one PDF (A4, US Letter or the scan's own shape). Reorder,
  rotate and re-adjust pages any time. Share the PDF through the device's
  share sheet (email, WhatsApp and so on) or download it. Documents are kept
  in this browser, like recordings. It does not read the text (no OCR) and
  does not open existing PDF or Word files.
- **Converter** (`/convert`): batch-convert video and audio between formats.
- **Light and dark themes.**

## Browser support

Screen Recorder uses modern browser APIs (WebCodecs, screen capture, Document
Picture-in-Picture and on-device speech recognition). For the full experience,
use an **up-to-date Chrome or Edge on a computer**. Phones can record the
camera, and other browsers may support only some features.

Screen and camera capture need a secure origin: HTTPS, or `localhost` during
development.

### What browsers don't allow

These are limits of the web platform, not settings:

- **Computer sound** comes from a shared Chrome/Edge tab (and from the whole
  screen on Windows and ChromeOS). A single window never carries sound, and
  Firefox and Safari can't capture it at all. The microphone always works.
- **Keyboard shortcuts** only reach the recorder while its tab is in front.
  From another app, use the floating camera bubble's buttons or the browser's
  "Stop sharing" bar.
- **Storage** is a share of your disk that the browser decides (shown in the
  library). Clearing site data deletes the library, so use
  *Manage storage → Back up to a folder* for anything you need to keep.
- **Crash protection, folder backup and the floating bubble** need Chrome or
  Edge. Elsewhere a take is held in memory until you press Stop.
- **Captions** are transcribed live on your device, so a recording made
  without them can't get a transcript afterwards.
- **Very long takes** (over about 1 GB) are saved as a fragmented MP4, which
  plays in browsers, VLC and YouTube; the Converter can rewrite it as a
  regular MP4. Edited videos are built in memory, so the editor suits
  recordings of minutes to an hour or so rather than many hours.

## Privacy

- Recordings are encoded in the browser and stored in IndexedDB on your device.
- There are no analytics, no tracking and no server-side code.
- The only download is the optional on-device caption model, which the
  browser itself installs when you turn captions on.

## Getting started

You need [Node.js](https://nodejs.org/) 22.18 or newer (24 is recommended; see
`.nvmrc`).

```bash
git clone https://github.com/pemawangchuk2023/recorder.git
cd recorder
npm install
npm run dev        # http://localhost:3000
```

### Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the development server          |
| `npm run build`     | Create a production build             |
| `npm start`         | Serve the production build            |
| `npm run lint`      | Run ESLint                            |
| `npm run typecheck` | Type-check with TypeScript            |
| `npm test`          | Run the unit tests (Node test runner) |

### Deploying

This is a standard [Next.js](https://nextjs.org/) app with no environment
variables and no backend, so it runs on any host that supports Next.js, such
as Vercel or Netlify, or on your own server with `npm run build && npm start`.

## Project structure

```
app/
  recorder/     Recorder UI (_components), React state (_hooks), capture and encoding (_lib)
  library/      The library page
  edit/         The editor: edit plan, renderer, timeline and tools
  scan/         The document scanner: edge finding, straightening, PDF writer
  convert/      The converter page
  _components/  Site header, footer and home page sections
components/     Shared UI (shadcn/ui) and theme components
lib/            IndexedDB library storage, crash-safe take files, shared helpers
constants/      Copy, option lists and defaults
tests/          Unit tests
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and
the [Code of Conduct](CODE_OF_CONDUCT.md) first. To report a security problem,
see [SECURITY.md](SECURITY.md).

## Built with

[Next.js](https://nextjs.org/) · [React](https://react.dev/) ·
[Tailwind CSS](https://tailwindcss.com/) · [shadcn/ui](https://ui.shadcn.com/) ·
[Mediabunny](https://mediabunny.dev/) · [gifenc](https://github.com/mattdesl/gifenc) ·
[Lucide](https://lucide.dev/)

## License

[MIT](LICENSE) © 2026 Pema Wangchuk. You are free to use, change and share
this project, including for commercial use.
