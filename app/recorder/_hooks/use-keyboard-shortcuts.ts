import { useEffect } from "react";

interface UseKeyboardShortcutsOptions {
  enabled: boolean;
  onToggleRecording: () => void;
  onTogglePause: () => void;
}

export function useKeyboardShortcuts({
  enabled,
  onToggleRecording,
  onTogglePause,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        onToggleRecording();
      } else if (key === "p") {
        event.preventDefault();
        onTogglePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onToggleRecording, onTogglePause]);
}
