import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { LayoutAnimation, Text, TouchableOpacity, View } from "react-native";

import { useDashboardLocalAccounting } from "@/hooks/useDashboardLocalAccounting";
import type { DashboardConsumerRow } from "@/types/dashboard";
import { formatDashboardAmount } from "@/utils/dashboard";

const COLLAPSED_COUNT = 2;

const cardShadow = {
  shadowColor: "#94A3B8",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.16,
  shadowRadius: 8,
  elevation: 3,
};

const DueRow = ({
  row,
  isLast,
}: {
  row: DashboardConsumerRow;
  isLast: boolean;
}) => {
  const deleted = Boolean(row.accountDeletedAt);
  return (
    <View
      className={`flex-row items-center gap-3 py-3 ${isLast ? "" : "border-b border-slate-100"}`}
    >
      <View className="min-w-0 flex-1">
        <Text
          className={`text-[14.5px] ${deleted ? "font-inter-medium text-slate-500" : "font-inter-bold text-slate-900"}`}
          numberOfLines={1}
        >
          {row.name}
          {deleted ? (
            <Text className="font-inter text-[12px] text-slate-400">
              {" "}
              (Deleted)
            </Text>
          ) : null}
        </Text>
        {deleted ? (
          <Text className="mt-0.5 font-inter text-[11.5px] text-slate-500">
            Inactive account
          </Text>
        ) : null}
      </View>
      <View className="rounded-lg bg-red-50 px-2.5 py-1.5">
        <Text
          className="font-inter-bold text-[13.5px] text-red-600"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          -৳{formatDashboardAmount(Math.abs(row.balance))}
        </Text>
      </View>
    </View>
  );
};

export const ManagerDuesCard = () => {
  const { consumerRows } = useDashboardLocalAccounting();
  const [expanded, setExpanded] = useState(false);
  const dueRows = consumerRows
    .filter((row) => row.balance < 0)
    .sort((first, second) => first.balance - second.balance);

  if (dueRows.length === 0) return null;

  const hiddenCount = dueRows.length - COLLAPSED_COUNT;
  const visibleRows = expanded ? dueRows : dueRows.slice(0, COLLAPSED_COUNT);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
  };

  return (
    <View
      className="mx-4 mb-4 rounded-[18px] border border-slate-200 bg-white px-4 pb-2 pt-4"
      style={cardShadow}
    >
      <View className="mb-1 flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-red-50">
          <Feather name="alert-triangle" size={18} color="#E11D48" />
        </View>
        <Text className="flex-1 font-inter-bold text-[17px] text-slate-900">
          Negative Balance
        </Text>
        <View className="rounded-full border border-red-200 bg-red-50 px-3 py-1">
          <Text className="font-inter-semibold text-xs text-red-600">
            {dueRows.length} {dueRows.length === 1 ? "member" : "members"}
          </Text>
        </View>
      </View>

      {visibleRows.map((row, index) => (
        <DueRow
          key={row.id}
          row={row}
          isLast={index === visibleRows.length - 1}
        />
      ))}

      {hiddenCount > 0 ? (
        <TouchableOpacity
          className="flex-row items-center justify-center gap-1.5 py-3"
          onPress={toggle}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <Text className="font-inter-semibold text-[13.5px] text-emerald-700">
            {expanded
              ? "Show less"
              : `View ${hiddenCount} other ${hiddenCount === 1 ? "member" : "members"}`}
          </Text>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#047857"
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
