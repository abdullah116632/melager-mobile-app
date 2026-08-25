import { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/redux/hooks";
import { JoinRequestCard } from "./JoinRequestCard";
import { MessCard } from "./MessCard";
import { MessHubEmptyState } from "./MessHubEmptyState";
import { MessHubErrorBanner } from "./MessHubErrorBanner";

export const MessHubActivity = () => {
  const { messes, requests } = useAuth();
  const [retryError, setRetryError] = useState("");
  const hasNoActivity = messes.length === 0 && requests.length === 0;

  return (
    <>
      {retryError ? <MessHubErrorBanner message={retryError} /> : null}

      {messes.length > 0 && (
        <View className="mb-2 gap-2.5">
          <Text className="mb-1 px-0.5 font-inter-semibold text-[11px] tracking-[0.8px] text-gray-500">
            MY MESSES
          </Text>
          {messes.map((mess) => (
            <MessCard key={mess.id} mess={mess} />
          ))}
        </View>
      )}

      {requests.length > 0 && (
        <View className="mb-2 gap-2.5">
          <Text className="mb-1 px-0.5 font-inter-semibold text-[11px] tracking-[0.8px] text-gray-500">
            JOIN REQUESTS
          </Text>
          {requests.map((request) => (
            <JoinRequestCard
              key={request.id}
              request={request}
              onRetryErrorChange={setRetryError}
            />
          ))}
        </View>
      )}

      {hasNoActivity && <MessHubEmptyState />}
    </>
  );
};
