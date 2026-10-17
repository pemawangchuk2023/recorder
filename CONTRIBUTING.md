# Contributing

Thanks for your interest in improving Screen Recorder! Bug reports, ideas,
documentation and code are all welcome.

## Before you start

- **Found a bug?** Search the [issues](https://github.com/pemawangchuk2023/recorder/issues)
  first, then open a bug report with your browser, operating system and steps
  to reproduce.
- **Have an idea?** Open a feature request before writing a large change, so
  we can agree on the approach.
- **Security problem?** Don't open a public issue. Follow [SECURITY.md](SECURITY.md).

## Development setup

1. Install Node.js 22.18 or newer (24 is recommended; `nvm use` reads `.nvmrc`).
2. Fork the repository and clone your fork.
3. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:3000 in an up-to-date Chrome or Edge.

> **Note:** This project uses Next.js 16, which has breaking changes from
> earlier versions. Check the docs in `node_modules/next/dist/docs/` rather
> than relying on older Next.js knowledge.

## Making a change

1. Create a branch from `main`, for example `git checkout -b fix/camera-retry`.
2. Keep each pull request focused on one fix or feature.
3. Match the surrounding code: TypeScript, React function components, Tailwind
   classes, and short comments that explain *why*.
4. Add or update tests in `tests/` for logic in the `_lib` folders.
5. Run the checks:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

6. Test in a real browser, especially for capture, audio and encoding changes,
   and say which browsers and operating systems you tried.
7. Open a pull request and fill in the template. Add screenshots for UI changes.

## Project principles

- **Private by design.** Recordings never leave the user's computer. Don't add
  analytics, tracking or uploads.
- **No backend.** Everything runs in the browser.
- **Helpful messages.** When a device or permission fails, tell the user what
  happened and how to fix it.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
