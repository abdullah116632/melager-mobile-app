import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import type { DashboardAccounting } from "@/types/dashboard";
import { formatDashboardAmount, formatDashboardRate } from "@/utils/dashboard";

interface SummaryCardProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  iconBackgroundClassName: string;
  iconColor: string;
  waveColor: string;
  sub?: string;
}

const SummaryCard = ({
  icon,
  label,
  value,
  iconBackgroundClassName,
  iconColor,
  waveColor,
  sub,
}: SummaryCardProps) => (
  <View className="relative min-h-[142px] w-[48%] overflow-hidden rounded-[18px] border border-slate-200 bg-white p-4 shadow-md shadow-slate-300/30">
    <View
      className="absolute -bottom-10 -right-7 h-20 w-[120%] rotate-[-8deg] rounded-[100%]"
      style={{ backgroundColor: waveColor }}
    />
    <View
      className="absolute -bottom-14 -left-5 h-20 w-[110%] rotate-[7deg] rounded-[100%] opacity-60"
      style={{ backgroundColor: waveColor }}
    />
    <View
      className={`mb-3 h-[42px] w-[42px] items-center justify-center rounded-full ${iconBackgroundClassName}`}
    >
      <Feather name={icon} size={21} color={iconColor} />
    </View>
    <Text className="font-inter-medium text-[13px] text-slate-600">
      {label}
    </Text>
    <Text
      className="mt-1 font-inter-bold text-[25px] tracking-[-0.4px] text-slate-950"
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {value}
    </Text>
    {sub ? (
      <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
        {sub}
      </Text>
    ) : null}
  </View>
);

interface DashboardSummaryCardsProps {
  accounting: DashboardAccounting;
}

export const DashboardSummaryCards = ({
  accounting,
}: DashboardSummaryCardsProps) => {
  const { totalMeals, totalExpenses, totalDeposits, mealRate, netBalance } =
    accounting;
  const isPositive = netBalance >= 0;

  return (
    <View className="mb-5 flex-row flex-wrap justify-between gap-y-3 px-4">
      <View className="relative min-h-[82px] w-full overflow-hidden rounded-[19px] shadow-lg shadow-teal-800/20">
        <LinearGradient
          colors={
            isPositive
              ? ["#075F5B", "#008577", "#11A98D"]
              : ["#8F1D2C", "#C2414F", "#E05A67"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View className="absolute -bottom-12 -right-10 h-20 w-[85%] rotate-[-7deg] rounded-[100%] bg-white/10" />
        <View className="flex-1 flex-row items-center px-4 py-3">
          <View className="h-[48px] w-[48px] items-center justify-center rounded-full border border-white/20 bg-white/15">
            <Feather name="credit-card" size={23} color="#FFFFFF" />
          </View>
          <View className="ml-4 mr-2.5 flex-1">
            <Text className="font-inter-bold text-[15px] text-white">
              Current Balance
            </Text>
            <Text className="mt-1 font-inter text-[11px] leading-[15px] text-white/75">
              Total deposits minus total expenses
            </Text>
          </View>
          <View className="max-w-[42%] rounded-full border border-white/25 bg-white/10 px-3.5 py-2">
            <Text
              className="text-right font-inter-bold text-[22px] tracking-[-0.4px] text-white"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {isPositive ? "+" : "-"}৳
              {formatDashboardAmount(Math.abs(netBalance))}
            </Text>
          </View>
        </View>
      </View>

      <SummaryCard
        icon="coffee"
        label="Total Meals"
        value={totalMeals.toString()}
        iconBackgroundClassName="bg-emerald-50"
        iconColor="#059669"
        waveColor="#D9FAF1"
      />
      <SummaryCard
        icon="shopping-bag"
        label="Total Expenses"
        value={`৳${formatDashboardAmount(totalExpenses)}`}
        iconBackgroundClassName="bg-orange-50"
        iconColor="#EA580C"
        waveColor="#FFF0DE"
      />
      <SummaryCard
        icon="archive"
        label="Total Deposits"
        value={`৳${formatDashboardAmount(totalDeposits)}`}
        iconBackgroundClassName="bg-blue-50"
        iconColor="#2563EB"
        waveColor="#E2EEFF"
      />
      <SummaryCard
        icon="tag"
        label="Meal Rate"
        value={mealRate > 0 ? `৳${formatDashboardRate(mealRate)}` : "—"}
        iconBackgroundClassName="bg-violet-50"
        iconColor="#7C3AED"
        waveColor="#F1E4FF"
        sub={mealRate > 0 ? "per meal" : "no meals yet"}
      />
    </View>
  );
};
