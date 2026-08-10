import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CONSUMER_DELETE_COLUMN_WIDTH,
  CONSUMER_EMAIL_COLUMN_WIDTH,
  CONSUMER_NAME_COLUMN_WIDTH,
  CONSUMER_PHONE_COLUMN_WIDTH,
} from "@/constants/consumerTable";
import type { Consumer } from "@/types/consumer";
import type { AppColors } from "@/types/theme";
import { consumerStyles as styles } from "./consumerStyles";

type ConsumerTableSectionProps = {
  label: string;
  consumers: Consumer[];
  colors: AppColors;
  copiedId: string | null;
  onCopy: (value: string, key: string, label: string) => void;
  topMargin?: boolean;
  isAdmin: boolean;
  onDelete: (consumer: Consumer) => void;
  deletingId: number | null;
};

export const ConsumerTableSection = ({
  label,
  consumers,
  colors,
  copiedId,
  onCopy,
  topMargin = false,
  isAdmin,
  onDelete,
  deletingId,
}: ConsumerTableSectionProps) => (
  <View style={[styles.section, topMargin && styles.sectionWithTopMargin]}>
    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
      {label}
    </Text>

    <View
      style={[
        styles.tableCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
      >
        <View>
          <View
            style={[
              styles.theadRow,
              {
                backgroundColor: colors.secondary,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.thCell, { width: CONSUMER_NAME_COLUMN_WIDTH }]}
            >
              <Text style={[styles.th, { color: colors.mutedForeground }]}>
                NAME
              </Text>
            </View>
            <View
              style={[
                styles.thCell,
                styles.borderedCell,
                {
                  width: CONSUMER_EMAIL_COLUMN_WIDTH,
                  borderLeftColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.th, { color: colors.mutedForeground }]}>
                EMAIL
              </Text>
            </View>
            <View
              style={[
                styles.thCell,
                styles.borderedCell,
                {
                  width: CONSUMER_PHONE_COLUMN_WIDTH,
                  borderLeftColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.th, { color: colors.mutedForeground }]}>
                PHONE
              </Text>
            </View>
            {isAdmin && (
              <View
                style={[
                  styles.thCell,
                  styles.borderedCell,
                  styles.centeredCell,
                  {
                    width: CONSUMER_DELETE_COLUMN_WIDTH,
                    borderLeftColor: colors.border,
                  },
                ]}
              />
            )}
          </View>

          {consumers.map((consumer, index) => (
            <View
              key={consumer.id}
              style={[
                styles.tRow,
                { borderTopColor: colors.border },
                index === 0 && styles.firstRow,
              ]}
            >
              <View
                style={[styles.tdCell, { width: CONSUMER_NAME_COLUMN_WIDTH }]}
              >
                <Text
                  style={[styles.tdName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {consumer.name}
                </Text>
                <Text
                  style={[
                    styles.tdBadge,
                    {
                      color: consumer.userId ? colors.primary : "#94A3B8",
                    },
                  ]}
                >
                  {consumer.userId ? "● Registered" : "● Manual"}
                </Text>
              </View>

              <View
                style={[
                  styles.tdCell,
                  styles.borderedCell,
                  {
                    width: CONSUMER_EMAIL_COLUMN_WIDTH,
                    borderLeftColor: colors.border,
                  },
                ]}
              >
                {consumer.email ? (
                  <View style={styles.copyRow}>
                    <Text
                      style={[styles.tdText, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {consumer.email}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.copyBtn,
                        { backgroundColor: colors.secondary },
                      ]}
                      onPress={() =>
                        onCopy(consumer.email!, `email-${consumer.id}`, "Email")
                      }
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather
                        name={
                          copiedId === `email-${consumer.id}` ? "check" : "copy"
                        }
                        size={13}
                        color={
                          copiedId === `email-${consumer.id}`
                            ? "#16A34A"
                            : colors.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text
                    style={[styles.tdEmpty, { color: colors.mutedForeground }]}
                  >
                    —
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.tdCell,
                  styles.borderedCell,
                  {
                    width: CONSUMER_PHONE_COLUMN_WIDTH,
                    borderLeftColor: colors.border,
                  },
                ]}
              >
                {consumer.mobileNumber ? (
                  <View style={styles.copyRow}>
                    <Text
                      style={[styles.tdText, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {consumer.mobileNumber}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.copyBtn,
                        { backgroundColor: colors.secondary },
                      ]}
                      onPress={() =>
                        onCopy(
                          consumer.mobileNumber!,
                          `phone-${consumer.id}`,
                          "Phone",
                        )
                      }
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather
                        name={
                          copiedId === `phone-${consumer.id}` ? "check" : "copy"
                        }
                        size={13}
                        color={
                          copiedId === `phone-${consumer.id}`
                            ? "#16A34A"
                            : colors.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text
                    style={[styles.tdEmpty, { color: colors.mutedForeground }]}
                  >
                    —
                  </Text>
                )}
              </View>

              {isAdmin && (
                <View
                  style={[
                    styles.tdCell,
                    styles.borderedCell,
                    styles.deleteCell,
                    {
                      width: CONSUMER_DELETE_COLUMN_WIDTH,
                      borderLeftColor: colors.border,
                    },
                  ]}
                >
                  {deletingId === consumer.id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : consumer.isAdmin ? (
                    <Feather
                      name="shield"
                      size={15}
                      color={colors.mutedForeground}
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => onDelete(consumer)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={15} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  </View>
);
