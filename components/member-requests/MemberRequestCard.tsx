import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth, useNotifications } from "@/redux/hooks";
import {
  acceptMemberRequest,
  rejectMemberRequest,
} from "@/services/memberRequestService";
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

interface MemberRequestCardProps {
  request: MemberRequest;
  onResolved: (requestId: number) => void;
}

export const MemberRequestCard = ({
  request,
  onResolved,
}: MemberRequestCardProps) => {
  const { token, refreshMe } = useAuth();
  const { refreshCount } = useNotifications();
  const [acting, setActing] = useState(false);
  const avatarClassName =
    AVATAR_CLASS_BY_COLOR[getAvatarColor(request.name)] ?? "bg-teal-600";

  const handleAccept = async () => {
    if (!token) return;
    setActing(true);
    try {
      await acceptMemberRequest(request.id, token);
      onResolved(request.id);
      await refreshMe();
      await refreshCount();
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    } catch {
      // Keep the existing silent failure behavior.
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;
    setActing(true);
    try {
      await rejectMemberRequest(request.id, token);
      onResolved(request.id);
      await refreshCount();
    } catch {
      // Keep the existing silent failure behavior.
    } finally {
      setActing(false);
    }
  };

  return (
    <View className="gap-3 rounded-[14px] border border-slate-200 bg-white p-3.5">
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
          onPress={() => void handleReject()}
          disabled={acting}
          activeOpacity={0.8}
        >
          {acting ? (
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
          onPress={() => void handleAccept()}
          disabled={acting}
          activeOpacity={0.8}
        >
          {acting ? (
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
};
