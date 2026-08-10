import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import type { DepositEntry } from "@/types/deposit";
import type { AppColors } from "@/types/theme";
import {
  formatDepositAmount,
  formatDepositTimestamp,
  getDepositTotal,
} from "@/utils/deposit";
import { depositStyles as styles } from "./depositStyles";

interface DepositHistoryModalProps {
  visible: boolean;
  colors: AppColors;
  consumerName: string;
  entries: DepositEntry[];
  isAdmin: boolean;
  deletingId: number | null;
  onDelete: (entryId: number) => void;
  onClose: () => void;
}

export const DepositHistoryModal = ({
  visible,
  colors,
  consumerName,
  entries,
  isAdmin,
  deletingId,
  onDelete,
  onClose,
}: DepositHistoryModalProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.flex} />
      </TouchableOpacity>
      <View
        style={[
          styles.bottomSheet,
          styles.historySheet,
          { backgroundColor: colors.card },
        ]}
      >
        <View
          style={[styles.sheetHandle, { backgroundColor: colors.border }]}
        />
        <View style={styles.historyHeader}>
          <Text
            style={[
              styles.sheetTitle,
              styles.sheetTitleNoMargin,
              { color: colors.foreground },
            ]}
          >
            Deposits — {consumerName}
          </Text>
          <Text style={[styles.historyTotal, { color: DEPOSIT_PRIMARY }]}>
            ৳{formatDepositAmount(getDepositTotal(entries))}
          </Text>
        </View>

        {entries.length === 0 ? (
          <Text
            style={[
              styles.emptySubtitle,
              { color: colors.mutedForeground, marginTop: 16 },
            ]}
          >
            No deposits this month.
          </Text>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id.toString()}
            style={styles.historyList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View
                style={[styles.entryRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.entryDotColumn}>
                  <View style={styles.dot} />
                </View>
                <View style={styles.entryContent}>
                  <Text
                    style={[styles.entryAmount, { color: DEPOSIT_PRIMARY }]}
                  >
                    ৳{formatDepositAmount(item.amount)}
                  </Text>
                  <Text
                    style={[
                      styles.entryDate,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {formatDepositTimestamp(item.depositedAt)}
                  </Text>
                  {item.note ? (
                    <Text
                      style={[
                        styles.entryNote,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {item.note}
                    </Text>
                  ) : null}
                </View>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={() => onDelete(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Feather name="trash-2" size={16} color="#DC2626" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )}

        <TouchableOpacity
          style={[
            styles.closeHistoryButton,
            { backgroundColor: DEPOSIT_PRIMARY },
          ]}
          onPress={onClose}
        >
          <Text style={styles.sheetButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);
