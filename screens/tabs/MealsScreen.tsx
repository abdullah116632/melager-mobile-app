import React, { useState, useRef, useCallback } from "react";
import {
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Pressable,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";

import { useMess } from "@/context/MessContext";
import { useAuth } from "@/context/AuthContext";
import { useDrawer } from "@/context/DrawerContext";
import MonthPicker from "@/components/MonthPicker";
import { AddMealConsumerModal } from "@/components/meals/AddMealConsumerModal";
import { MealFillBanner } from "@/components/meals/MealFillBanner";
import { MealsHeader } from "@/components/meals/MealsHeader";
import { MealsGrid } from "@/components/meals/MealsGrid";
import { DAY_CELL_W, NAME_COL_W, TOTAL_COL_W } from "@/constants/meal";
import type { ActiveMealCell, MealCellDirection } from "@/types/meal";

export const MealsScreen = () => {
  const { width: windowWidth } = useWindowDimensions();
  const [gridViewportWidth, setGridViewportWidth] = useState(windowWidth);
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const isAdmin = role === "admin";
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

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMonth().catch(() => {});
    setRefreshing(false);
  }, [refreshMonth]);

  const [showAddConsumer, setShowAddConsumer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addError, setAddError] = useState("");

  // Inline editing state
  const [activeCell, setActiveCell] = useState<ActiveMealCell | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputValueRef = useRef("");
  const isFillHandlePress = useRef(false);

  // The cell currently "selected" by the user. Independent of `activeCell`
  // (the cell whose TextInput is open for editing): the arrows in the
  // date bar move this even when nothing is being edited, so the user can
  // navigate the grid with arrow taps alone.
  const [selectedCell, setSelectedCell] = useState<ActiveMealCell | null>(null);

  // Fill mode state
  const [fillMode, setFillMode] = useState(false);
  const [fillValue, setFillValue] = useState(0);

  // Single shared horizontal scroll: body is the source of truth, header
  // is a mirror that follows body offset. bodyScrollX.current lets the
  // fill-drag overlay translate locationX (viewport-relative) into the
  // absolute X position inside the scrolled content.
  const headerScrollRef = useRef<ScrollView>(null);
  const bodyScrollX = useRef(0);
  const isSyncing = useRef(false);

  // Auto-save debounce
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for active-cell TextInput
  const activeCellInputRef = useRef<TextInput | null>(null);
  const isSubmittingRef = useRef(false);

  // Body horizontal scroll ref — used to re-pin the shared scroll after
  // a cell activation, because React Native's auto-scroll-into-view (and
  // the keyboard focus observer) can yank the scroller back to the left
  // when the TextInput mounts inside it.
  const bodyScrollRef = useRef<ScrollView | null>(null);
  const outerScrollRef = useRef<ScrollView | null>(null);
  const outerScrollY = useRef(0);
  const scrollBeforeActivateXRef = useRef<number | null>(null);
  const scrollBeforeActivateYRef = useRef<number | null>(null);

  // Timestamp gate: while `Date.now()` is below this value, body scroll
  // events are ignored for the header sync so that RN's
  // auto-scroll-into-view (which fires after TextInput focus) cannot push
  // the header away from the user's pinned position.
  const activationLockUntil = useRef<number>(0);
  const verticalActivationLockUntil = useRef<number>(0);

  const daysCount = getDaysInMonth(currentYearMonth);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const tableWidth = NAME_COL_W + daysCount * DAY_CELL_W + TOTAL_COL_W;
  const maxBodyScrollX = Math.max(0, tableWidth - gridViewportWidth);

  const handleBodyScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = e.nativeEvent;
      // Use the ScrollView's measured dimensions for the live boundary. The
      // grid can be narrower than the window (safe-area/navigation layouts),
      // and a window-based limit leaves scrollable space after the Total
      // column has reached the right edge.
      const measuredMaxX = Math.max(
        0,
        tableWidth - layoutMeasurement.width,
      );
      const x = Math.min(Math.max(contentOffset.x, 0), measuredMaxX);
      bodyScrollX.current = x;

      if (Math.abs(contentOffset.x - x) > 0.5) {
        bodyScrollRef.current?.scrollTo({ x, animated: false });
      }
      // While the activation pin is in effect, ignore body scroll events
      // so RN's auto-scroll-into-view (triggered by the TextInput focus)
      // does not yank the header. The pin logic re-asserts the user's
      // intended X with its own scrollTo calls.
      if (activationLockUntil.current > Date.now()) return;
      if (isSyncing.current) return;
      isSyncing.current = true;
      headerScrollRef.current?.scrollTo({ x, animated: false });
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    },
    [tableWidth],
  );

  const handleOuterScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (verticalActivationLockUntil.current > Date.now()) return;
      outerScrollY.current = e.nativeEvent.contentOffset.y;
    },
    [],
  );

  const restoreGridPosition = useCallback(() => {
    const requestedX = scrollBeforeActivateXRef.current ?? bodyScrollX.current;
    const x = Math.min(Math.max(requestedX, 0), maxBodyScrollX);
    const y = scrollBeforeActivateYRef.current ?? outerScrollY.current;
    bodyScrollRef.current?.scrollTo({ x, animated: false });
    headerScrollRef.current?.scrollTo({ x, animated: false });
    outerScrollRef.current?.scrollTo({ y, animated: false });
    bodyScrollX.current = x;
    outerScrollY.current = y;
  }, [maxBodyScrollX]);

  React.useEffect(() => {
    const clampedX = Math.min(Math.max(bodyScrollX.current, 0), maxBodyScrollX);
    if (Math.abs(bodyScrollX.current - clampedX) <= 0.5) return;

    bodyScrollX.current = clampedX;
    bodyScrollRef.current?.scrollTo({ x: clampedX, animated: false });
    headerScrollRef.current?.scrollTo({ x: clampedX, animated: false });
  }, [maxBodyScrollX]);

  // Header ScrollView is scrollEnabled={false} but its onScroll still fires
  // when we programmatically scrollTo it. This is a defensive RAF guard.
  const handleSlaveScroll = useCallback(() => {
    /* no-op; body is source of truth */
  }, []);

  // ── Inline editing ────────────────────────────────────────────────────────

  // TextInput is no longer inside any per-row horizontal ScrollView, but
  // the TextInput still lives inside the SHARED horizontal ScrollView.
  // When we set activeCell, React remounts a TextInput in that scroll's
  // tree, and React Native's keyboard/focus observer will auto-scroll the
  // nearest scrollable ancestor to bring the input into view — yanking
  // the table back to x=0. We snapshot the current body scroll X BEFORE
  // setting activeCell, then restore it after the TextInput mounts and
  // receives focus. On web we pass preventScroll so the browser doesn't
  // scroll either.
  const activateCell = (consumerId: string, day: number) => {
    const existing = getMealCount(currentYearMonth, consumerId, day);
    const val = existing > 0 ? existing.toString() : "";
    scrollBeforeActivateXRef.current = bodyScrollX.current;
    scrollBeforeActivateYRef.current = outerScrollY.current;
    setActiveCell({ consumerId, day });
    setInputValue(val);
    inputValueRef.current = val;
    // Selecting a cell also moves the "selected cell" cursor so that the
    // arrow-key pad in the date bar has a coherent target.
    setSelectedCell({ consumerId, day });
  };

  // Focus the active-cell input, then re-pin both grid axes to their exact
  // pre-focus offsets. Repeating the pin through the keyboard transition
  // defeats React Native's deferred auto-scroll-to-input behavior.
  React.useEffect(() => {
    if (!activeCell) return;
    const input = activeCellInputRef.current;
    if (!input) return;
    if (Platform.OS === "web") {
      (input as unknown as HTMLInputElement).focus({ preventScroll: true });
      return;
    }
    input.focus();
    const pin = restoreGridPosition;
    // Lock the body→header sync for ~500ms so RN's auto-scroll-into-view
    // cannot push the header around during the focus settling window.
    activationLockUntil.current = Date.now() + 900;
    verticalActivationLockUntil.current = Date.now() + 900;
    pin();
    let raf2 = 0,
      raf3 = 0;
    const raf1 = requestAnimationFrame(() => {
      pin();
      raf2 = requestAnimationFrame(() => {
        pin();
        raf3 = requestAnimationFrame(pin);
      });
    });
    const keyboardPin = setTimeout(pin, 350);
    const finalPin = setTimeout(pin, 750);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      cancelAnimationFrame(raf3);
      clearTimeout(keyboardPin);
      clearTimeout(finalPin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCell?.consumerId, activeCell?.day]);

  const saveCurrentCell = (cid: string, d: number) => {
    const num = Math.max(0, parseInt(inputValueRef.current) || 0);
    setMeal(currentYearMonth, cid, d, num);
    return num;
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    inputValueRef.current = text;
    // Auto-save after 400ms of no typing
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (activeCell) {
      const { consumerId, day } = activeCell;
      autoSaveTimer.current = setTimeout(() => {
        const num = Math.max(0, parseInt(inputValueRef.current) || 0);
        setMeal(currentYearMonth, consumerId, day, num);
      }, 400);
    }
  };

  const handleBlur = () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    if (!activeCell) return;
    // Skip blur handling when Enter key triggered a cell-to-cell navigation
    if (isSubmittingRef.current) return;
    if (isFillHandlePress.current) {
      isFillHandlePress.current = false;
      return;
    }
    const { consumerId, day } = activeCell;
    saveCurrentCell(consumerId, day);
    setActiveCell(null);
    setInputValue("");
    inputValueRef.current = "";
    // Closing the editor also clears the arrow-pad selection so the next
    // tap doesn't re-light the same cell.
    setSelectedCell(null);
  };

  const handleSubmitEditing = () => {
    if (!activeCell) return;
    isSubmittingRef.current = true;
    const { consumerId, day } = activeCell;
    saveCurrentCell(consumerId, day);
    const consumerIndex = consumers.findIndex(
      (consumer) => consumer.id === consumerId,
    );
    if (consumerIndex >= 0 && consumerIndex < consumers.length - 1) {
      // Enter follows the spreadsheet's vertical flow: stay on the same
      // date and open the cell for the consumer directly below.
      activateCell(consumers[consumerIndex + 1].id, day);
    } else {
      setActiveCell(null);
      setInputValue("");
      inputValueRef.current = "";
    }
    if (Platform.OS !== "web") Haptics.selectionAsync();
    // Reset after the blur event has had a chance to fire and be skipped
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 150);
  };

  // ── Arrow-pad cell navigation ───────────────────────────────────────────
  // The 4 arrows in the date bar move the cell the user is editing onto
  // the neighbour cell in the chosen direction. Two important rules:
  //   1. If a TextInput is open (activeCell), the typed value is saved to
  //      THAT cell first so nothing is lost, then the editor is moved to
  //      the new cell (TextInput re-mounts there, prefilled with that
  //      cell's existing meal value).
  //   2. If no cell is being edited, arrows still move the `selectedCell`
  //      cursor so the user can navigate without committing — but typing
  //      without tapping first remains impossible (no TextInput is open).
  const moveSelectedCell = useCallback(
    (dir: MealCellDirection) => {
      if (consumers.length === 0) return;
      const cur = selectedCell;
      if (!cur) return;

      // Persist any in-progress edit on the current active cell before
      // moving away from it.
      if (activeCell) {
        const num = Math.max(0, parseInt(inputValueRef.current) || 0);
        setMeal(currentYearMonth, activeCell.consumerId, activeCell.day, num);
        if (autoSaveTimer.current) {
          clearTimeout(autoSaveTimer.current);
          autoSaveTimer.current = null;
        }
      }

      const curIdx = consumers.findIndex((c) => c.id === cur.consumerId);
      if (curIdx < 0) return;

      let nextConsumerId = cur.consumerId;
      let nextDay = cur.day;

      if (dir === "up") {
        const prevIdx = Math.max(0, curIdx - 1);
        nextConsumerId = consumers[prevIdx].id;
      } else if (dir === "down") {
        const nextIdx = Math.min(consumers.length - 1, curIdx + 1);
        nextConsumerId = consumers[nextIdx].id;
      } else if (dir === "left") {
        nextDay = Math.max(1, cur.day - 1);
      } else {
        nextDay = Math.min(daysCount, cur.day + 1);
      }

      // Update the visual selection cursor…
      setSelectedCell({ consumerId: nextConsumerId, day: nextDay });
      // …and, if the user was mid-edit, move the TextInput to the new cell
      // by replacing activeCell. activateCell() snapshots the scroll X,
      // re-activates focus, and preloads the destination cell's existing
      // meal value so the user can keep typing without re-typing.
      if (activeCell) {
        activateCell(nextConsumerId, nextDay);
      }

      if (Platform.OS !== "web") Haptics.selectionAsync();
    },
    [activeCell, consumers, daysCount, currentYearMonth, selectedCell, setMeal],
  );

  // ── Outside-tap deselection ────────────────────────────────────────────
  // Called when the user taps anywhere that isn't a cell: page header,
  // month picker area, fill banner, empty state, gaps between cards.
  // Saves any in-progress edit value, closes the editor, and clears the
  // arrow-pad selection so the arrows dim until the user picks a new cell.
  const deselectAll = useCallback(() => {
    if (activeCell) {
      const num = Math.max(0, parseInt(inputValueRef.current) || 0);
      setMeal(currentYearMonth, activeCell.consumerId, activeCell.day, num);
      setActiveCell(null);
      setInputValue("");
      inputValueRef.current = "";
    }
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    if (selectedCell) setSelectedCell(null);
  }, [activeCell, selectedCell, currentYearMonth, setMeal]);

  const handleFillHandlePress = () => {
    if (!activeCell) return;
    const { consumerId, day } = activeCell;
    const saved = saveCurrentCell(consumerId, day);
    setFillValue(saved);
    setFillMode(true);
    setActiveCell(null);
    setInputValue("");
    inputValueRef.current = "";
    // isFillHandlePress.current is reset by handleBlur after it returns early
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCellPress = (consumerId: string, day: number) => {
    if (!isAdmin) return;
    if (fillMode) {
      setMeal(currentYearMonth, consumerId, day, fillValue);
      if (Platform.OS !== "web") Haptics.selectionAsync();
    } else {
      activateCell(consumerId, day);
    }
  };

  const exitFillMode = () => {
    setFillMode(false);
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Fill-drag overlay is a single body-wide absoluteFill View (not per-row).
  // locationX is the viewport-relative touch x; we add bodyScrollX to get the
  // absolute x inside the scrolled content, then subtract NAME_COL_W so day 1
  // starts at the first day cell.
  const handleFillDrag = useCallback(
    (consumerId: string, locationX: number) => {
      const xInContent = locationX + bodyScrollX.current;
      const day = Math.floor((xInContent - NAME_COL_W) / DAY_CELL_W) + 1;
      if (day >= 1 && day <= daysCount) {
        setMeal(currentYearMonth, consumerId, day, fillValue);
      }
    },
    [fillValue, daysCount, currentYearMonth, setMeal],
  );

  // ── Consumer management ───────────────────────────────────────────────────

  const handleAddConsumer = async () => {
    const trimmed = newName.trim();
    const emailTrimmed = newEmail.trim();
    const phoneTrimmed = newPhone.trim() || undefined;
    setAddError("");
    if (!trimmed) {
      setAddError("Name is required.");
      return;
    }
    if (!emailTrimmed) {
      setAddError("Email is required.");
      return;
    }
    if (phoneTrimmed && phoneTrimmed.length !== 11) {
      setAddError("Phone must be exactly 11 digits.");
      return;
    }
    try {
      await addConsumer(trimmed, emailTrimmed, phoneTrimmed);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setAddError("");
      setShowAddConsumer(false);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add consumer.");
    }
  };

  const handleRemoveConsumer = (id: string, name: string) => {
    if (!isAdmin) return;
    Alert.alert("Remove Consumer", `Remove "${name}" from the mess?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeConsumer(id);
        },
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

  return (
    <Pressable
      className={`flex-1 bg-[#F4F8FC] ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
      onPress={deselectAll}
      android_disableSound
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
        isAdmin={isAdmin}
        onMenu={openDrawer}
        onAddConsumer={() => setShowAddConsumer(true)}
      />

      <MonthPicker
        variant="dashboard"
        onCellLeft={isAdmin ? () => moveSelectedCell("left") : undefined}
        onCellRight={isAdmin ? () => moveSelectedCell("right") : undefined}
        onCellUp={isAdmin ? () => moveSelectedCell("up") : undefined}
        onCellDown={isAdmin ? () => moveSelectedCell("down") : undefined}
        cellNavEnabled={isAdmin && !!selectedCell}
      />

      <MealFillBanner
        visible={fillMode}
        value={fillValue}
        onDone={exitFillMode}
      />

      <MealsGrid
        consumers={consumers}
        yearMonth={currentYearMonth}
        days={days}
        isAdmin={isAdmin}
        activeCell={activeCell}
        selectedCell={selectedCell}
        inputValue={inputValue}
        fillMode={fillMode}
        refreshing={refreshing}
        viewportWidth={gridViewportWidth}
        onViewportWidthChange={setGridViewportWidth}
        headerScrollRef={headerScrollRef}
        bodyScrollRef={bodyScrollRef}
        outerScrollRef={outerScrollRef}
        activeCellInputRef={activeCellInputRef}
        getMealCount={getMealCount}
        getConsumerTotal={getConsumerTotal}
        getDayTotal={getDayTotal}
        getGrandTotal={getGrandTotal}
        onHeaderScroll={handleSlaveScroll}
        onBodyScroll={handleBodyScroll}
        onOuterScroll={handleOuterScroll}
        onRefresh={() => void onRefresh()}
        onInputChange={handleInputChange}
        onInputBlur={handleBlur}
        onSubmitEditing={handleSubmitEditing}
        onFillHandlePress={() => {
          isFillHandlePress.current = true;
          handleFillHandlePress();
        }}
        onCellPress={handleCellPress}
        onRemoveConsumer={handleRemoveConsumer}
        onFillDrag={handleFillDrag}
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
    </Pressable>
  );
};
