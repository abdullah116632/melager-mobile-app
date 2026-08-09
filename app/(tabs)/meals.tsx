import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useMess } from '@/context/MessContext';
import { useAuth } from '@/context/AuthContext';
import { useDrawer } from '@/context/DrawerContext';
import MonthPicker from '@/components/MonthPicker';
import { NotificationBell } from '@/components/NotificationBell';

const NAME_COL_W = 110;
const DAY_CELL_W = 48;
const DAY_CELL_H = 48;
const TOTAL_COL_W = 54;
const HEADER_H = 40;

interface ActiveCell {
  consumerId: string;
  day: number;
}

export default function MealSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
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
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addError, setAddError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Inline editing state
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputValueRef = useRef('');
  const isFillHandlePress = useRef(false);

  // The cell currently "selected" by the user. Independent of `activeCell`
  // (the cell whose TextInput is open for editing): the arrows in the
  // date bar move this even when nothing is being edited, so the user can
  // navigate the grid with arrow taps alone.
  const [selectedCell, setSelectedCell] = useState<ActiveCell | null>(null);

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

  // Animated value for the fill-handle button: subtle pulse while the
  // cell is active (so users notice it as a button) + scale-down on
  // press for tactile feedback.
  const fillHandleScale = useRef(new Animated.Value(1)).current;

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

  // Total width of the grid contents (name col + day cells + totals col).
  const TOTAL_TABLE_W = NAME_COL_W + daysCount * DAY_CELL_W + TOTAL_COL_W;

  const handleBodyScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    bodyScrollX.current = x;
    // While the activation pin is in effect, ignore body scroll events
    // so RN's auto-scroll-into-view (triggered by the TextInput focus)
    // does not yank the header. The pin logic re-asserts the user's
    // intended X with its own scrollTo calls.
    if (activationLockUntil.current > Date.now()) return;
    if (isSyncing.current) return;
    isSyncing.current = true;
    headerScrollRef.current?.scrollTo({ x, animated: false });
    requestAnimationFrame(() => { isSyncing.current = false; });
  }, []);

  const handleOuterScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (verticalActivationLockUntil.current > Date.now()) return;
    outerScrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  const restoreGridPosition = useCallback(() => {
    const x = scrollBeforeActivateXRef.current ?? bodyScrollX.current;
    const y = scrollBeforeActivateYRef.current ?? outerScrollY.current;
    bodyScrollRef.current?.scrollTo({ x, animated: false });
    headerScrollRef.current?.scrollTo({ x, animated: false });
    outerScrollRef.current?.scrollTo({ y, animated: false });
    bodyScrollX.current = x;
    outerScrollY.current = y;
  }, []);

  // Header ScrollView is scrollEnabled={false} but its onScroll still fires
  // when we programmatically scrollTo it. This is a defensive RAF guard.
  const handleSlaveScroll = useCallback(() => {
    /* no-op; body is source of truth */
  }, []);

  const isToday = (day: number) => {
    const now = new Date();
    const [year, month] = currentYearMonth.split('-').map(Number);
    return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
  };

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
    const val = existing > 0 ? existing.toString() : '';
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
    if (Platform.OS === 'web') {
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
    let raf2 = 0, raf3 = 0;
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

  // Track the on-screen keyboard height so the Add Consumer bottom sheet
  // can sit flush above it (otherwise the inputs are hidden behind the
  // keyboard on small screens).
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Press feedback is handled inline in the JSX (onPressIn / onPressOut)
  // so the original control flow (set isFillHandlePress → call
  // handleFillHandlePress → Animated.spring) stays in lockstep.

  // Press-scale only: button briefly shrinks when tapped.
  const fillHandleBtnAnimStyle = {
    transform: [{ scale: fillHandleScale }],
  };

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
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
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
    setInputValue('');
    inputValueRef.current = '';
    // Closing the editor also clears the arrow-pad selection so the next
    // tap doesn't re-light the same cell.
    setSelectedCell(null);
  };

  const handleSubmitEditing = () => {
    if (!activeCell) return;
    isSubmittingRef.current = true;
    const { consumerId, day } = activeCell;
    saveCurrentCell(consumerId, day);
    const consumerIndex = consumers.findIndex((consumer) => consumer.id === consumerId);
    if (consumerIndex >= 0 && consumerIndex < consumers.length - 1) {
      // Enter follows the spreadsheet's vertical flow: stay on the same
      // date and open the cell for the consumer directly below.
      activateCell(consumers[consumerIndex + 1].id, day);
    } else {
      setActiveCell(null);
      setInputValue('');
      inputValueRef.current = '';
    }
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    // Reset after the blur event has had a chance to fire and be skipped
    setTimeout(() => { isSubmittingRef.current = false; }, 150);
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
  const moveSelectedCell = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    if (consumers.length === 0) return;
    const cur = selectedCell;
    if (!cur) return;

    // Persist any in-progress edit on the current active cell before
    // moving away from it.
    if (activeCell) {
      const num = Math.max(0, parseInt(inputValueRef.current) || 0);
      setMeal(currentYearMonth, activeCell.consumerId, activeCell.day, num);
      if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    }

    const curIdx = consumers.findIndex((c) => c.id === cur.consumerId);
    if (curIdx < 0) return;

    let nextConsumerId = cur.consumerId;
    let nextDay = cur.day;

    if (dir === 'up') {
      const prevIdx = Math.max(0, curIdx - 1);
      nextConsumerId = consumers[prevIdx].id;
    } else if (dir === 'down') {
      const nextIdx = Math.min(consumers.length - 1, curIdx + 1);
      nextConsumerId = consumers[nextIdx].id;
    } else if (dir === 'left') {
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

    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }, [activeCell, consumers, daysCount, currentYearMonth, selectedCell, setMeal]);

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
      setInputValue('');
      inputValueRef.current = '';
    }
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    if (selectedCell) setSelectedCell(null);
  }, [activeCell, selectedCell, currentYearMonth, setMeal]);

  const handleFillHandlePress = () => {
    if (!activeCell) return;
    const { consumerId, day } = activeCell;
    const saved = saveCurrentCell(consumerId, day);
    setFillValue(saved);
    setFillMode(true);
    setActiveCell(null);
    setInputValue('');
    inputValueRef.current = '';
    // isFillHandlePress.current is reset by handleBlur after it returns early
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCellPress = (consumerId: string, day: number) => {
    if (!isAdmin) return;
    if (fillMode) {
      setMeal(currentYearMonth, consumerId, day, fillValue);
      if (Platform.OS !== 'web') Haptics.selectionAsync();
    } else {
      activateCell(consumerId, day);
    }
  };

  const exitFillMode = () => {
    setFillMode(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Fill-drag overlay is a single body-wide absoluteFill View (not per-row).
// locationX is the viewport-relative touch x; we add bodyScrollX to get the
// absolute x inside the scrolled content, then subtract NAME_COL_W so day 1
// starts at the first day cell.
const handleFillDrag = useCallback((consumerId: string, locationX: number) => {
    const xInContent = locationX + bodyScrollX.current;
    const day = Math.floor((xInContent - NAME_COL_W) / DAY_CELL_W) + 1;
    if (day >= 1 && day <= daysCount) {
      setMeal(currentYearMonth, consumerId, day, fillValue);
    }
  }, [fillValue, daysCount, currentYearMonth, setMeal]);

  // ── Consumer management ───────────────────────────────────────────────────

  const handleAddConsumer = async () => {
    const trimmed = newName.trim();
    const emailTrimmed = newEmail.trim();
    const phoneTrimmed = newPhone.trim() || undefined;
    setAddError('');
    if (!trimmed) { setAddError('Name is required.'); return; }
    if (!emailTrimmed) { setAddError('Email is required.'); return; }
    if (phoneTrimmed && phoneTrimmed.length !== 11) { setAddError('Phone must be exactly 11 digits.'); return; }
    try {
      await addConsumer(trimmed, emailTrimmed, phoneTrimmed);
      setNewName(''); setNewEmail(''); setNewPhone(''); setAddError('');
      setShowAddConsumer(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to add consumer.');
    }
  };

  const handleRemoveConsumer = (id: string, name: string) => {
    if (!isAdmin) return;
    Alert.alert('Remove Consumer', `Remove "${name}" from the mess?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { await removeConsumer(id); },
      },
    ]);
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 49;

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding }]}
      onPress={deselectAll}
      android_disableSound
    >
      {/* Page header */}
      <View style={[styles.pageHeader, { backgroundColor: colors.primary }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={openDrawer} activeOpacity={0.7}>
          <Feather name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: '#fff', flex: 1 }]}>Meal Tracker</Text>
        <NotificationBell />
        {isAdmin ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddConsumer(true)}>
            <Feather name="user-plus" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.viewOnlyBadge}>
            <Text style={styles.viewOnlyText}>View{`\n`}Only</Text>
          </View>
        )}
      </View>

      <MonthPicker
        onCellLeft={isAdmin ? () => moveSelectedCell('left') : undefined}
        onCellRight={isAdmin ? () => moveSelectedCell('right') : undefined}
        onCellUp={isAdmin ? () => moveSelectedCell('up') : undefined}
        onCellDown={isAdmin ? () => moveSelectedCell('down') : undefined}
        cellNavEnabled={isAdmin && !!selectedCell}
      />

      {/* Fill mode banner */}
      {fillMode && (
        <View style={[styles.fillBanner, { backgroundColor: colors.accent }]}>
          <Feather name="copy" size={14} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.fillBannerText}>
            Fill mode · value: <Text style={{ fontFamily: 'Inter_700Bold' }}>{fillValue}</Text>
            {' '}· Drag or tap cells to fill
          </Text>
          <TouchableOpacity style={styles.fillDoneBtn} onPress={exitFillMode}>
            <Text style={styles.fillDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {consumers.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No consumers yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Tap the icon above to add your first consumer
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.gridWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Sticky header row. The date/total cells mirror the body scroll;
              a fixed Consumer cell is layered above the moving corner. */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <ScrollView
              ref={headerScrollRef}
              horizontal
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              onScroll={handleSlaveScroll as any}
              scrollEventThrottle={16}
              style={{ flex: 1 }}
              contentContainerStyle={{
                width: TOTAL_TABLE_W,
                flexDirection: 'row',
              }}
            >
              <View style={[styles.cornerCell, { width: NAME_COL_W, backgroundColor: colors.primary }]} />
              {days.map((day) => (
                <View
                  key={day}
                  style={[
                    styles.headerDayCell,
                    { backgroundColor: colors.primary },
                    isToday(day) && { backgroundColor: colors.accent },
                  ]}
                >
                  <Text style={styles.headerDayText}>{day}</Text>
                </View>
              ))}
              <View style={[styles.totalHeaderCell, { backgroundColor: '#0a5954' }]}>
                <Text style={styles.totalHeaderText}>Total</Text>
              </View>
            </ScrollView>
            <View
              pointerEvents="none"
              style={[
                styles.frozenHeaderCell,
                { width: NAME_COL_W, backgroundColor: colors.primary, borderRightColor: colors.border },
              ]}
            >
              <View style={styles.cornerDiagonal} />
              <Text style={styles.cornerDateText}>Date</Text>
              <Text style={styles.cornerConsumerText}>Consumers</Text>
            </View>
          </View>

          {/* Body — outer vertical ScrollView contains ONE inner horizontal
              ScrollView. The wrapper View gives the inner ScrollView an
              explicit height so it doesn't collapse in a nested-scroll
              layout. Each row inside the horizontal scroller is a
              flexDirection:'row' View (name cell + day cells + row total);
              rows stack vertically by the horizontal scroller's default
              column flex direction. Whole table moves as one rigid block. */}
          <ScrollView
            ref={outerScrollRef}
            onScroll={handleOuterScroll}
            scrollEventThrottle={16}
            automaticallyAdjustKeyboardInsets={false}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomPadding }}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a5954" colors={['#0a5954']} />}
          >
            <View style={{ height: (consumers.length + 1) * DAY_CELL_H + 4 }}>
            <ScrollView
              ref={bodyScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={handleBodyScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={!fillMode}
              contentContainerStyle={{
                width: TOTAL_TABLE_W,
                // CRITICAL: a horizontal ScrollView's content container
                // defaults to flexDirection:'row' which lays children side
                // by side along the scroll axis. We need a vertical column
                // so consumer rows stack one below another inside the
                // horizontal scroller's content. Each row is itself a
                // flexDirection:'row' View containing name cell + day
                // cells + row total laid out left-to-right.
                flexDirection: 'column',
              }}
              style={{ height: (consumers.length + 1) * DAY_CELL_H + 4 }}
            >
              {consumers.map((consumer, idx) => {
                const consumerTotal = getConsumerTotal(currentYearMonth, consumer.id);
                return (
                  <View
                    key={consumer.id}
                    style={[
                      styles.dataRow,
                      { backgroundColor: idx % 2 === 0 ? colors.card : colors.rowAlt },
                      { borderBottomColor: colors.border },
                      { width: TOTAL_TABLE_W },
                    ]}
                  >
                    {/* Width-preserving spacer under the frozen name cell. */}
                    <View style={[styles.nameCell, { width: NAME_COL_W }]} />

                    {/* Day cells */}
                    {days.map((day) => {
                      const count = getMealCount(currentYearMonth, consumer.id, day);
                      const isActive =
                        activeCell?.consumerId === consumer.id && activeCell?.day === day;
                      // The cell currently pointed at by the arrow pad. When
                      // it isn't being edited (no TextInput open) we give it
                      // a soft outline so the user can see the cursor.
                      const isSelected =
                        !isActive &&
                        selectedCell?.consumerId === consumer.id &&
                        selectedCell?.day === day;

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
                              ref={(r) => { activeCellInputRef.current = r; }}
                              value={inputValue}
                              onChangeText={handleInputChange}
                              onBlur={handleBlur}
                              onSubmitEditing={handleSubmitEditing}
                              keyboardType="number-pad"
                              returnKeyType="next"
                              style={[
                                styles.cellInput,
                                { color: colors.primary, paddingRight: 16 },
                              ]}
                              maxLength={2}
                              selectTextOnFocus
                            />
                            {/* Fill handle — admin only.
                                Same control flow as the original: set the
                                guard ref, then call handleFillHandlePress().
                                Just an icon — no halo, no surrounding
                                animation. Tappable via the cell's
                                bottom-right corner. */}
                            {isAdmin && (
                              <TouchableOpacity
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                style={styles.fillHandlePressable}
                                onPressIn={() => {
                                  isFillHandlePress.current = true;
                                  handleFillHandlePress();
                                  Animated.spring(fillHandleScale, {
                                    toValue: 0.85,
                                    useNativeDriver: false,
                                    speed: 40,
                                    bounciness: 4,
                                  }).start();
                                }}
                                onPressOut={() => {
                                  Animated.spring(fillHandleScale, {
                                    toValue: 1,
                                    useNativeDriver: false,
                                    speed: 24,
                                    bounciness: 8,
                                  }).start();
                                }}
                              >
                                <Animated.View
                                  pointerEvents="none"
                                  style={[
                                    styles.fillHandleBtn,
                                    {
                                      backgroundColor: '#fff',
                                      borderColor: colors.primary,
                                      shadowColor: colors.primary,
                                    },
                                    fillHandleBtnAnimStyle,
                                  ]}
                                >
                                  <Feather name="copy" size={10} color={colors.primary} />
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
                            count > 0 && { backgroundColor: colors.cellFilled },
                            isToday(day) && styles.todayCell,
                            fillMode && styles.fillModeCell,
                            isSelected && { borderColor: colors.primary, borderWidth: 2 },
                          ]}
                          onPress={() => handleCellPress(consumer.id, day)}
                          activeOpacity={isAdmin ? (fillMode ? 0.5 : 0.65) : 1}
                        >
                          <Text
                            style={[
                              styles.dayCellText,
                              {
                                color: count > 0 ? colors.cellFilledText : colors.mutedForeground,
                                fontWeight: count > 0 ? ('700' as const) : ('400' as const),
                              },
                            ]}
                          >
                            {count > 0 ? count.toString() : '-'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {/* Row total */}
                    <View style={[styles.rowTotalCell, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.rowTotalText, { color: colors.primary }]}>
                        {consumerTotal}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Day totals row — same shared horizontal scroller */}
              <View style={[styles.totalRow, { backgroundColor: colors.primary, width: TOTAL_TABLE_W }]}>
                <View style={[styles.totalNameCell, { width: NAME_COL_W }]} />
                {days.map((day) => {
                  const dt = getDayTotal(currentYearMonth, day);
                  return (
                    <View key={day} style={styles.dayTotalCell}>
                      <Text style={[styles.dayTotalText, { color: '#fff' }]}>
                        {dt > 0 ? dt.toString() : '-'}
                      </Text>
                    </View>
                  );
                })}
                <View style={[styles.grandTotalCell, { backgroundColor: '#0a5954' }]}>
                  <Text style={[styles.grandTotalText, { color: '#fff' }]}>
                    {getGrandTotal(currentYearMonth)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Frozen first column: it shares the outer vertical scroll but
                sits above the horizontal grid, so names never move sideways. */}
            <View
              pointerEvents="box-none"
              style={[styles.frozenNameColumn, { width: NAME_COL_W }]}
            >
              {consumers.map((consumer, idx) => (
                <TouchableOpacity
                  key={consumer.id}
                  style={[
                    styles.nameCell,
                    {
                      width: NAME_COL_W,
                      backgroundColor: idx % 2 === 0 ? colors.card : colors.rowAlt,
                      borderRightColor: colors.border,
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                  onLongPress={() => handleRemoveConsumer(consumer.id, consumer.name)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.nameText, { color: colors.foreground }]} numberOfLines={2}>
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
                    borderRightColor: 'rgba(255,255,255,0.2)',
                  },
                ]}
              >
                <Text style={[styles.totalNameText, { color: '#fff' }]}>Total</Text>
              </View>
            </View>

            {/* Drag-to-fill overlay — sized to the whole body grid. Sits as
                a sibling of the horizontal ScrollView inside the outer
                vertical ScrollView, so it scrolls vertically with the rows
                and stays positioned over them. locationX is viewport-relative
                to this overlay (so add bodyScrollX); locationY / DAY_CELL_H
                maps to the consumer row index. */}
            {fillMode && isAdmin && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: TOTAL_TABLE_W,
                  height: (consumers.length * DAY_CELL_H) + (DAY_CELL_H + 4),
                  zIndex: 10,
                }}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => {
                  const { locationX, locationY } = e.nativeEvent;
                  const rowIdx = Math.max(0, Math.floor(locationY / DAY_CELL_H));
                  const cid = consumers[Math.min(rowIdx, consumers.length - 1)]?.id;
                  if (cid) handleFillDrag(cid, locationX);
                }}
                onResponderMove={(e) => {
                  const { locationX, locationY } = e.nativeEvent;
                  const rowIdx = Math.max(0, Math.floor(locationY / DAY_CELL_H));
                  const cid = consumers[Math.min(rowIdx, consumers.length - 1)]?.id;
                  if (cid) handleFillDrag(cid, locationX);
                }}
              />
            )}
            </View>
            {/*
              Extra blank space at the bottom of the table. When the
              keyboard opens the auto-scroll effect needs scroll range
              to push bottom rows up above the keyboard; this spacer
              gives the outer ScrollView that headroom. ~half the
              typical phone viewport is enough to clear most keyboards.
            */}
            <View
              pointerEvents="none"
              style={{ height: 320 }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Add Consumer Modal */}
      <Modal visible={showAddConsumer} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => { setShowAddConsumer(false); setNewName(''); setNewEmail(''); setNewPhone(''); setAddError(''); }}
          />
          {/*
           * On Android KeyboardAvoidingView does nothing, so we lift the
           * sheet by the keyboard height (with the bottom safe-area inset
           * included) so the form sits flush above the keyboard.
           * On iOS KeyboardAvoidingView with behavior="padding" handles it.
           */}
          <View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: colors.card,
                paddingBottom:
                  24 +
                  (Platform.OS === 'android' ? keyboardHeight : 0) +
                  (Platform.OS === 'android' ? insets.bottom : 0),
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: colors.foreground, flex: 1 }]}>Add Consumer</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => { setShowAddConsumer(false); setNewName(''); setNewEmail(''); setNewPhone(''); setAddError(''); }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
              A login account will be created and credentials sent by email.
            </Text>
            <TextInput
              style={[styles.sheetInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              placeholder="Full name *"
              placeholderTextColor={colors.mutedForeground}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={[styles.sheetInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, marginTop: 10 }]}
              placeholder="Email *"
              placeholderTextColor={colors.mutedForeground}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
            <TextInput
              style={[styles.sheetInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, marginTop: 10 }]}
              placeholder="Phone number (optional, 11 digits)"
              placeholderTextColor={colors.mutedForeground}
              value={newPhone}
              onChangeText={(t) => setNewPhone(t.replace(/\D/g, '').slice(0, 11))}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handleAddConsumer}
            />
            {addError ? (
              <Text style={styles.sheetError}>{addError}</Text>
            ) : null}
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.sheetBtn, { backgroundColor: colors.primary, flex: 1 }]}
                onPress={handleAddConsumer}
              >
                <Text style={{ color: '#fff', fontWeight: '600' as const }}>Add &amp; Send Credentials</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 15,
    gap: 8,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#0F766E',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pageTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center',
  },
  viewOnlyBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewOnlyText: {
    color: '#fff', fontSize: 7, lineHeight: 8,
    fontFamily: 'Inter_600SemiBold', textAlign: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  fillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fillBannerText: { flex: 1, color: '#fff', fontSize: 13, fontFamily: 'Inter_400Regular' },
  fillDoneBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  fillDoneText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  gridWrapper: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    height: HEADER_H,
    borderBottomWidth: 1,
  },
  cornerCell: {
    height: HEADER_H,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cornerText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  cornerDiagonal: {
    position: 'absolute', width: 118, height: 1,
    left: -4, top: 19, backgroundColor: 'rgba(255,255,255,0.68)',
    transform: [{ rotate: '20deg' }],
  },
  cornerDateText: {
    position: 'absolute', top: 4, right: 8, color: '#fff',
    fontSize: 10, fontFamily: 'Inter_600SemiBold',
  },
  cornerConsumerText: {
    position: 'absolute', bottom: 4, left: 8, color: '#fff',
    fontSize: 10, fontFamily: 'Inter_600SemiBold',
  },
  frozenHeaderCell: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: HEADER_H,
    zIndex: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 4,
  },
  headerDayCell: {
    width: DAY_CELL_W,
    height: HEADER_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDayText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  totalHeaderCell: {
    width: TOTAL_COL_W,
    height: HEADER_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalHeaderText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },
  dataRow: {
    flexDirection: 'row',
    height: DAY_CELL_H,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameCell: {
    height: DAY_CELL_H,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRightWidth: 1,
  },
  frozenNameColumn: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  nameText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  dayCell: {
    width: DAY_CELL_W,
    height: DAY_CELL_H,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E2E8F0',
    overflow: 'visible',
  },
  activeDayCell: {
    borderWidth: 2,
    borderRightWidth: 2,
    backgroundColor: '#E6FFFA',
    zIndex: 10,
    position: 'relative',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  fillModeCell: {
    backgroundColor: '#E0FFF9',
  },
  todayCell: { borderBottomWidth: 2, borderBottomColor: '#14B8A6' },
  cellInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  fillHandle: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderTopLeftRadius: 2,
    zIndex: 20,
  },
  // Wrapper that catches the press. Anchored flush to the bottom-right
  // corner so the visible button's border touches the cell border. The
  // TouchableOpacity's hitSlop prop extends the tap target beyond the
  // visible button so it's still easy to hit.
  fillHandlePressable: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  // The visible button: small white chip with a primary border and a
  // Feather "copy" icon. Scales briefly on press for tactile feedback.
  fillHandleBtn: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1.5,
    elevation: 2,
  },
  dayCellText: { fontSize: 13 },
  rowTotalCell: {
    width: TOTAL_COL_W,
    height: DAY_CELL_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTotalText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  totalRow: {
    flexDirection: 'row',
    height: DAY_CELL_H + 4,
  },
  totalNameCell: {
    height: DAY_CELL_H + 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  totalNameText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  dayTotalCell: {
    width: DAY_CELL_W,
    height: DAY_CELL_H + 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayTotalText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  grandTotalCell: {
    width: TOTAL_COL_W,
    height: DAY_CELL_H + 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grandTotalText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    gap: 16,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,118,110,0.06)',
  },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  sheetSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4, marginBottom: 4 },
  sheetError: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#DC2626', marginTop: 8 },
  sheetInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  sheetActions: { flexDirection: 'row', gap: 12 },
  sheetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
