import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, View } from "react-native";
import { MEAL_ICONS } from "@/constants/mealStatus";
import type { MealStatusConsumer } from "@/types/mealStatus";
import type { AppColors } from "@/types/theme";
import { mealStatusStyles as styles } from "./mealStatusStyles";

const MealCell = ({ opted }: { opted: boolean }) => (
  <View style={styles.thMeal}>
    {opted ? (
      <View style={styles.optedOutCell}>
        <Feather name="x" size={14} color="#DC2626" />
      </View>
    ) : (
      <View style={styles.activeCell}>
        <Feather name="check" size={14} color="#059669" />
      </View>
    )}
  </View>
);

interface MealOptOutTableProps {
  colors: AppColors;
  consumers: MealStatusConsumer[];
}

export const MealOptOutTable = ({
  colors,
  consumers,
}: MealOptOutTableProps) => {
  const optOutRows = consumers.filter(
    (consumer) => consumer.breakfast || consumer.lunch || consumer.dinner,
  );
  const hasOptOuts = optOutRows.length > 0;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
        Meal On/Off {hasOptOuts ? `(${optOutRows.length})` : ""}
      </Text>

      {!hasOptOuts ? (
        <View style={styles.emptyWrap}>
          <Feather name="check-circle" size={28} color="#059669" />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Everyone is eating — no meals turned off.
          </Text>
        </View>
      ) : (
        <View>
          <View
            style={[
              styles.tableRow,
              styles.tableHeader,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={[styles.thName, styles.thText]}>Name</Text>
            <Text style={[styles.thMeal, styles.thText]}>
              {MEAL_ICONS.breakfast}
            </Text>
            <Text style={[styles.thMeal, styles.thText]}>
              {MEAL_ICONS.lunch}
            </Text>
            <Text style={[styles.thMeal, styles.thText]}>
              {MEAL_ICONS.dinner}
            </Text>
          </View>

          {optOutRows.map((row, index) => (
            <View
              key={row.consumerId}
              style={[
                styles.tableRow,
                {
                  backgroundColor:
                    index % 2 === 0 ? colors.card : colors.rowAlt,
                  borderBottomColor: colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text
                style={[styles.tdName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {row.consumerName}
              </Text>
              <MealCell opted={row.breakfast} />
              <MealCell opted={row.lunch} />
              <MealCell opted={row.dinner} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
