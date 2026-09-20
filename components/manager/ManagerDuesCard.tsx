import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { LayoutAnimation, Text, TouchableOpacity, View } from "react-native";

import {
  SummaryBadge,
  SummaryCardShell,
} from "@/components/dashboard/DashboardSummaryParts";
import { useDashboardLocalAccounting } from "@/hooks/useDashboardLocalAccounting";
import type { DashboardConsumerRow } from "@/types/dashboard";
import { formatDashboardAmount } from "@/utils/dashboard";

const COLLAPSED_COUNT = 2;

const alertIcon = <Feather name="alert-triangle" size={18} color="#E11D48" />;

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
      className={`flex-row items-center justify-between gap-3 py-3 ${
        isLast ? "" : "border-b border-slate-100"
      }`}
    >
      <Text
        className={`shrink font-inter-semibold text-[13px] ${
          deleted ? "text-slate-500" : "text-slate-800"
        }`}
        numberOfLines={1}
      >
        {row.name}
        {deleted ? (
          <Text className="font-inter text-[10.5px] text-slate-400">
            {"  "}Deleted
          </Text>
        ) : null}
      </Text>
      <Text
        className="font-inter-bold text-[13.5px] text-rose-700"
        style={{ fontVariant: ["tabular-nums"] }}
        numberOfLines={1}
      >
        -৳{formatDashboardAmount(Math.abs(row.balance))}
      </Text>
    </View>
  );
};

export const ManagerDuesCard = () => {
  const { consumerRows } = useDashboardLocalAccounting();
  const [expanded, setExpanded] = useState(false);
  // Largest due first, so the two rows shown while collapsed are the two that
  // matter most.
  const dueRows = consumerRows
    .filter((row) => row.balance < 0)
    .sort((first, second) => first.balance - second.balance);

  if (dueRows.length === 0) return null;

  const totalDue = dueRows.reduce((sum, row) => sum + Math.abs(row.balance), 0);
  const hiddenCount = dueRows.length - COLLAPSED_COUNT;
  const visibleRows = expanded ? dueRows : dueRows.slice(0, COLLAPSED_COUNT);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
  };

  return (
    <SummaryCardShell
      icon={alertIcon}
      title="Negative Balance"
      subtitle={`৳${formatDashboardAmount(totalDue)} owed to the mess`}
      badge={
        <SummaryBadge
          label={`${dueRows.length} ${dueRows.length === 1 ? "member" : "members"}`}
          tone="rose"
        />
      }
    >
      {visibleRows.map((row, index) => (
        <DueRow
          key={row.id}
          row={row}
          isLast={index === visibleRows.length - 1}
        />
      ))}

      {hiddenCount > 0 ? (
        <TouchableOpacity
          className="mt-2 flex-row items-center justify-center gap-1 rounded-xl bg-slate-50 py-2"
          onPress={toggle}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <Text className="font-inter-semibold text-[11.5px] text-slate-600">
            {expanded
              ? "Show less"
              : `View ${hiddenCount} other ${hiddenCount === 1 ? "member" : "members"}`}
          </Text>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color="#64748B"
          />
        </TouchableOpacity>
      ) : null}
    </SummaryCardShell>
  );
};
