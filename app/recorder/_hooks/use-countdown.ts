import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCountdownResult {
  value: number | null;
  isRunning: boolean;
  start: (onComplete: () => void) => void;
  cancel: () => void;
}

export function useCountdown(seconds: number): UseCountdownResult {
  const [value, setValue] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setValue(null);
  }, [clearTimer]);

  const start = useCallback(
    (onComplete: () => void) => {
      clearTimer();
      setIsRunning(true);
      let remaining = seconds;
      setValue(remaining);
      intervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearTimer();
          setIsRunning(false);
          setValue(null);
          onComplete();
          return;
        }
        setValue(remaining);
      }, 1000);
    },
    [clearTimer, seconds]
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { value, isRunning, start, cancel };
}
