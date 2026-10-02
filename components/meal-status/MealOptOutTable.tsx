import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import type { MealStatusConsumer } from "@/types/mealStatus";

const MealCell = ({ opted }: { opted: boolean }) => (
  <View className="w-[54px] items-center justify-center">
    {opted ? (
      <View className="h-7 w-7 items-center justify-center rounded-full bg-red-50">
        <Feather name="x" size={14} color="#DC2626" />
      </View>
    ) : (
      <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-50">
        <Feather name="check" size={14} color="#059669" />
      </View>
    )}
  </View>
);

const OffCount = ({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) => (
  <View
    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-300/70 bg-white px-2 py-1.5"
    accessibilityLabel={`${count} ${label} off`}
  >
    {icon}
    <Text
      className={`font-inter-bold text-[13px] ${count > 0 ? "text-red-600" : "text-slate-400"}`}
    >
      {count}
    </Text>
    <Text className="font-inter-medium text-[10px] text-slate-500">off</Text>
  </View>
);

interface MealOptOutTableProps {
  consumers: MealStatusConsumer[];
}

export const MealOptOutTable = ({ consumers }: MealOptOutTableProps) => {
  const optOutRows = consumers.filter(
    (consumer) => consumer.breakfast || consumer.lunch || consumer.dinner,
  );
  const hasOptOuts = optOutRows.length > 0;
  const count = (meal: "breakfast" | "lunch" | "dinner") =>
    consumers.filter((consumer) => consumer[meal]).length;

  return (
    <View className="mx-4 mb-3.5">
      <View className="mb-2.5 flex-row items-center justify-between px-1">
        <Text className="font-inter-bold text-[13px] tracking-[1.2px] text-slate-500">
          MEAL ON/OFF
        </Text>
        {hasOptOuts && (
          <View className="rounded-full bg-red-50 px-2.5 py-1">
            <Text className="font-inter-semibold text-[11px] text-red-600">
              {optOutRows.length}{" "}
              {optOutRows.length === 1 ? "member" : "members"}
            </Text>
          </View>
        )}
      </View>

      <View className="overflow-hidden rounded-[20px] border border-slate-300 bg-[#E6E9EE] p-3.5 shadow-sm shadow-slate-900/5">
        <View className="flex-row gap-2">
          <OffCount
            icon={<Feather name="sunrise" size={13} color="#D97706" />}
            label="Breakfast"
            count={count("breakfast")}
          />
          <OffCount
            icon={<Ionicons name="sunny-outline" size={14} color="#0284C7" />}
            label="Lunch"
            count={count("lunch")}
          />
          <OffCount
            icon={<Ionicons name="moon-outline" size={13} color="#4F46E5" />}
            label="Dinner"
            count={count("dinner")}
          />
        </View>

        {!hasOptOuts ? (
          <View className="mt-3 items-center gap-2 rounded-2xl bg-emerald-50 py-5">
            <Feather name="check-circle" size={26} color="#059669" />
            <Text className="text-center font-inter-medium text-[13px] text-emerald-700">
              Everyone is eating — no meals turned off.
            </Text>
          </View>
        ) : (
          <View className="mt-3 overflow-hidden rounded-2xl border border-slate-300/70">
            <View className="flex-row items-center bg-teal-700 py-2.5">
              <Text className="flex-1 pl-3 text-left font-inter-semibold text-[12px] text-white">
                Member
              </Text>
              <View className="w-[54px] items-center justify-center">
                <Feather name="sunrise" size={15} color="#fff" />
              </View>
              <View className="w-[54px] items-center justify-center">
                <Ionicons name="sunny-outline" size={15} color="#fff" />
              </View>
              <View className="w-[54px] items-center justify-center">
                <Ionicons name="moon-outline" size={15} color="#fff" />
              </View>
            </View>

            {optOutRows.map((row, index) => (
              <View
                key={row.consumerId}
                className={`flex-row items-center ${index > 0 ? "border-t border-slate-100" : ""} ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
              >
                <Text
                  className="flex-1 py-3 pl-3 font-inter-medium text-[13px] text-slate-900"
                  numberOfLines={1}
                >
                  {row.consumerName}
                </Text>
                <MealCell opted={row.breakfast} />
                <MealCell opted={row.lunch} />
                <MealCell opted={row.dinner} />
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};
