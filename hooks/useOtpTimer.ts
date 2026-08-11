import { useCallback, useEffect, useRef, useState } from "react";

export const useOtpTimer = (durationSeconds = 60) => {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    setSecondsRemaining(0);
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    setSecondsRemaining(durationSeconds);
    timerRef.current = setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          clearTimer();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, [clearTimer, durationSeconds]);

  useEffect(() => clearTimer, [clearTimer]);

  return { secondsRemaining, startTimer, resetTimer };
};
