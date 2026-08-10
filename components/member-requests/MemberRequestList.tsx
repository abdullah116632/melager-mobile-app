import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { MemberRequest } from "@/types/memberRequest";
import type { AppColors } from "@/types/theme";
import { getAvatarColor, getInitials } from "@/utils/memberRequest";
import { memberRequestStyles as styles } from "./memberRequestStyles";

interface MemberRequestListProps {
  colors: AppColors;
  requests: MemberRequest[];
  search: string;
  actingOn: number | null;
  bottomPadding: number;
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
}

export const MemberRequestList = ({
  colors,
  requests,
  search,
  actingOn,
  bottomPadding,
  onAccept,
  onReject,
}: MemberRequestListProps) => {
  const hasQuery = search.trim().length > 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>
        {requests.length} {requests.length === 1 ? "request" : "requests"}
        {hasQuery ? ` matching "${search.trim()}"` : " pending"}
      </Text>

      {requests.map((request) => {
        const isActing = actingOn === request.id;

        return (
          <View
            key={request.id}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardIdentity}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: getAvatarColor(request.name) },
                ]}
              >
                <Text style={styles.avatarText}>
                  {getInitials(request.name)}
                </Text>
              </View>
              <View style={styles.identityText}>
                <Text
                  style={[styles.name, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {request.name}
                </Text>
                {request.email ? (
                  <Text
                    style={[styles.email, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {request.email}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => onReject(request.id)}
                disabled={isActing}
                activeOpacity={0.8}
              >
                {isActing ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Feather name="x" size={15} color="#DC2626" />
                    <Text style={styles.rejectText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => onAccept(request.id)}
                disabled={isActing}
                activeOpacity={0.8}
              >
                {isActing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={15} color="#fff" />
                    <Text style={styles.acceptText}>Accept</Text>
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
