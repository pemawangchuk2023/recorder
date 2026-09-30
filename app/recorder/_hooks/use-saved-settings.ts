import { useCallback, useSyncExternalStore } from "react";
import {
  parseSettings,
  readStoredSettings,
  storeSettings,
} from "@/app/recorder/_lib/settings-storage";
import type { RecorderSettings } from "@/app/recorder/_lib/types";
import { DEFAULT_SETTINGS } from "@/constants/recorder";

type Update = RecorderSettings | ((previous: RecorderSettings) => RecorderSettings);

// Settings are held here rather than in component state so they can be read
// from localStorage without a hydration mismatch: the server renders the
// defaults, and React switches to the saved settings right after.
const listeners = new Set<() => void>();
let current: RecorderSettings | null = null;

function getSnapshot(): RecorderSettings {
  current ??= parseSettings(readStoredSettings());
  return current;
}

const getServerSnapshot = () => DEFAULT_SETTINGS;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSavedSettings(): [RecorderSettings, (update: Update) => void] {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setSettings = useCallback((update: Update) => {
    const next = typeof update === "function" ? update(getSnapshot()) : update;
    current = next;
    storeSettings(next);
    listeners.forEach((listener) => listener());
  }, []);
  return [settings, setSettings];
}
