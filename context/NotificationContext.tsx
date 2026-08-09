import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export type AppNotification = {
  id: string;
  type: 'member_request' | 'meal_opt_out';
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  route: '/member-requests' | '/meal-status';
};

interface NotificationContextValue {
  pendingRequestCount: number;
  notifications: AppNotification[];
  unreadCount: number;
  refreshCount: () => Promise<void>;
  markAllRead: () => void;
  markRead: (id: string) => void;
  panelVisible: boolean;
  openPanel: () => void;
  closePanel: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  pendingRequestCount: 0,
  notifications: [],
  unreadCount: 0,
  refreshCount: async () => {},
  markAllRead: () => {},
  markRead: () => {},
  panelVisible: false,
  openPanel: () => {},
  closePanel: () => {},
});

let _counter = 0;
function genId() {
  return `n_${++_counter}_${Date.now()}`;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token, role, activeMess } = useAuth();
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [panelVisible, setPanelVisible] = useState(false);

  const seenRequestIds = useRef(new Set<number>());
  const seenOptOuts = useRef(new Set<string>());
  const isFirstPoll = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adminScopeKey = token && role === 'admin' && activeMess
    ? `${token}:${activeMess.id}`
    : null;
  const currentAdminScope = useRef<string | null>(adminScopeKey);
  const initializedAdminScope = useRef<string | null>(null);
  currentAdminScope.current = adminScopeKey;

  const pushNotifs = useCallback((items: AppNotification[]) => {
    if (items.length === 0) return;
    setNotifications((prev) => [...items, ...prev].slice(0, 100));
  }, []);

  const refreshCount = useCallback(async () => {
    const requestScope = adminScopeKey;
    if (!requestScope || !token || role !== 'admin' || !activeMess) {
      setPendingRequestCount(0);
      return;
    }

    const newItems: AppNotification[] = [];
    // Start both independent requests together. A remote database round trip
    // should only be paid once per polling cycle, not twice in sequence.
    const memberRequestsRequest = api
      .getMemberRequests(token, activeMess.id)
      .catch(() => null);
    const mealOptOutsRequest = api
      .getMealOptOuts(activeMess.id, undefined, token)
      .catch(() => null);

    // ── Member requests ──────────────────────────────────────────────
    try {
      const memberResult = await memberRequestsRequest;
      if (!memberResult) throw new Error('Could not load member requests');
      if (currentAdminScope.current !== requestScope) return;
      const { requests } = memberResult;
      setPendingRequestCount(requests.length);

      if (!isFirstPoll.current) {
        for (const r of requests) {
          if (!seenRequestIds.current.has(r.id)) {
            newItems.push({
              id: genId(),
              type: 'member_request',
              title: 'New Join Request',
              body: `${r.name} wants to join your mess`,
              timestamp: Date.now(),
              read: false,
              route: '/member-requests',
            });
          }
        }
      }
      seenRequestIds.current = new Set(requests.map((r) => r.id));
    } catch {}

    // ── Meal opt-outs (today) ─────────────────────────────────────────
    try {
      const mealResult = await mealOptOutsRequest;
      if (!mealResult) throw new Error('Could not load meal opt-outs');
      if (currentAdminScope.current !== requestScope) return;
      const { consumers } = mealResult;
      const MEALS = ['breakfast', 'lunch', 'dinner'] as const;
      const currentOptOuts = new Set<string>();
      const nameMap = new Map<number, string>();

      for (const c of consumers) {
        nameMap.set(c.consumerId, c.consumerName);
        for (const meal of MEALS) {
          if (c[meal]) currentOptOuts.add(`${c.consumerId}:${meal}`);
        }
      }

      if (!isFirstPoll.current) {
        // New opt-outs (turned meal OFF)
        for (const key of currentOptOuts) {
          if (!seenOptOuts.current.has(key)) {
            const [cidStr, meal] = key.split(':');
            const name = nameMap.get(parseInt(cidStr, 10)) ?? 'A member';
            const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);
            newItems.push({
              id: genId(),
              type: 'meal_opt_out',
              title: 'Meal Turned Off',
              body: `${name} opted out of ${mealLabel} today`,
              timestamp: Date.now(),
              read: false,
              route: '/meal-status',
            });
          }
        }
        // Opt-ins (turned meal back ON)
        for (const key of seenOptOuts.current) {
          if (!currentOptOuts.has(key)) {
            const [cidStr, meal] = key.split(':');
            const name = nameMap.get(parseInt(cidStr, 10)) ?? 'A member';
            const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);
            newItems.push({
              id: genId(),
              type: 'meal_opt_out',
              title: 'Meal Turned On',
              body: `${name} turned ${mealLabel} back on today`,
              timestamp: Date.now(),
              read: false,
              route: '/meal-status',
            });
          }
        }
      }
      seenOptOuts.current = currentOptOuts;
    } catch {}

    if (currentAdminScope.current !== requestScope) return;

    if (isFirstPoll.current) {
      isFirstPoll.current = false;
    } else {
      pushNotifs(newItems);
    }
  }, [adminScopeKey, token, role, activeMess, pushNotifs]);

  useEffect(() => {
    if (initializedAdminScope.current !== adminScopeKey) {
      initializedAdminScope.current = adminScopeKey;
      setPendingRequestCount(0);
      setNotifications([]);
      setPanelVisible(false);
      seenRequestIds.current = new Set();
      seenOptOuts.current = new Set();
      isFirstPoll.current = true;
    }

    if (!adminScopeKey || !token || role !== 'admin' || !activeMess) {
      return;
    }

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    const startPolling = () => {
      stopPolling();
      void refreshCount();
      intervalRef.current = setInterval(refreshCount, 60_000);
    };

    if (AppState.currentState === 'active') startPolling();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') startPolling();
      else stopPolling();
    });

    return () => {
      stopPolling();
      sub.remove();
    };
  }, [adminScopeKey, token, role, activeMess?.id, refreshCount]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const openPanel = useCallback(() => setPanelVisible(true), []);
  const closePanel = useCallback(() => setPanelVisible(false), []);

  return (
    <NotificationContext.Provider
      value={{
        pendingRequestCount,
        notifications,
        unreadCount,
        refreshCount,
        markAllRead,
        markRead,
        panelVisible,
        openPanel,
        closePanel,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
