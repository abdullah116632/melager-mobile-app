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
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useMess, DayExpenseItem } from '@/context/MessContext';
import { useAuth } from '@/context/AuthContext';
import { useDrawer } from '@/context/DrawerContext';
import MonthPicker from '@/components/MonthPicker';
import { NotificationBell } from '@/components/NotificationBell';

const DAY_COL_W = 44;
const AMT_COL_W = 96;
const ROW_H = 50;
const EXPENSE = '#0F766E';
const EXPENSE_DARK = '#0A5954';
const EXPENSE_ACCENT = '#14B8A6';

interface DraftItem {
  id: string;
  name: string;
  amountStr: string;
}

function fmtAmt(n: number): string {
  if (n <= 0) return '';
  if (Number.isInteger(n)) return n.toLocaleString('en-IN');
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function makeDraftItem(): DraftItem {
  return { id: Date.now().toString() + Math.random().toString(36).slice(2, 6), name: '', amountStr: '' };
}

function toDraftItems(items: DayExpenseItem[]): DraftItem[] {
  return items.map((it) => ({ id: it.id, name: it.name, amountStr: it.amount > 0 ? it.amount.toString() : '' }));
}

function toExpenseItems(drafts: DraftItem[]): DayExpenseItem[] {
  return drafts
    .filter((d) => d.name.trim() || parseFloat(d.amountStr) > 0)
    .map((d) => ({ id: d.id, name: d.name.trim(), amount: parseFloat(d.amountStr) || 0 }));
}

function draftTotal(drafts: DraftItem[]): number {
  return drafts.reduce((sum, d) => sum + (parseFloat(d.amountStr) || 0), 0);
}

export default function ExpenseSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { openDrawer } = useDrawer();
  const {
    currentYearMonth,
    currentMonthLabel,
    getExpense,
    setExpense,
    getMonthExpenseTotal,
    getDaysInMonth,
    refreshMonth,
  } = useMess();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMonth().catch(() => {});
    setRefreshing(false);
  }, [refreshMonth]);

  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [viewingDay, setViewingDay] = useState<number | null>(null);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  // ref to last name input so we can auto-focus amount
  const amtRefs = useRef<Record<string, TextInput | null>>({});
  const firstItemNameInputRef = useRef<TextInput | null>(null);

  const daysCount = getDaysInMonth(currentYearMonth);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const monthTotal = getMonthExpenseTotal(currentYearMonth);

  const isToday = (day: number) => {
    const now = new Date();
    const [year, month] = currentYearMonth.split('-').map(Number);
    return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
  };

  // ── Sheet open / close ───────────────────────────────────────────────────

  const openSheet = (day: number) => {
    if (!isAdmin) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    const exp = getExpense(currentYearMonth, day);
    setEditingDay(day);
    const drafts = toDraftItems(exp.items);
    // Always have at least one empty row to start
    setDraftItems(drafts.length > 0 ? drafts : [makeDraftItem()]);
  };

  const closeSheet = () => {
    setEditingDay(null);
    setDraftItems([]);
  };

  useEffect(() => {
    if (editingDay === null) return;
    // Let the opening modal finish mounting before focusing its first field.
    const focusTimer = setTimeout(() => firstItemNameInputRef.current?.focus(), 350);
    return () => clearTimeout(focusTimer);
  }, [editingDay]);

  const handleSave = () => {
    if (editingDay === null) return;
    const finalItems = toExpenseItems(draftItems);
    setExpense(currentYearMonth, editingDay, finalItems);
    closeSheet();
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openExpenseList = (day: number) => setViewingDay(day);

  const deleteExpenseItem = (id: string) => {
    if (!isAdmin || viewingDay === null) return;
    Alert.alert('Delete item', 'Remove this expense item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          const current = getExpense(currentYearMonth, viewingDay);
          setExpense(currentYearMonth, viewingDay, current.items.filter((item) => item.id !== id));
        },
      },
    ]);
  };

  const deleteAllExpenseItems = () => {
    if (!isAdmin || viewingDay === null) return;
    Alert.alert('Delete all expenses', 'Remove every expense item for this day?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all', style: 'destructive',
        onPress: () => setExpense(currentYearMonth, viewingDay, []),
      },
    ]);
  };

  // ── Draft item management ────────────────────────────────────────────────

  const addDraftItem = () => {
    const newItem = makeDraftItem();
    setDraftItems((prev) => [...prev, newItem]);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    // Focus the name field of the new item after next render
    setTimeout(() => {
      // TextInput auto-focuses via autoFocus on new items
    }, 50);
  };

  const updateDraftName = (id: string, name: string) => {
    setDraftItems((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  };

  const updateDraftAmount = (id: string, amountStr: string) => {
    setDraftItems((prev) => prev.map((d) => (d.id === id ? { ...d, amountStr } : d)));
  };

  const removeDraftItem = (id: string) => {
    setDraftItems((prev) => {
      const next = prev.filter((d) => d.id !== id);
      return next.length > 0 ? next : [makeDraftItem()];
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const currentTotal = draftTotal(draftItems);
  const viewedExpense = viewingDay === null ? null : getExpense(currentYearMonth, viewingDay);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 49;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding }]}>
      {/* Page header */}
      <View style={[styles.pageHeader, { backgroundColor: EXPENSE }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={openDrawer} activeOpacity={0.7}>
          <Feather name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: '#fff', flex: 1 }]} numberOfLines={1}>Expense Tracker</Text>
        <NotificationBell />
        <View style={[styles.totalBadge, !isAdmin && styles.totalBadgeMember]}>
          <Text style={[styles.totalBadgeText, { color: '#fff' }, !isAdmin && styles.totalBadgeTextMember]}>
            ৳{fmtAmt(monthTotal) || '0'}
          </Text>
        </View>
        {!isAdmin && (
          <View style={styles.viewOnlyBadge}>
            <Text style={styles.viewOnlyText}>View{`\n`}Only</Text>
          </View>
        )}
      </View>

      <MonthPicker accentColor={EXPENSE} />

      {/* Column header */}
      <View style={[styles.colHeader, { backgroundColor: EXPENSE_DARK }]}>
        <View style={[styles.dayHeaderCell, { width: DAY_COL_W }]}>
          <Text style={styles.colHeaderText}>Day</Text>
        </View>
        <View style={[styles.amtHeaderCell, { width: AMT_COL_W }]}>
          <Text style={styles.colHeaderText}>Total (৳)</Text>
        </View>
        <View style={styles.itemsHeaderCell}>
          <Text style={styles.colHeaderText}>Items</Text>
        </View>
      </View>

      {/* Day rows */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EXPENSE} colors={[EXPENSE]} />}
      >
        <View style={styles.tableBody}>
        {days.map((day, idx) => {
          const exp = getExpense(currentYearMonth, day);
          const hasData = exp.items.length > 0;
          const todayRow = isToday(day);
          const itemSummary = exp.items.map((it) => it.name).filter(Boolean).join(', ');

          return (
            <View
              key={day}
              style={[
                styles.row,
                {
                  backgroundColor: todayRow ? '#DDF7F2' : idx % 2 === 0 ? colors.card : colors.rowAlt,
                  borderBottomColor: '#CBD5E1',
                  borderLeftWidth: todayRow ? 3 : 0,
                  borderLeftColor: EXPENSE_ACCENT,
                  minHeight: ROW_H,
                },
              ]}
            >
              {/* Day number */}
              <View style={[styles.dayCol, { width: DAY_COL_W }]}>
                <Text
                  style={[
                    styles.dayText,
                    { color: todayRow ? EXPENSE_DARK : colors.foreground },
                    todayRow && { fontFamily: 'Inter_700Bold' as const },
                  ]}
                >
                  {day}
                </Text>
                {todayRow && (
                  <Text style={[styles.todayLabel, { color: EXPENSE }]}>Today</Text>
                )}
              </View>

              {/* Total amount */}
              <View style={[styles.amtCol, { width: AMT_COL_W, borderLeftColor: '#B8C2CF' }]}>
                {hasData ? (
                  <Text style={[styles.amtText, { color: EXPENSE_DARK, fontFamily: 'Inter_600SemiBold' as const }]}>
                    ৳{fmtAmt(exp.total)}
                  </Text>
                ) : (
                  <Text style={[styles.amtText, { color: colors.mutedForeground }]}>—</Text>
                )}
              </View>

              {/* Items preview */}
              <TouchableOpacity
                style={[styles.itemsCol, { borderLeftColor: '#B8C2CF' }]}
                onPress={() => openExpenseList(day)}
                activeOpacity={0.7}
              >
                {hasData ? (
                  <View style={styles.itemsPreviewRow}>
                    <Text
                      style={[styles.itemsPreviewText, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {itemSummary || `${exp.items.length} item${exp.items.length !== 1 ? 's' : ''}`}
                    </Text>
                    <View style={[styles.itemCountBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.itemCountText, { color: EXPENSE_DARK }]}>
                        {exp.items.length}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>Tap to add</Text>
                )}
              </TouchableOpacity>

              {/* Per-row plus button — admin only */}
              {isAdmin && (
                <TouchableOpacity
                  style={[styles.rowPlusBtn, { backgroundColor: EXPENSE }]}
                  onPress={() => openSheet(day)}
                  activeOpacity={0.8}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Feather name="plus" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Total row */}
        <View style={[styles.totalRow, { backgroundColor: EXPENSE_DARK }]}>
          <View style={[styles.dayCol, { width: DAY_COL_W }]}>
            <Text style={[styles.totalLabel, { color: '#fff' }]}>Total</Text>
          </View>
          <View style={[styles.amtCol, { width: AMT_COL_W, borderLeftColor: 'rgba(255,255,255,0.38)' }]}>
            <Text style={[styles.totalAmtText, { color: '#fff' }]}>
              ৳{fmtAmt(monthTotal) || '0'}
            </Text>
          </View>
          <View style={[styles.itemsCol, { borderLeftColor: 'rgba(255,255,255,0.38)' }]}>
            <Text style={[styles.totalDaysText, { color: 'rgba(255,255,255,0.75)' }]}>
              {days.filter((d) => getExpense(currentYearMonth, d).items.length > 0).length} days recorded
            </Text>
          </View>
        </View>
        <View pointerEvents="none" style={[styles.columnDivider, { left: DAY_COL_W }]} />
        <View pointerEvents="none" style={[styles.columnDivider, { left: DAY_COL_W + AMT_COL_W }]} />
        </View>
      </ScrollView>

      {/* Expense list sheet */}
      <Modal visible={viewingDay !== null} transparent animationType="slide" onRequestClose={() => setViewingDay(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setViewingDay(null)} />
          <View style={[styles.detailSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Expenses · Day {viewingDay}</Text>
                <Text style={[styles.sheetSubtotal, { color: EXPENSE }]}>৳{fmtAmt(viewedExpense?.total ?? 0)}</Text>
              </View>
              <View style={styles.sheetHeaderActions}>
                {isAdmin && (viewedExpense?.items.length ?? 0) > 0 && (
                  <TouchableOpacity
                    style={[styles.clearBtn, styles.deleteAllBtn]}
                    onPress={deleteAllExpenseItems}
                    accessibilityLabel="Delete all expenses for this day"
                  >
                    <Feather name="trash-2" size={16} color="#DC2626" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.clearBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => setViewingDay(null)}
                  accessibilityLabel="Close expense list"
                >
                  <Feather name="x" size={19} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            {viewedExpense?.items.length ? (
              <ScrollView style={styles.detailList} showsVerticalScrollIndicator={false}>
                {viewedExpense.items.map((item) => (
                  <View key={item.id} style={[styles.detailItemRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.detailItemIcon, { backgroundColor: '#F0FDFA' }]}>
                      <Feather name="tag" size={15} color={EXPENSE} />
                    </View>
                    <Text style={[styles.detailItemName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name || 'Untitled item'}
                    </Text>
                    <Text style={[styles.detailItemAmount, { color: EXPENSE_DARK }]}>৳{fmtAmt(item.amount)}</Text>
                    {isAdmin && (
                      <TouchableOpacity
                        style={styles.detailItemDeleteBtn}
                        onPress={() => deleteExpenseItem(item.id)}
                        accessibilityLabel={`Delete ${item.name || 'expense item'}`}
                      >
                        <Feather name="trash-2" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.detailEmptyState}>
                <Feather name="file-text" size={28} color={colors.mutedForeground} />
                <Text style={[styles.detailEmptyText, { color: colors.mutedForeground }]}>No expense items for this day.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Sheet */}
      <Modal visible={editingDay !== null} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleSave} />
            <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

              {/* Sheet header */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                    Day {editingDay} — {currentMonthLabel}
                  </Text>
                  {currentTotal > 0 && (
                    <Text style={[styles.sheetSubtotal, { color: EXPENSE }]}>
                      Total: ৳{fmtAmt(currentTotal)}
                    </Text>
                  )}
                </View>
                <View style={styles.sheetHeaderActions}>
                  <TouchableOpacity
                    style={[styles.clearBtn, { backgroundColor: colors.secondary }]}
                    onPress={closeSheet}
                    accessibilityLabel="Close expense form"
                  >
                    <Feather name="x" size={19} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Column labels */}
              <View style={[styles.itemColLabels, { borderBottomColor: colors.border }]}>
                <Text style={[styles.itemColLabel, { color: colors.mutedForeground, flex: 1 }]}>Item Name</Text>
                <Text style={[styles.itemColLabel, { color: colors.mutedForeground, width: 90, textAlign: 'right' }]}>
                  Amount (৳)
                </Text>
                <View style={{ width: 32 }} />
              </View>

              {/* Items list */}
              <ScrollView
                style={styles.itemsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {draftItems.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.itemRow,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    {/* Item name */}
                    <TextInput
                      ref={index === 0 ? firstItemNameInputRef : undefined}
                      style={[
                        styles.itemNameInput,
                        {
                          color: colors.foreground,
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      placeholder={`Item ${index + 1}`}
                      placeholderTextColor={colors.mutedForeground}
                      value={item.name}
                      onChangeText={(text) => updateDraftName(item.id, text)}
                      returnKeyType="next"
                      autoFocus={index === draftItems.length - 1 && index > 0}
                      onSubmitEditing={() => amtRefs.current[item.id]?.focus()}
                      blurOnSubmit={false}
                    />

                    {/* Amount */}
                    <View
                      style={[
                        styles.itemAmtWrapper,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.rupeeSign, { color: EXPENSE }]}>৳</Text>
                      <TextInput
                        ref={(r) => { amtRefs.current[item.id] = r; }}
                        style={[styles.itemAmtInput, { color: colors.foreground }]}
                        placeholder="0"
                        placeholderTextColor={colors.mutedForeground}
                        value={item.amountStr}
                        onChangeText={(text) => updateDraftAmount(item.id, text)}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        selectTextOnFocus
                      />
                    </View>

                    {/* Delete button */}
                    <TouchableOpacity
                      style={styles.itemDeleteBtn}
                      onPress={() => removeDraftItem(item.id)}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <Feather name="x-circle" size={20} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add item button */}
                <TouchableOpacity
                  style={[styles.addItemBtn, { borderColor: EXPENSE }]}
                  onPress={addDraftItem}
                >
                  <Feather name="plus" size={16} color={EXPENSE} />
                  <Text style={[styles.addItemText, { color: EXPENSE }]}>Add item</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: EXPENSE }]}
                onPress={handleSave}
              >
                {currentTotal > 0 && (
                  <Text style={styles.saveBtnSubtext}>৳{fmtAmt(currentTotal)}</Text>
                )}
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  viewOnlyBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewOnlyText: {
    color: '#fff', fontSize: 7, lineHeight: 8,
    fontFamily: 'Inter_600SemiBold', textAlign: 'center',
  },
  totalBadge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalBadgeText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  totalBadgeMember: { paddingHorizontal: 9, paddingVertical: 5 },
  totalBadgeTextMember: { fontSize: 12 },
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
  colHeader: {
    flexDirection: 'row',
    height: 38,
    alignItems: 'center',
  },
  dayHeaderCell: { justifyContent: 'center', alignItems: 'center' },
  amtHeaderCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.38)',
  },
  itemsHeaderCell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.38)',
  },
  colHeaderText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  tableBody: { position: 'relative' },
  columnDivider: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    backgroundColor: '#CBD5E1', zIndex: 5,
  },
  dayCol: { justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  dayText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  todayLabel: { fontSize: 9, fontFamily: 'Inter_600SemiBold', marginTop: 1 },
  amtCol: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
    borderLeftWidth: 0,
    paddingVertical: 8,
  },
  amtText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  itemsCol: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderLeftWidth: 0,
    paddingVertical: 8,
  },
  itemsPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemsPreviewText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  itemCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,118,110,0.10)',
  },
  itemCountText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  tapHint: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  totalRow: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  totalAmtText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  totalDaysText: { fontSize: 12, fontFamily: 'Inter_400Regular', paddingHorizontal: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    maxHeight: '85%',
  },
  detailSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    maxHeight: '72%',
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  sheetSubtotal: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  sheetHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteAllBtn: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  detailList: { maxHeight: 360 },
  detailItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12,
  },
  detailItemIcon: {
    width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  detailItemName: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  detailItemAmount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  detailItemDeleteBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginLeft: 2,
  },
  detailEmptyState: { alignItems: 'center', paddingVertical: 34, gap: 10 },
  detailEmptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  itemColLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  itemColLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  itemsList: { maxHeight: 320 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemNameInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  itemAmtWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 8,
    paddingRight: 4,
  },
  rupeeSign: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginRight: 2 },
  itemAmtInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    padding: 0,
  },
  itemDeleteBtn: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(15,118,110,0.04)',
  },
  addItemText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#0F766E',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  saveBtnSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontFamily: 'Inter_500Medium' },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  rowPlusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginLeft: 6,
    flexShrink: 0,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
});
