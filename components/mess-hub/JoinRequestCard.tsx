import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import type { MessHubJoinRequest } from "@/types/messHub";

interface JoinRequestCardProps {
  request: MessHubJoinRequest;
  retrying: boolean;
  onRetry: (request: MessHubJoinRequest) => void;
}

export const JoinRequestCard = ({
  request,
  retrying,
  onRetry,
}: JoinRequestCardProps) => {
  const isPending = request.status === "pending";

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border-l-[3px] border-gray-200 bg-white p-3.5 shadow-sm shadow-black/[0.06]">
      <View className="flex-1 flex-row items-center gap-3">
        <View
          className={`h-[42px] w-[42px] items-center justify-center rounded-full ${isPending ? "bg-amber-50" : "bg-red-50"}`}
        >
          <Feather
            name={isPending ? "clock" : "x-circle"}
            size={20}
            color={isPending ? "#D97706" : "#DC2626"}
          />
        </View>
        <View className="flex-1 gap-[5px]">
          <Text
            className="font-inter-semibold text-[15px] text-gray-900"
            numberOfLines={1}
          >
            {request.messName}
          </Text>
          <View
            className={`self-start rounded-md border px-2 py-[3px] ${isPending ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}
          >
            <Text
              className={`font-inter-semibold text-[11px] ${isPending ? "text-amber-800" : "text-red-800"}`}
            >
              {isPending ? "Pending approval" : "Request rejected"}
            </Text>
          </View>
        </View>
      </View>

      {!isPending && (
        <TouchableOpacity
          className={`min-w-[116px] flex-row items-center justify-center gap-[5px] rounded-[10px] border border-violet-200 bg-purple-100 px-2.5 py-2 ${retrying ? "opacity-60" : "opacity-100"}`}
          onPress={() => onRetry(request)}
          disabled={retrying}
          activeOpacity={0.8}
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#7C3AED" />
          ) : (
            <>
              <Feather name="refresh-cw" size={13} color="#7C3AED" />
              <Text className="font-inter-semibold text-xs text-violet-700">
                Request Again
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};
