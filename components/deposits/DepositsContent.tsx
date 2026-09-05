import { useEffect } from "react";
import MonthPicker from "@/components/MonthPicker";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import { useAppDispatch, useDeposits, useNetwork } from "@/redux/hooks";
import { loadDepositEntries } from "@/redux/slice/depositsSlice";
import { offlineActionFailed } from "@/redux/slice/networkSlice";
import { getDepositTotal } from "@/utils/deposit";
import { DepositsHeader } from "./DepositsHeader";
import { DepositsTable } from "./DepositsTable";

export const DepositsContent = () => {
  const dispatch = useAppDispatch();
  const { isOnline } = useNetwork();
  const {
    currentYearMonth,
    dataLoading,
    depositsScopeMessId,
    entries,
    entriesReady,
    entriesLoading,
    refreshMonth,
  } = useDeposits();

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
      />
      <DepositsTable onRefresh={refreshDeposits} />
    </>
  );
};
