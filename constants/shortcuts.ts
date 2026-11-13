import type { ShortcutGroup } from "@/components/shortcuts-help";

export const RECORDER_SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Recording",
    shortcuts: [
      { keys: ["Ctrl", "Shift", "R"], action: "Start or stop recording" },
      { keys: ["Ctrl", "Shift", "P"], action: "Pause or resume" },
      { keys: ["Ctrl", "Shift", "M"], action: "Add a chapter marker" },
    ],
  },
  {
    title: "Anywhere",
    shortcuts: [{ keys: ["?"], action: "Show this list" }],
  },
];

// Web pages only receive keys while they're in front; the browser offers no
// way round that.
export const RECORDER_SHORTCUTS_NOTE =
  "Browsers only send keys to the page in front, so these work while the recorder tab is focused. When you're in another app, use the floating camera bubble's pause and stop buttons, or the browser's own “Stop sharing” bar.";

export const EDITOR_SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Playback",
    shortcuts: [
      { keys: ["Space"], action: "Play or pause" },
      { keys: ["←"], action: "Back 1 second (Shift: 5 seconds)" },
      { keys: ["→"], action: "Forward 1 second (Shift: 5 seconds)" },
      { keys: [","], action: "Back one frame" },
      { keys: ["."], action: "Forward one frame" },
    ],
  },
  {
    title: "Cutting",
    shortcuts: [
      { keys: ["I"], action: "Start the selection at the playhead" },
      { keys: ["O"], action: "End the selection at the playhead" },
      { keys: ["X"], action: "Cut the selection out" },
      { keys: ["Esc"], action: "Clear the selection" },
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      { keys: ["Ctrl", "Z"], action: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], action: "Redo" },
      { keys: ["Delete"], action: "Remove the selected annotation" },
      { keys: ["?"], action: "Show this list" },
    ],
  },
];
