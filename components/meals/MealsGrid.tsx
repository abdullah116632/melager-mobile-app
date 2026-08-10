import Feather from "@expo/vector-icons/Feather";
import { useRef, type RefObject } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import {
  DAY_CELL_H,
  DAY_CELL_W,
  MEAL_TOTAL_DARK,
  NAME_COL_W,
  TOTAL_COL_W,
} from "@/constants/meal";
import type { Consumer } from "@/context/MessContext";
import type { useColors } from "@/hooks/useColors";
import type { ActiveMealCell } from "@/types/meal";
import { isMealDayToday } from "@/utils/meal";
import { mealStyles as styles } from "./mealStyles";
import { MealsEmptyState } from "./MealsEmptyState";

interface MealsGridProps {
  colors: ReturnType<typeof useColors>;
  consumers: Consumer[];
  yearMonth: string;
  days: number[];
  isAdmin: boolean;
  activeCell: ActiveMealCell | null;
  selectedCell: ActiveMealCell | null;
  inputValue: string;
  fillMode: boolean;
  refreshing: boolean;
  bottomPadding: number;
  headerScrollRef: RefObject<ScrollView | null>;
  bodyScrollRef: RefObject<ScrollView | null>;
  outerScrollRef: RefObject<ScrollView | null>;
  activeCellInputRef: RefObject<TextInput | null>;
  getMealCount: (yearMonth: string, consumerId: string, day: number) => number;
  getConsumerTotal: (yearMonth: string, consumerId: string) => number;
  getDayTotal: (yearMonth: string, day: number) => number;
  getGrandTotal: (yearMonth: string) => number;
  onHeaderScroll: () => void;
  onBodyScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onOuterScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onRefresh: () => void;
  onInputChange: (value: string) => void;
  onInputBlur: () => void;
  onSubmitEditing: () => void;
  onFillHandlePress: () => void;
  onCellPress: (consumerId: string, day: number) => void;
  onRemoveConsumer: (consumerId: string, consumerName: string) => void;
  onFillDrag: (consumerId: string, locationX: number) => void;
}

export const MealsGrid = ({
  colors,
  consumers,
  yearMonth,
  days,
  isAdmin,
  activeCell,
  selectedCell,
  inputValue,
  fillMode,
  refreshing,
  bottomPadding,
  headerScrollRef,
  bodyScrollRef,
  outerScrollRef,
  activeCellInputRef,
  getMealCount,
  getConsumerTotal,
  getDayTotal,
  getGrandTotal,
  onHeaderScroll,
  onBodyScroll,
  onOuterScroll,
  onRefresh,
  onInputChange,
  onInputBlur,
  onSubmitEditing,
  onFillHandlePress,
  onCellPress,
  onRemoveConsumer,
  onFillDrag,
}: MealsGridProps) => {
  const fillHandleScale = useRef(new Animated.Value(1)).current;
  const tableWidth = NAME_COL_W + days.length * DAY_CELL_W + TOTAL_COL_W;

  if (consumers.length === 0) return <MealsEmptyState colors={colors} />;

  const animateFillHandle = (
    scale: number,
    speed: number,
    bounciness: number,
  ) =>
    Animated.spring(fillHandleScale, {
      toValue: scale,
      useNativeDriver: false,
      speed,
      bounciness,
    }).start();

  const fillAtTouchPosition = (locationX: number, locationY: number) => {
    const rowIndex = Math.max(0, Math.floor(locationY / DAY_CELL_H));
    const consumerId = consumers[Math.min(rowIndex, consumers.length - 1)]?.id;
    if (consumerId) onFillDrag(consumerId, locationX);
  };

  return (
    <KeyboardAvoidingView
      style={styles.gridWrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <ScrollView
          ref={headerScrollRef}
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onHeaderScroll}
          scrollEventThrottle={16}
          style={styles.flex}
          contentContainerStyle={{ width: tableWidth, flexDirection: "row" }}
        >
          <View
            style={[
              styles.cornerCell,
              { width: NAME_COL_W, backgroundColor: colors.primary },
            ]}
          />
          {days.map((day) => (
            <View
              key={day}
              style={[
                styles.headerDayCell,
                { backgroundColor: colors.primary },
                isMealDayToday(yearMonth, day) && {
                  backgroundColor: colors.accent,
                },
              ]}
            >
              <Text style={styles.headerDayText}>{day}</Text>
            </View>
          ))}
          <View
            style={[
              styles.totalHeaderCell,
              { backgroundColor: MEAL_TOTAL_DARK },
            ]}
          >
            <Text style={styles.totalHeaderText}>Total</Text>
          </View>
        </ScrollView>
        <View
          pointerEvents="none"
          style={[
            styles.frozenHeaderCell,
            {
              width: NAME_COL_W,
              backgroundColor: colors.primary,
              borderRightColor: colors.border,
            },
          ]}
        >
          <View style={styles.cornerDiagonal} />
          <Text style={styles.cornerDateText}>Date</Text>
          <Text style={styles.cornerConsumerText}>Consumers</Text>
        </View>
      </View>

      <ScrollView
        ref={outerScrollRef}
        onScroll={onOuterScroll}
        scrollEventThrottle={16}
        automaticallyAdjustKeyboardInsets={false}
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={MEAL_TOTAL_DARK}
            colors={[MEAL_TOTAL_DARK]}
          />
        }
      >
        <View style={{ height: (consumers.length + 1) * DAY_CELL_H + 4 }}>
          <ScrollView
            ref={bodyScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onBodyScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!fillMode}
            contentContainerStyle={{
              width: tableWidth,
              flexDirection: "column",
            }}
            style={{ height: (consumers.length + 1) * DAY_CELL_H + 4 }}
          >
            {consumers.map((consumer, index) => (
              <View
                key={consumer.id}
                style={[
                  styles.dataRow,
                  {
                    backgroundColor:
                      index % 2 === 0 ? colors.card : colors.rowAlt,
                    borderBottomColor: colors.border,
                    width: tableWidth,
                  },
                ]}
              >
                <View style={[styles.nameCell, { width: NAME_COL_W }]} />
                {days.map((day) => {
                  const count = getMealCount(yearMonth, consumer.id, day);
                  const isActive =
                    activeCell?.consumerId === consumer.id &&
                    activeCell.day === day;
                  const isSelected =
                    !isActive &&
                    selectedCell?.consumerId === consumer.id &&
                    selectedCell.day === day;

                  if (isActive) {
                    return (
                      <View
                        key={day}
                        style={[
                          styles.dayCell,
                          styles.activeDayCell,
                          { borderColor: colors.primary },
                        ]}
                      >
                        <TextInput
                          ref={activeCellInputRef}
                          value={inputValue}
                          onChangeText={onInputChange}
                          onBlur={onInputBlur}
                          onSubmitEditing={onSubmitEditing}
                          keyboardType="number-pad"
                          returnKeyType="next"
                          style={[
                            styles.cellInput,
                            { color: colors.primary, paddingRight: 16 },
                          ]}
                          maxLength={2}
                          selectTextOnFocus
                        />
                        {isAdmin && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            hitSlop={8}
                            style={styles.fillHandlePressable}
                            onPressIn={() => {
                              onFillHandlePress();
                              animateFillHandle(0.85, 40, 4);
                            }}
                            onPressOut={() => animateFillHandle(1, 24, 8)}
                          >
                            <Animated.View
                              pointerEvents="none"
                              style={[
                                styles.fillHandleBtn,
                                {
                                  backgroundColor: "#fff",
                                  borderColor: colors.primary,
                                  shadowColor: colors.primary,
                                  transform: [{ scale: fillHandleScale }],
                                },
                              ]}
                            >
                              <Feather
                                name="copy"
                                size={10}
                                color={colors.primary}
                              />
                            </Animated.View>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayCell,
                        count > 0 && {
                          backgroundColor: colors.cellFilled,
                        },
                        isMealDayToday(yearMonth, day) && styles.todayCell,
                        fillMode && styles.fillModeCell,
                        isSelected && {
                          borderColor: colors.primary,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => onCellPress(consumer.id, day)}
                      activeOpacity={isAdmin ? (fillMode ? 0.5 : 0.65) : 1}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          {
                            color:
                              count > 0
                                ? colors.cellFilledText
                                : colors.mutedForeground,
                            fontWeight: count > 0 ? "700" : "400",
                          },
                        ]}
                      >
                        {count > 0 ? count.toString() : "-"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <View
                  style={[
                    styles.rowTotalCell,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Text
                    style={[styles.rowTotalText, { color: colors.primary }]}
                  >
                    {getConsumerTotal(yearMonth, consumer.id)}
                  </Text>
                </View>
              </View>
            ))}

            <View
              style={[
                styles.totalRow,
                { backgroundColor: colors.primary, width: tableWidth },
              ]}
            >
              <View style={[styles.totalNameCell, { width: NAME_COL_W }]} />
              {days.map((day) => {
                const total = getDayTotal(yearMonth, day);
                return (
                  <View key={day} style={styles.dayTotalCell}>
                    <Text style={[styles.dayTotalText, styles.whiteText]}>
                      {total > 0 ? total.toString() : "-"}
                    </Text>
                  </View>
                );
              })}
              <View
                style={[
                  styles.grandTotalCell,
                  { backgroundColor: MEAL_TOTAL_DARK },
                ]}
              >
                <Text style={[styles.grandTotalText, styles.whiteText]}>
                  {getGrandTotal(yearMonth)}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View
            pointerEvents="box-none"
            style={[styles.frozenNameColumn, { width: NAME_COL_W }]}
          >
            {consumers.map((consumer, index) => (
              <TouchableOpacity
                key={consumer.id}
                style={[
                  styles.nameCell,
                  {
                    width: NAME_COL_W,
                    backgroundColor:
                      index % 2 === 0 ? colors.card : colors.rowAlt,
                    borderRightColor: colors.border,
                    borderBottomColor: colors.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
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
            ))}
            <View
              style={[
                styles.totalNameCell,
                {
                  width: NAME_COL_W,
                  backgroundColor: colors.primary,
                  borderRightColor: "rgba(255,255,255,0.2)",
                },
              ]}
            >
              <Text style={[styles.totalNameText, styles.whiteText]}>
                Total
              </Text>
            </View>
          </View>

          {fillMode && isAdmin && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: tableWidth,
                height: consumers.length * DAY_CELL_H + (DAY_CELL_H + 4),
                zIndex: 10,
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) =>
                fillAtTouchPosition(
                  event.nativeEvent.locationX,
                  event.nativeEvent.locationY,
                )
              }
              onResponderMove={(event) =>
                fillAtTouchPosition(
                  event.nativeEvent.locationX,
                  event.nativeEvent.locationY,
                )
              }
            />
          )}
        </View>
        <View pointerEvents="none" style={styles.keyboardScrollSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
