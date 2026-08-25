import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import MonthPicker from "@/components/MonthPicker";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import { useAuth, useMess, useNetwork } from "@/redux/hooks";
import { getDepositEntries } from "@/services/depositService";
import type { DepositEntry } from "@/types/deposit";
import { getDepositTotal } from "@/utils/deposit";
import { DepositsHeader } from "./DepositsHeader";
import { DepositsTable } from "./DepositsTable";

export const DepositsContent = () => {
  const { token, activeMess } = useAuth();
  const { isOnline } = useNetwork();
  const { currentYearMonth, refreshMonth } = useMess();
  const [entries, setEntries] = useState<DepositEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const messId = activeMess?.id ?? null;

  const loadEntries = useCallback(async () => {
    if (!messId || !token) {
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setLoading(false);
      setLoadError("You are offline. Reconnect to load deposits.");
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      setEntries(await getDepositEntries(messId, currentYearMonth, token));
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load deposits. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentYearMonth, isOnline, messId, token]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const refreshDeposits = async () => {
    await Promise.all([refreshMonth(), loadEntries()]).catch(() => {});
  };

  return (
    <>
      <DepositsHeader grandTotal={getDepositTotal(entries)} />
      <MonthPicker accentColor={DEPOSIT_PRIMARY} variant="dashboard" />
      {loading && (
        <View className="items-center py-3">
          <ActivityIndicator size="small" color={DEPOSIT_PRIMARY} />
        </View>
      )}
      {!loading && loadError ? (
        <View className="mx-4 my-2 flex-row items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
          <Text className="flex-1 pr-3 font-inter text-xs leading-4 text-red-700">
            {loadError}
          </Text>
          <TouchableOpacity
            className="rounded-lg bg-red-100 px-3 py-2"
            onPress={() => void loadEntries()}
            activeOpacity={0.75}
          >
            <Text className="font-inter-semibold text-xs text-red-700">
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <DepositsTable
        entries={entries}
        onRefresh={refreshDeposits}
        onEntryAdded={(entry) => setEntries((current) => [...current, entry])}
        onEntryUpdated={(updatedEntry) =>
          setEntries((current) =>
            current.map((entry) =>
              entry.id === updatedEntry.id ? updatedEntry : entry,
            ),
          )
        }
        onEntryDeleted={(entryId) =>
          setEntries((current) =>
            current.filter((entry) => entry.id !== entryId),
          )
        }
      />
    </>
  );
};
