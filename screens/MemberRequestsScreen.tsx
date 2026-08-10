import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MemberRequestList } from "@/components/member-requests/MemberRequestList";
import { MemberRequestSearch } from "@/components/member-requests/MemberRequestSearch";
import { MemberRequestsEmptyState } from "@/components/member-requests/MemberRequestsEmptyState";
import { MemberRequestsHeader } from "@/components/member-requests/MemberRequestsHeader";
import { memberRequestStyles as styles } from "@/components/member-requests/memberRequestStyles";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";
import {
  acceptMemberRequest,
  getMemberRequests,
  rejectMemberRequest,
} from "@/services/memberRequestService";
import type { MemberRequest } from "@/types/memberRequest";

interface MemberRequestsScreenProps {
  onBack: () => void;
}

export const MemberRequestsScreen = ({ onBack }: MemberRequestsScreenProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, refreshMe, activeMess } = useAuth();
  const { refreshCount } = useNotifications();
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!token || !activeMess) return;
    setLoading(true);
    try {
      const nextRequests = await getMemberRequests(token, activeMess.id);
      setRequests(nextRequests);
      await refreshCount();
    } catch {
      // Keep the existing silent failure behavior.
    } finally {
      setLoading(false);
    }
  }, [token, activeMess?.id, refreshCount]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleAccept = async (requestId: number) => {
    if (!token) return;
    setActingOn(requestId);
    try {
      await acceptMemberRequest(requestId, token);
      setRequests((current) =>
        current.filter((request) => request.id !== requestId),
      );
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
      setActingOn(null);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!token) return;
    setActingOn(requestId);
    try {
      await rejectMemberRequest(requestId, token);
      setRequests((current) =>
        current.filter((request) => request.id !== requestId),
      );
      await refreshCount();
    } catch {
      // Keep the existing silent failure behavior.
    } finally {
      setActingOn(null);
    }
  };

  const query = search.trim().toLowerCase();
  const filteredRequests = requests.filter((request) => {
    if (!query) return true;
    return (
      request.name.toLowerCase().includes(query) ||
      (request.email?.toLowerCase().includes(query) ?? false)
    );
  });
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPadding },
      ]}
    >
      <MemberRequestsHeader
        colors={colors}
        onBack={onBack}
        onRefresh={() => void fetchRequests()}
      />
      <MemberRequestSearch
        colors={colors}
        value={search}
        onChange={setSearch}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : requests.length === 0 ? (
        <MemberRequestsEmptyState colors={colors} variant="empty" />
      ) : filteredRequests.length === 0 ? (
        <MemberRequestsEmptyState colors={colors} variant="no-results" />
      ) : (
        <MemberRequestList
          colors={colors}
          requests={filteredRequests}
          search={search}
          actingOn={actingOn}
          bottomPadding={insets.bottom + 24}
          onAccept={(requestId) => void handleAccept(requestId)}
          onReject={(requestId) => void handleReject(requestId)}
        />
      )}
    </View>
  );
};
