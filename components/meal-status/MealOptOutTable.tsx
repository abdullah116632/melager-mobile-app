import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";
import { MEAL_ICONS } from "@/constants/mealStatus";
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

interface MealOptOutTableProps {
  consumers: MealStatusConsumer[];
}

export const MealOptOutTable = ({ consumers }: MealOptOutTableProps) => {
  const optOutRows = consumers.filter(
    (consumer) => consumer.breakfast || consumer.lunch || consumer.dinner,
  );
  const hasOptOuts = optOutRows.length > 0;

  return (
    <View className="mx-4 mb-3.5 rounded-2xl border border-slate-300 bg-[#E2E8F0] p-4">
      <Text className="mb-3.5 font-inter-bold text-[15px] text-slate-900">
        Meal On/Off {hasOptOuts ? `(${optOutRows.length})` : ""}
      </Text>

      {!hasOptOuts ? (
        <View className="items-center gap-2.5 py-6">
          <Feather name="check-circle" size={28} color="#059669" />
          <Text className="text-center font-inter text-sm text-slate-500">
            Everyone is eating — no meals turned off.
          </Text>
        </View>
      ) : (
        <View>
          <View className="mb-1 flex-row items-center rounded-lg bg-teal-700 py-2.5">
            <Text className="w-[140px] pl-3 text-left font-inter-semibold text-[13px] text-white">
              Name
            </Text>
            <Text className="w-[54px] text-center font-inter-semibold text-[13px] text-white">
              {MEAL_ICONS.breakfast}
            </Text>
            <Text className="w-[54px] text-center font-inter-semibold text-[13px] text-white">
              {MEAL_ICONS.lunch}
            </Text>
            <Text className="w-[54px] text-center font-inter-semibold text-[13px] text-white">
              {MEAL_ICONS.dinner}
            </Text>
          </View>

          {optOutRows.map((row, index) => (
            <View
              key={row.consumerId}
              className={`flex-row items-center border-b-[0.5px] border-slate-300 ${index % 2 === 0 ? "bg-[#E2E8F0]" : "bg-slate-200"}`}
            >
              <Text
                className="w-[140px] py-3 pl-3 font-inter text-sm text-slate-900"
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
  );
};
