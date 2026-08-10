import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";
import type { DashboardAccounting } from "@/types/dashboard";
import type { AppColors } from "@/types/theme";
import { formatDashboardAmount, formatDashboardRate } from "@/utils/dashboard";
import { dashboardStyles as styles } from "./dashboardStyles";

interface SummaryCardProps {
  colors: AppColors;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  background: string;
  iconColor: string;
  sub?: string;
}

const SummaryCard = ({
  colors,
  icon,
  label,
  value,
  background,
  iconColor,
  sub,
}: SummaryCardProps) => (
  <View
    style={[
      styles.summaryCard,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}
  >
    <View style={[styles.cardIcon, { backgroundColor: background }]}>
      <Feather name={icon} size={20} color={iconColor} />
    </View>
    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
      {label}
    </Text>
    <Text
      style={[styles.cardValue, { color: colors.foreground }]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {value}
    </Text>
    {sub ? (
      <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
        {sub}
      </Text>
    ) : null}
  </View>
);

interface DashboardSummaryCardsProps {
  colors: AppColors;
  accounting: DashboardAccounting;
}

export const DashboardSummaryCards = ({
  colors,
  accounting,
}: DashboardSummaryCardsProps) => {
  const { totalMeals, totalExpenses, totalDeposits, mealRate, netBalance } =
    accounting;
  const isPositive = netBalance >= 0;

  return (
    <View style={styles.cardsGrid}>
      <View
        style={[
          styles.balanceHeroCard,
          {
            backgroundColor: "#FFFFFF",
            borderColor: isPositive ? "#A7F3D0" : "#FECACA",
          },
        ]}
      >
        <View
          style={[
            styles.balanceHeroIcon,
            { backgroundColor: isPositive ? "#D1FAE5" : "#FEE2E2" },
          ]}
        >
          <Feather
            name={isPositive ? "trending-up" : "trending-down"}
            size={23}
            color={isPositive ? "#059669" : "#DC2626"}
          />
        </View>
        <View style={styles.balanceHeroText}>
          <Text
            style={[
              styles.balanceHeroLabel,
              { color: isPositive ? "#065F46" : "#991B1B" },
            ]}
          >
            Current Balance
          </Text>
          <Text
            style={[
              styles.balanceHeroSub,
              { color: isPositive ? "#047857" : "#B91C1C" },
            ]}
          >
            Total deposits minus total expenses
          </Text>
        </View>
        <Text
          style={[
            styles.balanceHeroValue,
            { color: isPositive ? "#059669" : "#DC2626" },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {isPositive ? "+" : "-"}৳{formatDashboardAmount(Math.abs(netBalance))}
        </Text>
      </View>

      <SummaryCard
        colors={colors}
        icon="coffee"
        label="Total Meals"
        value={totalMeals.toString()}
        background="#ECFDF5"
        iconColor="#059669"
      />
      <SummaryCard
        colors={colors}
        icon="shopping-bag"
        label="Total Expenses"
        value={`৳${formatDashboardAmount(totalExpenses)}`}
        background="#FFF7ED"
        iconColor="#EA580C"
      />
      <SummaryCard
        colors={colors}
        icon="archive"
        label="Total Deposits"
        value={`৳${formatDashboardAmount(totalDeposits)}`}
        background="#EFF6FF"
        iconColor="#3B82F6"
      />
      <SummaryCard
        colors={colors}
        icon="tag"
        label="Meal Rate"
        value={mealRate > 0 ? `৳${formatDashboardRate(mealRate)}` : "—"}
        background="#F5F3FF"
        iconColor="#7C3AED"
        sub={mealRate > 0 ? "per meal" : "no meals yet"}
      />
    </View>
  );
};
