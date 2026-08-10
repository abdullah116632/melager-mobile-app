import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { MemberRequest } from "@/types/memberRequest";
import { getAvatarColor, getInitials } from "@/utils/memberRequest";

const AVATAR_CLASS_BY_COLOR: Record<string, string> = {
  "#0D9488": "bg-teal-600",
  "#0284C7": "bg-sky-600",
  "#7C3AED": "bg-violet-600",
  "#DB2777": "bg-pink-600",
  "#EA580C": "bg-orange-600",
  "#059669": "bg-emerald-600",
};

interface MemberRequestListProps {
  requests: MemberRequest[];
  search: string;
  actingOn: number | null;
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
}

export const MemberRequestList = ({
  requests,
  search,
  actingOn,
  onAccept,
  onReject,
}: MemberRequestListProps) => {
  const hasQuery = search.trim().length > 0;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-3 px-4 pb-safe-offset-6 pt-4"
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-1 font-inter-medium text-xs tracking-[0.3px] text-slate-500">
        {requests.length} {requests.length === 1 ? "request" : "requests"}
        {hasQuery ? ` matching "${search.trim()}"` : " pending"}
      </Text>

      {requests.map((request) => {
        const isActing = actingOn === request.id;
        const avatarClassName =
          AVATAR_CLASS_BY_COLOR[getAvatarColor(request.name)] ?? "bg-teal-600";

        return (
          <View
            key={request.id}
            className="gap-3 rounded-[14px] border border-slate-200 bg-white p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View
                className={`h-[46px] w-[46px] items-center justify-center rounded-full ${avatarClassName}`}
              >
                <Text className="font-inter-bold text-base text-white">
                  {getInitials(request.name)}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  className="font-inter-semibold text-[15px] text-slate-900"
                  numberOfLines={1}
                >
                  {request.name}
                </Text>
                {request.email ? (
                  <Text
                    className="mt-0.5 font-inter text-xs text-slate-500"
                    numberOfLines={1}
                  >
                    {request.email}
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="flex-row gap-2.5">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] border border-red-200 bg-red-50 py-2.5"
                onPress={() => onReject(request.id)}
                disabled={isActing}
                activeOpacity={0.8}
              >
                {isActing ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Feather name="x" size={15} color="#DC2626" />
                    <Text className="font-inter-semibold text-[13px] text-red-600">
                      Reject
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-teal-700 py-2.5"
                onPress={() => onAccept(request.id)}
                disabled={isActing}
                activeOpacity={0.8}
              >
                {isActing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={15} color="#fff" />
                    <Text className="font-inter-semibold text-[13px] text-white">
                      Accept
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};
