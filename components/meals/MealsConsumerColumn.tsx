import { Alert, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/redux/hooks";
import { useMess } from "@/redux/hooks";

const CONSUMER_ACCENTS = [
  "#059669",
  "#0284C7",
  "#7C3AED",
  "#EA580C",
  "#DB2777",
  "#CA8A04",
] as const;

const getConsumerNameColor = (consumerId: string) => {
  const hash = Array.from(consumerId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return CONSUMER_ACCENTS[hash % CONSUMER_ACCENTS.length];
};

interface MealsConsumerColumnProps {
  loading?: boolean;
  placeholderCount?: number;
}

export const MealsConsumerColumn = ({
  loading = false,
  placeholderCount = 8,
}: MealsConsumerColumnProps) => {
  const { role } = useAuth();
  const { consumers, removeConsumer } = useMess();
  const isAdmin = role === "admin";

  const removeSelectedConsumer = (consumerId: string, consumerName: string) => {
    if (!isAdmin) return;
    Alert.alert("Remove Consumer", `Remove "${consumerName}" from the mess?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => removeConsumer(consumerId),
      },
    ]);
  };

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 top-0 z-30 w-[110px] shadow-md shadow-black/10"
    >
      {loading
        ? Array.from({ length: placeholderCount }, (_, index) => (
            <View
              key={index}
              className={`h-[48px] w-[110px] justify-center border-b-[0.5px] border-r border-slate-200 px-3 ${
                index % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"
              }`}
            >
              <View className="h-2.5 w-16 rounded-full bg-slate-200" />
            </View>
          ))
        : consumers.map((consumer, index) => (
            <TouchableOpacity
              key={consumer.id}
              disabled={!isAdmin}
              className={`h-[48px] w-[110px] flex-row items-center border-b-[0.5px] border-r border-slate-200 px-3 ${
                index % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"
              }`}
              onLongPress={() =>
                removeSelectedConsumer(consumer.id, consumer.name)
              }
              activeOpacity={isAdmin ? 0.7 : 1}
            >
              <Text
                className="flex-1 font-inter-semibold text-[13px]"
                style={{ color: getConsumerNameColor(consumer.id) }}
                numberOfLines={1}
              >
                {consumer.name}
              </Text>
            </TouchableOpacity>
          ))}
      <View className="h-[52px] w-[110px] items-center justify-center border-r border-white/20 bg-[#08766E]">
        <Text className="font-inter-bold text-xs text-white">Total</Text>
      </View>
    </View>
  );
};
