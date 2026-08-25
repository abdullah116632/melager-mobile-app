import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { MemberRequestList } from "@/components/member-requests/MemberRequestList";
import { MemberRequestSearch } from "@/components/member-requests/MemberRequestSearch";
import { MemberRequestsEmptyState } from "@/components/member-requests/MemberRequestsEmptyState";
import { MemberRequestsHeader } from "@/components/member-requests/MemberRequestsHeader";
import { useAuth } from "@/redux/hooks";
import { useNotifications } from "@/redux/hooks";
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
  return (
    <View
      className={`flex-1 bg-slate-50 ${Platform.OS === "web" ? "" : "pt-safe"}`}
    >
      <MemberRequestsHeader
        loading={loading}
        totalRequests={requests.length}
        onBack={onBack}
        onRefresh={() => void fetchRequests()}
      />
      <MemberRequestSearch value={search} onChange={setSearch} />

      {loading ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : requests.length === 0 ? (
        <MemberRequestsEmptyState variant="empty" />
      ) : filteredRequests.length === 0 ? (
        <MemberRequestsEmptyState variant="no-results" />
      ) : (
        <MemberRequestList
          requests={filteredRequests}
          search={search}
          actingOn={actingOn}
          onAccept={(requestId) => void handleAccept(requestId)}
          onReject={(requestId) => void handleReject(requestId)}
        />
      )}
    </View>
  );
};
