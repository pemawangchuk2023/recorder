import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCountdownResult {
  value: number | null;
  isRunning: boolean;
  // A countdown of 0 seconds completes right away.
  start: (seconds: number, onComplete: () => void) => void;
  cancel: () => void;
  // Ends a running countdown early and starts right away.
  skip: () => void;
}

export function useCountdown(): UseCountdownResult {
  const [value, setValue] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    onCompleteRef.current = null;
    setIsRunning(false);
    setValue(null);
  }, [clearTimer]);

  const finish = useCallback(() => {
    const onComplete = onCompleteRef.current;
    cancel();
    onComplete?.();
  }, [cancel]);

  const start = useCallback(
    (seconds: number, onComplete: () => void) => {
      clearTimer();
      if (seconds <= 0) {
        onComplete();
        return;
      }
      onCompleteRef.current = onComplete;
      setIsRunning(true);
      let remaining = seconds;
      setValue(remaining);
      intervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          finish();
          return;
        }
        setValue(remaining);
      }, 1000);
    },
    [clearTimer, finish]
  );

  useEffect(() => clearTimer, [clearTimer]);

  const skip = useCallback(() => {
    if (onCompleteRef.current) {
      finish();
    }
  }, [finish]);

  return { value, isRunning, start, cancel, skip };
}
