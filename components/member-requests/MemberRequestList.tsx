import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import type { MemberRequest } from "@/types/memberRequest";
import { MemberRequestCard } from "./MemberRequestCard";
import { MemberRequestsEmptyState } from "./MemberRequestsEmptyState";

interface MemberRequestListProps {
  requests: MemberRequest[];
  totalCount: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  search: string;
  onResolved: (requestId: number) => void;
}

export const MemberRequestList = ({
  requests,
  totalCount,
  loading,
  refreshing,
  onRefresh,
  search,
  onResolved,
}: MemberRequestListProps) => {
  const hasQuery = search.trim().length > 0;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow gap-3 px-4 pb-safe-offset-6 pt-4"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0F766E"
          colors={["#0F766E"]}
        />
      }
    >
      {loading ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : totalCount === 0 ? (
        <MemberRequestsEmptyState variant="empty" />
      ) : requests.length === 0 ? (
        <MemberRequestsEmptyState variant="no-results" />
      ) : (
        <>
          <Text className="mb-1 font-inter-medium text-xs tracking-[0.3px] text-slate-500">
            {requests.length} {requests.length === 1 ? "request" : "requests"}
            {hasQuery ? ` matching "${search.trim()}"` : " pending"}
          </Text>

          {requests.map((request) => (
            <MemberRequestCard
              key={request.id}
              request={request}
              onResolved={onResolved}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
};
