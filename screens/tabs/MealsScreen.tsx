import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MonthPicker from "@/components/MonthPicker";
import { AddMealConsumerModal } from "@/components/meals/AddMealConsumerModal";
import {
  MealCellEditor,
  type MealCellEditorHandle,
} from "@/components/meals/MealCellEditor";
import { MealsGrid } from "@/components/meals/MealsGrid";
import { MealsHeader } from "@/components/meals/MealsHeader";
import { DAY_CELL_W, NAME_COL_W, TOTAL_COL_W } from "@/constants/meal";
import { useAuth } from "@/context/AuthContext";
import { useDrawer } from "@/context/DrawerContext";
import { useMess } from "@/context/MessContext";
import type { ActiveMealCell, MealCellDirection } from "@/types/meal";

export const MealsScreen = () => {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const { openDrawer } = useDrawer();
  const {
    consumers,
    currentYearMonth,
    addConsumer,
    removeConsumer,
    getMealCount,
    setMeal,
    getConsumerTotal,
    getDayTotal,
    getGrandTotal,
    getDaysInMonth,
    refreshMonth,
  } = useMess();

  const isAdmin = role === "admin";
  const [refreshing, setRefreshing] = useState(false);
  const [gridViewportWidth, setGridViewportWidth] = useState(windowWidth);
  const [selectedCell, setSelectedCell] = useState<ActiveMealCell | null>(null);
  const [showAddConsumer, setShowAddConsumer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addError, setAddError] = useState("");

  const headerScrollRef = useRef<ScrollView | null>(null);
  const bodyScrollRef = useRef<ScrollView | null>(null);
  const bodyScrollXRef = useRef(0);
  const isSyncingRef = useRef(false);
  const editorRef = useRef<MealCellEditorHandle | null>(null);

  const daysCount = getDaysInMonth(currentYearMonth);
  const days = useMemo(
    () => Array.from({ length: daysCount }, (_, index) => index + 1),
    [daysCount],
  );
  const tableWidth = NAME_COL_W + daysCount * DAY_CELL_W + TOTAL_COL_W;

  useEffect(() => {
    setSelectedCell(null);
  }, [currentYearMonth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMonth().catch(() => {});
    setRefreshing(false);
  }, [refreshMonth]);

  const handleBodyScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      const maximumX = Math.max(0, tableWidth - layoutMeasurement.width);
      const x = Math.min(Math.max(contentOffset.x, 0), maximumX);
      bodyScrollXRef.current = x;
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      headerScrollRef.current?.scrollTo({ x, animated: false });
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    },
    [tableWidth],
  );

  const handleHeaderScroll = useCallback(() => {
    // The body is the only horizontal-scroll source.
  }, []);

  const keepSelectedDayVisible = useCallback(
    (day: number) => {
      const currentX = bodyScrollXRef.current;
      const cellLeft = NAME_COL_W + (day - 1) * DAY_CELL_W;
      const cellRight = cellLeft + DAY_CELL_W;
      const visibleLeft = currentX + NAME_COL_W;
      const visibleRight = currentX + gridViewportWidth - TOTAL_COL_W;
      let nextX = currentX;
      if (cellLeft < visibleLeft) {
        nextX = Math.max(0, cellLeft - NAME_COL_W);
      } else if (cellRight > visibleRight) {
        nextX = Math.min(
          Math.max(0, tableWidth - gridViewportWidth),
          cellRight - gridViewportWidth + TOTAL_COL_W,
        );
      }
      if (Math.abs(nextX - currentX) > 0.5) {
        bodyScrollXRef.current = nextX;
        bodyScrollRef.current?.scrollTo({ x: nextX, animated: true });
        headerScrollRef.current?.scrollTo({ x: nextX, animated: true });
      }
    },
    [gridViewportWidth, tableWidth],
  );

  const selectCell = useCallback((consumerId: string, day: number) => {
    setSelectedCell({ consumerId, day });
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, []);

  const saveSelectedValue = useCallback(
    (value: number) => {
      if (!selectedCell) return;
      setMeal(
        currentYearMonth,
        selectedCell.consumerId,
        selectedCell.day,
        value,
      );
    },
    [currentYearMonth, selectedCell, setMeal],
  );

  const copyAndMove = useCallback(
    (direction: MealCellDirection) => {
      if (!selectedCell || consumers.length === 0) return;
      const consumerIndex = consumers.findIndex(
        (consumer) => consumer.id === selectedCell.consumerId,
      );
      if (consumerIndex < 0) return;

      let nextConsumerIndex = consumerIndex;
      let nextDay = selectedCell.day;
      if (direction === "left") nextDay = Math.max(1, nextDay - 1);
      if (direction === "right") nextDay = Math.min(daysCount, nextDay + 1);
      if (direction === "up") {
        nextConsumerIndex = Math.max(0, consumerIndex - 1);
      }
      if (direction === "down") {
        nextConsumerIndex = Math.min(consumers.length - 1, consumerIndex + 1);
      }

      const nextConsumerId = consumers[nextConsumerIndex]?.id;
      if (
        !nextConsumerId ||
        (nextConsumerId === selectedCell.consumerId &&
          nextDay === selectedCell.day)
      ) {
        return;
      }

      const value =
        editorRef.current?.commitNow() ??
        getMealCount(
          currentYearMonth,
          selectedCell.consumerId,
          selectedCell.day,
        );
      setMeal(currentYearMonth, nextConsumerId, nextDay, value);
      setSelectedCell({ consumerId: nextConsumerId, day: nextDay });
      requestAnimationFrame(() => keepSelectedDayVisible(nextDay));
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    },
    [
      consumers,
      currentYearMonth,
      daysCount,
      getMealCount,
      keepSelectedDayVisible,
      selectedCell,
      setMeal,
    ],
  );

  const handleAddConsumer = async () => {
    const name = newName.trim();
    const email = newEmail.trim();
    const phone = newPhone.trim() || undefined;
    setAddError("");
    if (!name) {
      setAddError("Name is required.");
      return;
    }
    if (!email) {
      setAddError("Email is required.");
      return;
    }
    if (phone && phone.length !== 11) {
      setAddError("Phone must be exactly 11 digits.");
      return;
    }
    try {
      const { invitationSent } = await addConsumer(name, email, phone);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setShowAddConsumer(false);
      if (invitationSent) {
        Alert.alert(
          "Member added",
          "This person already has a Melager account and has been added to this mess. We emailed the mess key for reference.",
        );
      }
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    } catch (error) {
      setAddError(
        error instanceof Error ? error.message : "Failed to add consumer.",
      );
    }
  };

  const handleRemoveConsumer = (id: string, name: string) => {
    if (!isAdmin) return;
    Alert.alert("Remove Consumer", `Remove "${name}" from the mess?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => removeConsumer(id),
      },
    ]);
  };

  const closeAddConsumer = () => {
    setShowAddConsumer(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setAddError("");
  };

  const selectedConsumer = selectedCell
    ? consumers.find((consumer) => consumer.id === selectedCell.consumerId)
    : null;
  const selectedValue =
    selectedCell && selectedConsumer
      ? getMealCount(
          currentYearMonth,
          selectedCell.consumerId,
          selectedCell.day,
        )
      : 0;

  return (
    <View
      className={`flex-1 bg-[#F4F8FC] ${
        Platform.OS === "web" ? "pt-[67px]" : "pt-safe"
      }`}
    >
      <StatusBar style="light" backgroundColor="#075F5B" />
      {Platform.OS !== "web" && (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-0 z-50 bg-[#075F5B]"
          style={{ height: insets.top }}
        />
      )}
      <MealsHeader
        totalMeals={getGrandTotal(currentYearMonth)}
        isAdmin={isAdmin}
        onMenu={openDrawer}
        onAddConsumer={() => setShowAddConsumer(true)}
      />

      <MonthPicker
        variant="dashboard"
        onCellLeft={isAdmin ? () => copyAndMove("left") : undefined}
        onCellRight={isAdmin ? () => copyAndMove("right") : undefined}
        onCellUp={isAdmin ? () => copyAndMove("up") : undefined}
        onCellDown={isAdmin ? () => copyAndMove("down") : undefined}
        cellNavEnabled={isAdmin && !!selectedCell}
      />

      {isAdmin && selectedCell && selectedConsumer && (
        <MealCellEditor
          key={`${currentYearMonth}:${selectedCell.consumerId}:${selectedCell.day}`}
          ref={editorRef}
          consumerName={selectedConsumer.name}
          day={selectedCell.day}
          initialValue={selectedValue}
          onSave={saveSelectedValue}
          onDone={() => setSelectedCell(null)}
        />
      )}

      <MealsGrid
        consumers={consumers}
        yearMonth={currentYearMonth}
        days={days}
        isAdmin={isAdmin}
        selectedCell={selectedCell}
        refreshing={refreshing}
        viewportWidth={gridViewportWidth}
        onViewportWidthChange={setGridViewportWidth}
        headerScrollRef={headerScrollRef}
        bodyScrollRef={bodyScrollRef}
        getMealCount={getMealCount}
        getConsumerTotal={getConsumerTotal}
        getDayTotal={getDayTotal}
        getGrandTotal={getGrandTotal}
        onHeaderScroll={handleHeaderScroll}
        onBodyScroll={handleBodyScroll}
        onRefresh={() => void onRefresh()}
        onCellPress={selectCell}
        onRemoveConsumer={handleRemoveConsumer}
      />

      <AddMealConsumerModal
        visible={showAddConsumer}
        bottomInset={insets.bottom}
        name={newName}
        email={newEmail}
        phone={newPhone}
        error={addError}
        onNameChange={setNewName}
        onEmailChange={setNewEmail}
        onPhoneChange={setNewPhone}
        onClose={closeAddConsumer}
        onSubmit={() => void handleAddConsumer()}
      />
    </View>
  );
};
