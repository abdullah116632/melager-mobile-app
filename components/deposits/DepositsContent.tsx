import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import MonthPicker from "@/components/MonthPicker";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import { DepositRepository } from "@/offline/features/deposits/DepositRepository";
import {
  subscribeToDepositConflicts,
  type DepositConflict,
} from "@/offline/features/deposits/conflicts";
import { useOfflineDatabase } from "@/offline/provider/OfflineDatabaseProvider";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import {
  useAppDispatch,
  useAuth,
  useDeposits,
  useNetwork,
} from "@/redux/hooks";
import {
  hydrateDepositEntriesFromLocal,
  loadDepositEntries,
} from "@/redux/slice/depositsSlice";
import { offlineActionFailed } from "@/redux/slice/networkSlice";
import { getDepositEntryDateParts, getDepositTotal } from "@/utils/deposit";
import { DepositConflictModal } from "./DepositConflictModal";
import { DepositsHeader } from "./DepositsHeader";
import { DepositsTable } from "./DepositsTable";

export const DepositsContent = () => {
  const dispatch = useAppDispatch();
  const { isOnline } = useNetwork();
  const { user, mess, token } = useAuth();
  const { database } = useOfflineDatabase();
  const {
    consumers,
    currentYearMonth,
    dataLoading,
    depositsScopeMessId,
    entries,
    entriesReady,
    entriesLoading,
    refreshMonth,
  } = useDeposits();
  const [conflicts, setConflicts] = useState<DepositConflict[]>([]);
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (depositsScopeMessId === null) return;
    void dispatch(
      loadDepositEntries({
        messId: depositsScopeMessId,
        yearMonth: currentYearMonth,
      }),
    )
      .unwrap()
      .catch(() => undefined);
  }, [currentYearMonth, depositsScopeMessId, dispatch, isOnline]);

  const refreshConflicts = useCallback(() => {
    if (!database || !user?.id || !mess?.id) return;
    void new DepositRepository(database)
      .getConflicts(user.id, mess.id)
      .then(setConflicts)
      .catch(() => undefined);
  }, [database, mess?.id, user?.id]);

  useEffect(() => {
    refreshConflicts();
    return subscribeToDepositConflicts(refreshConflicts);
  }, [refreshConflicts]);

  const resolveConflict = useCallback(
    async (conflict: DepositConflict, resolution: "local" | "server") => {
      if (!database || !user?.id || !mess?.id) return;
      setResolvingConflict(conflict.localId);
      try {
        await new DepositRepository(database).resolveConflict(
          user.id,
          mess.id,
          conflict.localId,
          resolution,
        );
        const months = new Set(
          [conflict.local, conflict.server].flatMap((snapshot) => {
            const parts = snapshot ? getDepositEntryDateParts(snapshot) : null;
            return parts ? [parts.yearMonth] : [];
          }),
        );
        await Promise.all(
          [...months].map((yearMonth) =>
            dispatch(
              hydrateDepositEntriesFromLocal({ messId: mess.id, yearMonth }),
            ),
          ),
        );
        if (resolution === "local" && token && isOnline) {
          void getOfflineRuntime(database)
            .engine.sync(
              { userId: user.id, messId: mess.id, token },
              { collections: ["deposits"], force: true },
            )
            .catch(() => undefined);
        }
      } catch (error) {
        Alert.alert(
          "Could not resolve conflict",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setResolvingConflict(null);
      }
    },
    [database, dispatch, isOnline, mess?.id, token, user?.id],
  );

  const refreshDeposits = async () => {
    if (depositsScopeMessId === null) return;
    if (!isOnline) {
      await dispatch(
        loadDepositEntries({
          messId: depositsScopeMessId,
          yearMonth: currentYearMonth,
          force: true,
        }),
      )
        .unwrap()
        .catch(() => undefined);
      // The app shell renders this as a short red toast. Keeping the saved
      // SQLite data on screen is intentional; refreshing cannot reach remote.
      dispatch(offlineActionFailed("refresh"));
      return;
    }
    try {
      await Promise.all([
        refreshMonth(),
        dispatch(
          loadDepositEntries({
            messId: depositsScopeMessId,
            yearMonth: currentYearMonth,
            force: true,
          }),
        ).unwrap(),
      ]);
    } catch {}
  };

  return (
    <>
      <DepositsHeader
        grandTotal={entriesReady ? getDepositTotal(entries) : 0}
      />
      <MonthPicker
        accentColor={DEPOSIT_PRIMARY}
        variant="dashboard"
        monthDataLoading={dataLoading || entriesLoading}
        showSyncStatus={false}
        overlapAbove={false}
      />
      <DepositConflictModal
        conflicts={conflicts}
        consumers={consumers}
        resolvingId={resolvingConflict}
        onResolve={(conflict, resolution) =>
          void resolveConflict(conflict, resolution)
        }
      />
      <DepositsTable onRefresh={refreshDeposits} />
    </>
  );
};
