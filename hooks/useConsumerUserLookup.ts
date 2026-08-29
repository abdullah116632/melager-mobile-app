import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/redux/hooks";
import { isValidEmail } from "@/utils/email";

export type ConsumerUserLookupStatus =
  "idle" | "loading" | "found" | "not-found" | "error";

interface ConsumerUserLookupState {
  status: ConsumerUserLookupStatus;
  name: string | null;
}

const IDLE_STATE: ConsumerUserLookupState = { status: "idle", name: null };

export const useConsumerUserLookup = (email: string, enabled: boolean) => {
  const { token, activeMess } = useAuth();
  const [state, setState] = useState<ConsumerUserLookupState>(IDLE_STATE);
  const normalizedEmail = email.trim().toLowerCase();
  const messId = activeMess?.id;

  useEffect(() => {
    if (!enabled || !token || !messId || !isValidEmail(normalizedEmail)) {
      setState(IDLE_STATE);
      return;
    }

    let cancelled = false;
    setState({ status: "loading", name: null });

    const timer = setTimeout(() => {
      void api
        .lookupConsumerUser(normalizedEmail, token, messId)
        .then((result) => {
          if (cancelled) return;
          if (result.exists && result.name) {
            setState({ status: "found", name: result.name });
            return;
          }
          setState({ status: "not-found", name: null });
        })
        .catch(() => {
          if (!cancelled) setState({ status: "error", name: null });
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, messId, normalizedEmail, token]);

  return state;
};
