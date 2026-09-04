import type { SQLiteDatabase } from "expo-sqlite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import {
  getOfflineDatabase,
  isOfflineDatabaseSupported,
} from "../database/connection";

interface OfflineDatabaseContextValue {
  database: SQLiteDatabase | null;
  isAvailable: boolean;
}

const OfflineDatabaseContext =
  createContext<OfflineDatabaseContextValue | null>(null);

export const OfflineDatabaseProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const isAvailable = isOfflineDatabaseSupported();
  const [database, setDatabase] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isAvailable) return;
    let cancelled = false;

    void getOfflineDatabase().then(
      (nextDatabase) => {
        if (!cancelled) setDatabase(nextDatabase);
      },
      (reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not initialize local storage.",
        );
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt, isAvailable]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  const value = useMemo(
    () => ({ database, isAvailable }),
    [database, isAvailable],
  );

  if (isAvailable && !database && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-teal-700">
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text className="mt-3 font-inter-medium text-sm text-teal-50">
          Preparing offline storage...
        </Text>
      </View>
    );
  }

  if (isAvailable && error) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <Text className="text-center font-inter-bold text-lg text-slate-900">
          Local storage could not start
        </Text>
        <Text className="mt-2 text-center font-inter text-sm leading-5 text-slate-500">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-5 rounded-xl bg-teal-700 px-5 py-3"
          onPress={retry}
        >
          <Text className="font-inter-semibold text-sm text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <OfflineDatabaseContext.Provider value={value}>
      {children}
    </OfflineDatabaseContext.Provider>
  );
};

export function useOfflineDatabase(): OfflineDatabaseContextValue {
  const context = useContext(OfflineDatabaseContext);
  if (!context) {
    throw new Error(
      "useOfflineDatabase must be used inside OfflineDatabaseProvider.",
    );
  }
  return context;
}
