import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth, useNotifications } from "@/redux/hooks";
import { getMemberRequests } from "@/services/memberRequestService";
import type { MemberRequest } from "@/types/memberRequest";
import { MemberRequestList } from "./MemberRequestList";
import { MemberRequestSearch } from "./MemberRequestSearch";
import { MemberRequestsEmptyState } from "./MemberRequestsEmptyState";
import { MemberRequestsHeader } from "./MemberRequestsHeader";

interface MemberRequestsContentProps {
  onBack: () => void;
}

export const MemberRequestsContent = ({
  onBack,
}: MemberRequestsContentProps) => {
  const { token, activeMess } = useAuth();
  const { refreshCount } = useNotifications();
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [loading, setLoading] = useState(true);
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

  const query = search.trim().toLowerCase();
  const filteredRequests = requests.filter((request) => {
    if (!query) return true;
    return (
      request.name.toLowerCase().includes(query) ||
      (request.email?.toLowerCase().includes(query) ?? false)
    );
  });

  const removeResolvedRequest = (requestId: number) => {
    setRequests((current) =>
      current.filter((request) => request.id !== requestId),
    );
  };

  return (
    <>
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
          onResolved={removeResolvedRequest}
        />
      )}
    </>
  );
};
