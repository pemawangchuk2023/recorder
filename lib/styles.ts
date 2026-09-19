// Shared class strings for the call-to-action buttons, so the same button
// looks the same wherever it appears.
const baseButton =
  "inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-base font-semibold transition-colors";

export const primaryButton = `${baseButton} bg-red-600 text-white shadow-sm hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600`;

export const secondaryButton = `${baseButton} text-zinc-900 ring-1 ring-zinc-300 hover:bg-zinc-100 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-900`;
