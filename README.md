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
- **Review**: rename, trim, playback speed, save a frame as PNG, and export to
  MP3, GIF, WebM and more, with a "Ready for YouTube" panel.
- **Library** (`/library`): every take is saved automatically to IndexedDB in
  your browser. Search titles and transcripts, sort, watch, rename, download
  or delete.
- **Converter** (`/convert`): batch-convert video and audio between formats.
- **Light and dark themes.**

## Browser support

Screen Recorder uses modern browser APIs (WebCodecs, screen capture, Document
Picture-in-Picture and on-device speech recognition). For the full experience,
use an **up-to-date Chrome or Edge on a computer**. Phones can record the
camera, and other browsers may support only some features.

Screen and camera capture need a secure origin: HTTPS, or `localhost` during
development.

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
  convert/      The converter page
  _components/  Site header, footer and home page sections
components/     Shared UI (shadcn/ui) and theme components
lib/            IndexedDB library storage and shared helpers
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
