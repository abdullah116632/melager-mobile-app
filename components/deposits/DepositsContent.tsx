import { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import MonthPicker from "@/components/MonthPicker";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import { useAppDispatch, useDeposits, useNetwork } from "@/redux/hooks";
import { loadDepositEntries } from "@/redux/slice/depositsSlice";
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
    entriesError,
    refreshMonth,
  } = useDeposits();
  const loadError = !isOnline
    ? "You are offline. Reconnect to load deposits."
    : entriesError;

  useEffect(() => {
    if (!isOnline || depositsScopeMessId === null) return;
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
    await Promise.all([
      refreshMonth(),
      dispatch(
        loadDepositEntries({
          messId: depositsScopeMessId,
          yearMonth: currentYearMonth,
          force: true,
        }),
      ).unwrap(),
    ]).catch(() => {});
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
      />
      {!entriesLoading && loadError ? (
        <View className="mx-4 my-2 flex-row items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
          <Text className="flex-1 pr-3 font-inter text-xs leading-4 text-red-700">
            {loadError}
          </Text>
          <TouchableOpacity
            className="rounded-lg bg-red-100 px-3 py-2"
            onPress={() =>
              depositsScopeMessId === null
                ? undefined
                : void dispatch(
                    loadDepositEntries({
                      messId: depositsScopeMessId,
                      yearMonth: currentYearMonth,
                      force: true,
                    }),
                  )
            }
            activeOpacity={0.75}
          >
            <Text className="font-inter-semibold text-xs text-red-700">
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <DepositsTable onRefresh={refreshDeposits} />
    </>
  );
};
