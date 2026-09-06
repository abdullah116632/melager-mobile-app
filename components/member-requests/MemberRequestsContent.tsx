import Feather from "@expo/vector-icons/Feather";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useAuth, useNetwork, useNotifications } from "@/redux/hooks";
import { getMemberRequests } from "@/services/memberRequestService";
import type { MemberRequest } from "@/types/memberRequest";
import { MemberRequestList } from "./MemberRequestList";
import { MemberRequestSearch } from "./MemberRequestSearch";
import { MemberRequestsHeader } from "./MemberRequestsHeader";

interface MemberRequestsContentProps {
  onBack: () => void;
}

type Toast = { type: "success" | "error"; message: string };

export const MemberRequestsContent = ({
  onBack,
}: MemberRequestsContentProps) => {
  const { token, activeMess } = useAuth();
  const { refreshCount } = useNotifications();
  const { isOnline } = useNetwork();
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");

  const showToast = (next: Toast) => {
    setToast(next);
    setTimeout(() => setToast(null), 2200);
  };

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

  const handlePullToRefresh = async () => {
    if (!token || !activeMess) return;

    if (!isOnline) {
      showToast({
        type: "error",
        message: "Refresh failed. Check your internet connection.",
      });
      return;
    }

    setRefreshing(true);
    try {
      const nextRequests = await getMemberRequests(token, activeMess.id);
      setRequests(nextRequests);
      await refreshCount();
      showToast({ type: "success", message: "Member requests refreshed" });
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Refresh failed. Please try again.",
      });
    } finally {
      setRefreshing(false);
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
      />
      <MemberRequestSearch value={search} onChange={setSearch} />

      <MemberRequestList
        requests={filteredRequests}
        totalCount={requests.length}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => void handlePullToRefresh()}
        search={search}
        onResolved={removeResolvedRequest}
      />

      {toast && (
        <View
          pointerEvents="none"
          className="absolute bottom-8 left-0 right-0 z-50 items-center"
        >
          <View
            className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 shadow-md ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 shadow-emerald-900/15"
                : "border-red-200 bg-red-50 shadow-red-900/15"
            }`}
          >
            <Feather
              name={toast.type === "success" ? "check-circle" : "alert-circle"}
              size={15}
              color={toast.type === "success" ? "#059669" : "#DC2626"}
            />
            <Text
              className={`font-inter-semibold text-xs ${
                toast.type === "success" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {toast.message}
            </Text>
          </View>
        </View>
      )}
    </>
  );
};
