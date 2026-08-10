import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import type { MessHubJoinRequest } from "@/types/messHub";
import { messHubStyles as styles } from "./messHubStyles";

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
    <View style={[styles.card, styles.requestCard]}>
      <View style={styles.cardLeft}>
        <View
          style={[
            styles.messIconCircle,
            { backgroundColor: isPending ? "#FFFBEB" : "#FEF2F2" },
          ]}
        >
          <Feather
            name={isPending ? "clock" : "x-circle"}
            size={20}
            color={isPending ? "#D97706" : "#DC2626"}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.messName} numberOfLines={1}>
            {request.messName}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isPending ? "#FFFBEB" : "#FEF2F2",
                borderColor: isPending ? "#FDE68A" : "#FECACA",
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isPending ? "#92400E" : "#991B1B" },
              ]}
            >
              {isPending ? "Pending approval" : "Request rejected"}
            </Text>
          </View>
        </View>
      </View>

      {!isPending && (
        <TouchableOpacity
          style={[styles.retryButton, retrying && styles.retryButtonDisabled]}
          onPress={() => onRetry(request)}
          disabled={retrying}
          activeOpacity={0.8}
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#7C3AED" />
          ) : (
            <>
              <Feather name="refresh-cw" size={13} color="#7C3AED" />
              <Text style={styles.retryButtonText}>Request Again</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};
