import Feather from "@expo/vector-icons/Feather";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DEPOSIT_NAME_COLUMN_WIDTH,
  DEPOSIT_PRIMARY,
  DEPOSIT_PRIMARY_DARK,
  DEPOSIT_TOTAL_COLUMN_WIDTH,
} from "@/constants/deposit";
import type { DepositConsumer, DepositEntry } from "@/types/deposit";
import type { AppColors } from "@/types/theme";
import {
  formatDepositAmount,
  getConsumerDepositEntries,
  getDepositTotal,
} from "@/utils/deposit";
import { depositStyles as styles } from "./depositStyles";

interface DepositsTableProps {
  colors: AppColors;
  consumers: DepositConsumer[];
  entries: DepositEntry[];
  isAdmin: boolean;
  refreshing: boolean;
  bottomPadding: number;
  onRefresh: () => void;
  onAddDeposit: (consumerId: string) => void;
  onOpenHistory: (consumerId: string) => void;
  onRemoveConsumer: (consumerId: string, consumerName: string) => void;
}

export const DepositsTable = ({
  colors,
  consumers,
  entries,
  isAdmin,
  refreshing,
  bottomPadding,
  onRefresh,
  onAddDeposit,
  onOpenHistory,
  onRemoveConsumer,
}: DepositsTableProps) => {
  const grandTotal = getDepositTotal(entries);

  if (consumers.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="users" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No consumers yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Add consumers from the Meals tab or tap + above
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View
        style={[
          styles.tableHeader,
          {
            borderBottomColor: colors.border,
            backgroundColor: DEPOSIT_PRIMARY_DARK,
          },
        ]}
      >
        <View style={[styles.nameColumn, { width: DEPOSIT_NAME_COLUMN_WIDTH }]}>
          <Text style={styles.headerText}>Consumers ({consumers.length})</Text>
        </View>
        <View
          style={[styles.totalColumn, { width: DEPOSIT_TOTAL_COLUMN_WIDTH }]}
        >
          <Text style={styles.headerText}>Total</Text>
        </View>
        <View style={[styles.depositsColumn, styles.compactDepositsColumn]}>
          <Text style={styles.headerText}>Deposits</Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DEPOSIT_PRIMARY}
            colors={[DEPOSIT_PRIMARY]}
          />
        }
      >
        {consumers.map((consumer, index) => {
          const consumerEntries = getConsumerDepositEntries(
            entries,
            consumer.id,
          );
          const total = getDepositTotal(consumerEntries);
          return (
            <View
              key={consumer.id}
              style={[
                styles.consumerRow,
                {
                  backgroundColor:
                    index % 2 === 0 ? colors.card : colors.rowAlt,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.nameColumn,
                  {
                    width: DEPOSIT_NAME_COLUMN_WIDTH,
                    borderRightColor: colors.border,
                  },
                ]}
                onLongPress={() => onRemoveConsumer(consumer.id, consumer.name)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.nameText, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {consumer.name}
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.totalColumn,
                  {
                    width: DEPOSIT_TOTAL_COLUMN_WIDTH,
                    borderRightColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.totalText,
                    {
                      color:
                        total > 0 ? DEPOSIT_PRIMARY : colors.mutedForeground,
                    },
                  ]}
                >
                  ৳{formatDepositAmount(total)}
                </Text>
              </View>

              <View
                style={[
                  styles.depositsColumn,
                  { borderRightColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  style={styles.dotsArea}
                  onPress={() =>
                    consumerEntries.length > 0
                      ? onOpenHistory(consumer.id)
                      : undefined
                  }
                  activeOpacity={consumerEntries.length > 0 ? 0.7 : 1}
                >
                  {consumerEntries.length === 0 ? (
                    <Text
                      style={[
                        styles.noDepositsText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      No deposits
                    </Text>
                  ) : (
                    <View style={styles.dotsWrapper}>
                      {consumerEntries.map((entry) => (
                        <View key={entry.id} style={styles.dot} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
                {isAdmin && (
                  <TouchableOpacity
                    style={[
                      styles.plusButton,
                      { backgroundColor: DEPOSIT_PRIMARY },
                    ]}
                    onPress={() => onAddDeposit(consumer.id)}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <View
          style={[
            styles.grandTotalRow,
            { backgroundColor: DEPOSIT_PRIMARY_DARK },
          ]}
        >
          <View
            style={[styles.nameColumn, { width: DEPOSIT_NAME_COLUMN_WIDTH }]}
          >
            <Text style={styles.grandTotalLabel}>Total</Text>
          </View>
          <View
            style={[styles.totalColumn, { width: DEPOSIT_TOTAL_COLUMN_WIDTH }]}
          >
            <Text style={styles.grandTotalText}>
              ৳{formatDepositAmount(grandTotal)}
            </Text>
          </View>
          <View style={[styles.depositsColumn, styles.compactDepositsColumn]} />
        </View>
      </ScrollView>
    </View>
  );
};
