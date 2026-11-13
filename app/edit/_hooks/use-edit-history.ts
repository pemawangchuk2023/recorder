import { useCallback, useEffect, useState } from "react";
import { EMPTY_PLAN, isPlanEmpty, type EditPlan } from "@/app/edit/_lib/edit-plan";

const MAX_STEPS = 100;

interface History {
  past: EditPlan[];
  present: EditPlan;
  future: EditPlan[];
  // Set while one gesture (a drag, typing in a field) makes many small
  // changes, so the whole gesture is undone in one step.
  mergeKey: string | null;
}

export interface EditHistory {
  plan: EditPlan;
  // Changes sharing a mergeKey, made one after another, count as one step.
  update: (next: EditPlan, mergeKey?: string) => void;
  // Ends the current gesture: the next change starts a new step.
  endMerge: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function isPlan(value: unknown): value is EditPlan {
  const plan = value as Partial<EditPlan> | null;
  return (
    typeof plan === "object" &&
    plan !== null &&
    Array.isArray(plan.cuts) &&
    Array.isArray(plan.annotations) &&
    typeof plan.speed === "number" &&
    plan.speed > 0 &&
    (plan.crop === null || typeof plan.crop === "object")
  );
}

function readStored(storageKey: string): EditPlan {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    return isPlan(stored) ? stored : EMPTY_PLAN;
  } catch {
    return EMPTY_PLAN;
  }
}

// The edit plan with undo and redo. Unsaved edits are remembered in this
// browser under `storageKey`, so closing the tab doesn't throw them away.
export function useEditHistory(storageKey: string): EditHistory {
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    present: readStored(storageKey),
    future: [],
    mergeKey: null,
  }));

  useEffect(() => {
    try {
      if (isPlanEmpty(history.present)) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(history.present));
      }
    } catch {
      // Storage is full or blocked: the edit just isn't remembered.
    }
  }, [history.present, storageKey]);

  const update = useCallback((next: EditPlan, mergeKey?: string) => {
    setHistory((previous) => {
      if (mergeKey && mergeKey === previous.mergeKey) {
        return { ...previous, present: next };
      }
      return {
        past: [...previous.past, previous.present].slice(-MAX_STEPS),
        present: next,
        future: [],
        mergeKey: mergeKey ?? null,
      };
    });
  }, []);

  const endMerge = useCallback(() => {
    setHistory((previous) => (previous.mergeKey === null ? previous : { ...previous, mergeKey: null }));
  }, []);

  const undo = useCallback(() => {
    setHistory((previous) => {
      const last = previous.past[previous.past.length - 1];
      return last
        ? { past: previous.past.slice(0, -1), present: last, future: [previous.present, ...previous.future], mergeKey: null }
        : previous;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((previous) => {
      const [next, ...rest] = previous.future;
      return next
        ? { past: [...previous.past, previous.present], present: next, future: rest, mergeKey: null }
        : previous;
    });
  }, []);

  const reset = useCallback(() => update(EMPTY_PLAN), [update]);

  return {
    plan: history.present,
    update,
    endMerge,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
