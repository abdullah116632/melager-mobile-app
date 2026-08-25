import { ScrollView, Text } from "react-native";
import type { MemberRequest } from "@/types/memberRequest";
import { MemberRequestCard } from "./MemberRequestCard";

interface MemberRequestListProps {
  requests: MemberRequest[];
  search: string;
  onResolved: (requestId: number) => void;
}

export const MemberRequestList = ({
  requests,
  search,
  onResolved,
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

      {requests.map((request) => (
        <MemberRequestCard
          key={request.id}
          request={request}
          onResolved={onResolved}
        />
      ))}
    </ScrollView>
  );
};
