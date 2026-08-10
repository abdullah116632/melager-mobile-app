import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, clearApiCache, type MonthData } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useNetwork } from '@/context/NetworkContext';
import { saveToCache, loadFromCache } from '@/lib/cache';

export interface Consumer {
  id: string;
  name: string;
}

export interface DayExpenseItem {
  id: string;
  name: string;
  amount: number;
}

interface MessState {
  consumers: Consumer[];
  meals: {
    [yearMonth: string]: { [consumerId: string]: { [day: string]: number } };
  };
  expenses: {
    [yearMonth: string]: { [day: string]: { items: DayExpenseItem[] } };
  };
  deposits: {
    [yearMonth: string]: { [consumerId: string]: { [day: string]: number } };
  };
  currentYear: number;
  currentMonth: number;
}

interface MessContextType {
  consumers: Consumer[];
  currentYearMonth: string;
  currentMonthLabel: string;
  dataLoading: boolean;
  refreshMonth: () => Promise<void>;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToMonth: (year: number, month: number) => void;
  addConsumer: (name: string, email: string, mobileNumber?: string) => Promise<void>;
  removeConsumer: (id: string) => Promise<void>;
  getMealCount: (yearMonth: string, consumerId: string, day: number) => number;
  setMeal: (yearMonth: string, consumerId: string, day: number, count: number) => void;
  getConsumerTotal: (yearMonth: string, consumerId: string) => number;
  getDayTotal: (yearMonth: string, day: number) => number;
  getGrandTotal: (yearMonth: string) => number;
  getExpense: (yearMonth: string, day: number) => { items: DayExpenseItem[]; total: number };
  setExpense: (yearMonth: string, day: number, items: DayExpenseItem[]) => void;
  getMonthExpenseTotal: (yearMonth: string) => number;
  getDeposit: (yearMonth: string, consumerId: string, day: number) => number;
  setDeposit: (yearMonth: string, consumerId: string, day: number, amount: number) => void;
  getConsumerDepositTotal: (yearMonth: string, consumerId: string) => number;
  getDayDepositTotal: (yearMonth: string, day: number) => number;
  getGrandDepositTotal: (yearMonth: string) => number;
  getDaysInMonth: (yearMonth: string) => number;
}

const MessContext = createContext<MessContextType | null>(null);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatYearMonth(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

function getDaysInMonthFn(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

const now = new Date();
const initialState: MessState = {
  consumers: [],
  meals: {},
  expenses: {},
  deposits: {},
  currentYear: now.getFullYear(),
  currentMonth: now.getMonth() + 1,
};

export function MessProvider({ children }: { children: React.ReactNode }) {
  const { token, activeMess } = useAuth();
  const { isOnline } = useNetwork();
  const [state, setState] = useState<MessState>(initialState);
  const [dataLoading, setDataLoading] = useState(false);
  const loadedMonthsRef = useRef(new Set<string>());
  const inFlightRef = useRef(new Map<string, Promise<void>>());
  const activeMessIdRef = useRef<number | null>(activeMess?.id ?? null);
  const previousMessIdRef = useRef<number | null>(null);
  activeMessIdRef.current = activeMess?.id ?? null;

  const currentYearMonth = formatYearMonth(state.currentYear, state.currentMonth);
  const currentMonthLabel = `${MONTH_NAMES[state.currentMonth - 1]} ${state.currentYear}`;

  const loadMonth = useCallback(
    async (yearMonth: string, force = false) => {
      if (!token || !activeMess) return;
      const messId = activeMess.id;
      const key = `${messId}:${yearMonth}`;
      const existingRequest = inFlightRef.current.get(key);
      if (existingRequest) return existingRequest;

      const applyData = (data: MonthData) => {
        if (activeMessIdRef.current !== messId) return;
        setState((prev) => ({
          ...prev,
          consumers: data.consumers.map((c) => ({ id: c.id.toString(), name: c.name })),
          meals: { ...prev.meals, [yearMonth]: data.meals },
          expenses: { ...prev.expenses, [yearMonth]: data.expenses },
          deposits: { ...prev.deposits, [yearMonth]: data.deposits },
        }));
        loadedMonthsRef.current.add(key);
      };

      const request = (async () => {
        const alreadyLoaded = loadedMonthsRef.current.has(key);
        if (!alreadyLoaded) setDataLoading(true);

        // Start the network request immediately while AsyncStorage is read.
        const networkRequest = api
          .getMonthData(yearMonth, token, messId)
          .then((data) => ({ data }))
          .catch(() => ({ data: null }));

        if (!alreadyLoaded && !force) {
          const cached = await loadFromCache(messId, yearMonth);
          if (cached) {
            applyData(cached as MonthData);
            setDataLoading(false);
          }
        }

        try {
          const { data } = await networkRequest;
          if (!data) return;
          applyData(data);
          void saveToCache(messId, yearMonth, data);
        } finally {
          if (activeMessIdRef.current === messId) setDataLoading(false);
          inFlightRef.current.delete(key);
        }
      })();

      inFlightRef.current.set(key, request);
      return request;
    },
    [token, activeMess?.id],
  );

  useEffect(() => {
    if (!token || !activeMess) {
      loadedMonthsRef.current.clear();
      inFlightRef.current.clear();
      previousMessIdRef.current = null;
      setState(initialState);
      return;
    }
    if (previousMessIdRef.current !== activeMess.id) {
      previousMessIdRef.current = activeMess.id;
      inFlightRef.current.clear();
      setState((prev) => ({
        ...initialState,
        currentYear: prev.currentYear,
        currentMonth: prev.currentMonth,
      }));
    }
    loadMonth(currentYearMonth);
  }, [token, activeMess?.id, currentYearMonth]);

  const goToPrevMonth = () => {
    setState((prev) => {
      let month = prev.currentMonth - 1;
      let year = prev.currentYear;
      if (month < 1) { month = 12; year -= 1; }
      return { ...prev, currentMonth: month, currentYear: year };
    });
  };

  const goToNextMonth = () => {
    setState((prev) => {
      let month = prev.currentMonth + 1;
      let year = prev.currentYear;
      if (month > 12) { month = 1; year += 1; }
      return { ...prev, currentMonth: month, currentYear: year };
    });
  };

  const goToMonth = (year: number, month: number) => {
    setState((prev) => ({ ...prev, currentYear: year, currentMonth: month }));
  };

  const addConsumer = async (name: string, email: string, mobileNumber?: string) => {
    if (!isOnline) throw new Error('Internet connection required.');
    if (!token || !activeMess) return;
    const { consumer } = await api.addConsumer(name, email, mobileNumber, token, activeMess.id);
    setState((prev) => ({
      ...prev,
      consumers: [...prev.consumers, { id: consumer.id.toString(), name: consumer.name }],
    }));
  };

  const removeConsumer = async (id: string) => {
    if (!isOnline) throw new Error('Internet connection required.');
    if (!token || !activeMess) return;
    await api.removeConsumer(parseInt(id, 10), token, activeMess.id);
    setState((prev) => {
      const newMeals: MessState['meals'] = {};
      Object.keys(prev.meals).forEach((ym) => {
        const d = { ...prev.meals[ym] };
        delete d[id];
        newMeals[ym] = d;
      });
      const newDeposits: MessState['deposits'] = {};
      Object.keys(prev.deposits).forEach((ym) => {
        const d = { ...prev.deposits[ym] };
        delete d[id];
        newDeposits[ym] = d;
      });
      return {
        ...prev,
        consumers: prev.consumers.filter((c) => c.id !== id),
        meals: newMeals,
        deposits: newDeposits,
      };
    });
  };

  const getMealCount = (yearMonth: string, consumerId: string, day: number): number =>
    state.meals[yearMonth]?.[consumerId]?.[day.toString()] ?? 0;

  const setMeal = (yearMonth: string, consumerId: string, day: number, count: number) => {
    if (!isOnline) return;
    setState((prev) => ({
      ...prev,
      meals: {
        ...prev.meals,
        [yearMonth]: {
          ...prev.meals[yearMonth],
          [consumerId]: { ...prev.meals[yearMonth]?.[consumerId], [day.toString()]: count },
        },
      },
    }));
    if (!token || !activeMess) return;
    api.setMeal(consumerId, yearMonth, day, count, token, activeMess.id).catch(() => {});
  };

  const getConsumerTotal = (yearMonth: string, consumerId: string): number =>
    Object.values(state.meals[yearMonth]?.[consumerId] ?? {}).reduce(
      (sum, v) => sum + (v as number),
      0,
    );

  const getDayTotal = (yearMonth: string, day: number): number =>
    Object.values(state.meals[yearMonth] ?? {}).reduce(
      (sum, cDays) => sum + (((cDays as Record<string, number>)[day.toString()]) ?? 0),
      0,
    );

  const getGrandTotal = (yearMonth: string): number =>
    state.consumers.reduce((sum, c) => sum + getConsumerTotal(yearMonth, c.id), 0);

  const getExpense = (yearMonth: string, day: number): { items: DayExpenseItem[]; total: number } => {
    const stored = state.expenses[yearMonth]?.[day.toString()];
    const items = stored?.items ?? [];
    return { items, total: items.reduce((s, it) => s + it.amount, 0) };
  };

  const setExpense = (yearMonth: string, day: number, items: DayExpenseItem[]) => {
    if (!isOnline) return;
    setState((prev) => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        [yearMonth]: { ...prev.expenses[yearMonth], [day.toString()]: { items } },
      },
    }));
    if (!token || !activeMess) return;
    api.setExpense(yearMonth, day, items, token, activeMess.id).catch(() => {});
  };

  const getMonthExpenseTotal = (yearMonth: string): number =>
    Object.values(state.expenses[yearMonth] ?? {}).reduce((sum, day) => {
      const items = (day as { items: DayExpenseItem[] }).items ?? [];
      return sum + items.reduce((s, it) => s + it.amount, 0);
    }, 0);

  const getDeposit = (yearMonth: string, consumerId: string, day: number): number =>
    state.deposits[yearMonth]?.[consumerId]?.[day.toString()] ?? 0;

  const setDeposit = (yearMonth: string, consumerId: string, day: number, amount: number) => {
    if (!isOnline) return;
    setState((prev) => ({
      ...prev,
      deposits: {
        ...prev.deposits,
        [yearMonth]: {
          ...prev.deposits[yearMonth],
          [consumerId]: { ...prev.deposits[yearMonth]?.[consumerId], [day.toString()]: amount },
        },
      },
    }));
    if (token && activeMess) {
      api.setDeposit(consumerId, yearMonth, day, amount, token, activeMess.id).catch(() => {});
    }
  };

  const getConsumerDepositTotal = (yearMonth: string, consumerId: string): number =>
    Object.values(state.deposits[yearMonth]?.[consumerId] ?? {}).reduce(
      (sum, v) => sum + (v as number),
      0,
    );

  const getDayDepositTotal = (yearMonth: string, day: number): number =>
    Object.values(state.deposits[yearMonth] ?? {}).reduce(
      (sum, cDays) => sum + (((cDays as Record<string, number>)[day.toString()]) ?? 0),
      0,
    );

  const getGrandDepositTotal = (yearMonth: string): number =>
    state.consumers.reduce((sum, c) => sum + getConsumerDepositTotal(yearMonth, c.id), 0);

  const getDaysInMonth = (yearMonth: string) => getDaysInMonthFn(yearMonth);

  const refreshMonth = useCallback(() => {
    clearApiCache();
    return loadMonth(currentYearMonth, true);
  }, [loadMonth, currentYearMonth]);

  const value: MessContextType = {
    consumers: state.consumers,
    currentYearMonth,
    currentMonthLabel,
    dataLoading,
    refreshMonth,
    goToPrevMonth,
    goToNextMonth,
    goToMonth,
    addConsumer,
    removeConsumer,
    getMealCount,
    setMeal,
    getConsumerTotal,
    getDayTotal,
    getGrandTotal,
    getExpense,
    setExpense,
    getMonthExpenseTotal,
    getDeposit,
    setDeposit,
    getConsumerDepositTotal,
    getDayDepositTotal,
    getGrandDepositTotal,
    getDaysInMonth,
  };

  return <MessContext.Provider value={value}>{children}</MessContext.Provider>;
}

export function useMess(): MessContextType {
  const ctx = useContext(MessContext);
  if (!ctx) throw new Error('useMess must be used within MessProvider');
  return ctx;
}
