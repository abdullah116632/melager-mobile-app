import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DASHBOARD_TABLE_INNER_WIDTH,
  DASHBOARD_TABLE_WIDTHS,
} from "@/constants/dashboard";
import type {
  DashboardAccounting,
  DashboardDatePickerTarget,
  DashboardDateRange,
} from "@/types/dashboard";
import type { AppColors } from "@/types/theme";
import {
  formatDashboardAmount,
  formatDashboardRate,
  formatDashboardShortDate,
} from "@/utils/dashboard";
import { dashboardStyles as styles } from "./dashboardStyles";

interface DashboardConsumerBreakdownProps {
  colors: AppColors;
  accounting: DashboardAccounting;
  consumerCount: number;
  appliedRange: DashboardDateRange | null;
  draftStartDate: string;
  draftEndDate: string;
  hasUnappliedDateChange: boolean;
  rangeLoading: boolean;
  pdfGenerating: boolean;
  onOpenDatePicker: (target: DashboardDatePickerTarget) => void;
  onApplyRange: () => void;
  onDownloadPdf: () => void;
}

const TableHeader = ({
  consumerCount,
  primaryColor,
}: {
  consumerCount: number;
  primaryColor: string;
}) => (
  <View style={[styles.tableRow, { backgroundColor: primaryColor }]}>
    <Text
      style={[styles.tableHeaderText, { width: DASHBOARD_TABLE_WIDTHS.name }]}
    >
      Consumers ({consumerCount})
    </Text>
    <Text
      style={[
        styles.tableHeaderText,
        styles.textRight,
        { width: DASHBOARD_TABLE_WIDTHS.meals },
      ]}
    >
      Meals
    </Text>
    <Text
      style={[
        styles.tableHeaderText,
        styles.textRight,
        { width: DASHBOARD_TABLE_WIDTHS.cost },
      ]}
    >
      Cost
    </Text>
    <Text
      style={[
        styles.tableHeaderText,
        styles.textRight,
        { width: DASHBOARD_TABLE_WIDTHS.deposit },
      ]}
    >
      Deposit
    </Text>
    <Text
      style={[
        styles.tableHeaderText,
        styles.textRight,
        { width: DASHBOARD_TABLE_WIDTHS.balance },
      ]}
    >
      Balance
    </Text>
  </View>
);

export const DashboardConsumerBreakdown = ({
  colors,
  accounting,
  consumerCount,
  appliedRange,
  draftStartDate,
  draftEndDate,
  hasUnappliedDateChange,
  rangeLoading,
  pdfGenerating,
  onOpenDatePicker,
  onApplyRange,
  onDownloadPdf,
}: DashboardConsumerBreakdownProps) => {
  const [showScrollHint, setShowScrollHint] = useState(true);
  const {
    consumerRows,
    totalMeals,
    totalExpenses,
    totalDeposits,
    mealRate,
    netBalance,
  } = accounting;

  if (consumerCount === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="users" size={40} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No consumers yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Add consumers from the Meals tab
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.tableCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.tableCardHeader,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.breakdownIcon}>
          <Feather name="bar-chart-2" size={19} color="#0F766E" />
        </View>
        <View style={styles.breakdownHeaderText}>
          <Text
            style={[styles.breakdownEyebrow, { color: colors.mutedForeground }]}
          >
            ACCOUNTING OVERVIEW
          </Text>
          <Text style={[styles.tableTitle, { color: colors.foreground }]}>
            Consumer Breakdown
          </Text>
        </View>
        <View style={styles.breakdownHeaderActions}>
          {appliedRange && (
            <View style={styles.customRangeBadge}>
              <Feather name="calendar" size={12} color="#6D28D9" />
              <Text style={styles.customRangeBadgeText}>Custom</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.pdfButton, pdfGenerating && { opacity: 0.6 }]}
            onPress={onDownloadPdf}
            disabled={pdfGenerating}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Download Consumer Breakdown PDF"
          >
            {pdfGenerating ? (
              <ActivityIndicator size={15} color="#0F766E" />
            ) : (
              <Feather name="download" size={16} color="#0F766E" />
            )}
            <Text style={styles.pdfButtonText}>PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {appliedRange && (
        <View style={styles.appliedRangeStrip}>
          <View style={styles.appliedRangeLine} />
          <Text style={styles.appliedRangeText}>
            {formatDashboardShortDate(appliedRange.startDate)}
          </Text>
          <Feather name="arrow-right" size={13} color="#7C3AED" />
          <Text style={styles.appliedRangeText}>
            {formatDashboardShortDate(appliedRange.endDate)}
          </Text>
          <View style={styles.appliedRangeLine} />
        </View>
      )}

      <View style={[styles.rangePanel, { borderTopColor: colors.border }]}>
        <View style={styles.rangeFields}>
          {[
            ["start", "Start Date", draftStartDate],
            ["end", "End Date", draftEndDate],
          ].map(([target, label, value]) => (
            <View key={target} style={styles.rangeField}>
              <Text
                style={[styles.rangeLabel, { color: colors.mutedForeground }]}
              >
                {label}
              </Text>
              <TouchableOpacity
                style={[
                  styles.rangeDropdown,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                onPress={() =>
                  onOpenDatePicker(target as DashboardDatePickerTarget)
                }
                activeOpacity={0.75}
              >
                <Feather name="calendar" size={14} color={colors.primary} />
                <Text
                  style={[styles.rangeValue, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {formatDashboardShortDate(value)}
                </Text>
                <Feather
                  name="chevron-down"
                  size={14}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {hasUnappliedDateChange && (
          <TouchableOpacity
            style={[styles.rangeApplyButton, rangeLoading && { opacity: 0.6 }]}
            onPress={onApplyRange}
            disabled={rangeLoading}
            activeOpacity={0.8}
          >
            {rangeLoading ? (
              <ActivityIndicator size={15} color="#fff" />
            ) : (
              <Feather name="check" size={15} color="#fff" />
            )}
            <Text style={styles.applyButtonText}>
              {rangeLoading ? "Loading…" : "Apply"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tableScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              event.nativeEvent;
            setShowScrollHint(
              contentOffset.x < 6 &&
                contentSize.width > layoutMeasurement.width + 4,
            );
          }}
        >
          <View style={{ width: DASHBOARD_TABLE_INNER_WIDTH }}>
            <TableHeader
              consumerCount={consumerCount}
              primaryColor={colors.primary}
            />
            {consumerRows.map((row, index) => {
              const positive = row.balance > 0.005;
              const negative = row.balance < -0.005;
              const balanceColor = positive
                ? "#059669"
                : negative
                  ? "#DC2626"
                  : colors.mutedForeground;
              return (
                <View
                  key={row.id}
                  style={[
                    styles.tableRow,
                    styles.tableBodyRow,
                    {
                      backgroundColor:
                        index % 2 === 0 ? colors.card : colors.rowAlt,
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tableData,
                      {
                        width: DASHBOARD_TABLE_WIDTHS.name,
                        color: colors.foreground,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {row.name}
                  </Text>
                  <Text
                    style={[
                      styles.tableData,
                      styles.tableDataRight,
                      {
                        width: DASHBOARD_TABLE_WIDTHS.meals,
                        color: colors.foreground,
                      },
                    ]}
                  >
                    {row.meals}
                  </Text>
                  {[
                    [row.cost, DASHBOARD_TABLE_WIDTHS.cost, colors.foreground],
                    [
                      row.deposits,
                      DASHBOARD_TABLE_WIDTHS.deposit,
                      colors.foreground,
                    ],
                    [
                      Math.abs(row.balance),
                      DASHBOARD_TABLE_WIDTHS.balance,
                      balanceColor,
                    ],
                  ].map(([amount, width, color], amountIndex) => (
                    <Text
                      key={amountIndex}
                      style={[
                        styles.tableData,
                        styles.tableDataRight,
                        {
                          width: width as number,
                          color: color as string,
                          fontFamily:
                            amountIndex === 2
                              ? "Inter_700Bold"
                              : "Inter_500Medium",
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {amountIndex === 2 && positive ? "+" : ""}৳
                      {formatDashboardAmount(amount as number)}
                    </Text>
                  ))}
                </View>
              );
            })}

            <View
              style={[
                styles.tableRow,
                styles.tableBodyRow,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.tableFooter,
                  { width: DASHBOARD_TABLE_WIDTHS.name },
                ]}
              >
                Total
              </Text>
              <Text
                style={[
                  styles.tableFooter,
                  styles.textRight,
                  { width: DASHBOARD_TABLE_WIDTHS.meals },
                ]}
              >
                {totalMeals}
              </Text>
              {[
                [totalExpenses, DASHBOARD_TABLE_WIDTHS.cost],
                [totalDeposits, DASHBOARD_TABLE_WIDTHS.deposit],
                [Math.abs(netBalance), DASHBOARD_TABLE_WIDTHS.balance],
              ].map(([amount, width], index) => (
                <Text
                  key={index}
                  style={[
                    styles.tableFooter,
                    styles.textRight,
                    {
                      width,
                      color:
                        index === 2
                          ? netBalance >= 0
                            ? "#A7F3D0"
                            : "#FCA5A5"
                          : "#fff",
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {index === 2 && netBalance >= 0 ? "+" : ""}৳
                  {formatDashboardAmount(amount)}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>

        <View pointerEvents="none" style={styles.fixedConsumerColumn}>
          <View
            style={[
              styles.fixedConsumerHeader,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.tableHeaderText}>
              Consumers ({consumerCount})
            </Text>
          </View>
          {consumerRows.map((row, index) => (
            <View
              key={`fixed-${row.id}`}
              style={[
                styles.fixedConsumerRow,
                {
                  backgroundColor:
                    index % 2 === 0 ? colors.card : colors.rowAlt,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.tableData, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {row.name}
              </Text>
            </View>
          ))}
          <View
            style={[
              styles.fixedConsumerTotal,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.tableFooter}>Total</Text>
          </View>
        </View>

        {showScrollHint && (
          <View pointerEvents="none" style={styles.tableScrollArrow}>
            <Feather name="chevrons-right" size={20} color="#0F766E" />
          </View>
        )}
      </View>

      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
          {appliedRange
            ? `${formatDashboardShortDate(appliedRange.startDate)} – ${formatDashboardShortDate(appliedRange.endDate)} (inclusive) · rate ৳${formatDashboardRate(mealRate)}/meal`
            : mealRate > 0
              ? `Balance = Deposit − (Meals × ৳${formatDashboardRate(mealRate)}/meal)`
              : "Balance = Deposit − Cost"}
        </Text>
      </View>
    </View>
  );
};
