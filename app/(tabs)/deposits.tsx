import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  FlatList,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Keyboard,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useMess } from '@/context/MessContext';
import { useAuth } from '@/context/AuthContext';
import { useDrawer } from '@/context/DrawerContext';
import { useNetwork } from '@/context/NetworkContext';
import MonthPicker from '@/components/MonthPicker';
import { NotificationBell } from '@/components/NotificationBell';
import { api } from '@/lib/api';
import type { DepositEntry } from '@/lib/api';
import { enqueue } from '@/lib/offlineQueue';

const NAME_COL_W = 120;
const TOTAL_COL_W = 82;
const PURPLE = '#0F766E';
const PURPLE_DARK = '#0A5954';
const BLUE_DOT = '#14B8A6';

function formatAmt(n: number): string {
  if (n === 0) return '0';
  if (Number.isInteger(n)) return n.toLocaleString('en-IN');
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = (d.getMonth() + 1).toString().padStart(2, '0');
  const yr = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${mon}/${yr}  ${hh}:${mm}`;
}

function nowDateStr(): string {
  const d = new Date();
  const yr = d.getFullYear();
  const mo = (d.getMonth() + 1).toString().padStart(2, '0');
  const da = d.getDate().toString().padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}

function nowTimeStr(): string {
  const d = new Date();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatPickerDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime12Hour(timeStr: string): string {
  const [rawHour, rawMinute] = timeStr.split(':').map(Number);
  if (!Number.isInteger(rawHour) || !Number.isInteger(rawMinute)) return timeStr;
  const period = rawHour >= 12 ? 'PM' : 'AM';
  return `${(rawHour % 12) || 12}:${String(rawMinute).padStart(2, '0')} ${period}`;
}

export default function DepositSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role, token, activeMess } = useAuth();
  const { isOnline } = useNetwork();
  const isAdmin = role === 'admin';
  const { openDrawer } = useDrawer();
  const { consumers, currentYearMonth, addConsumer, removeConsumer, refreshMonth } = useMess();

  const [entries, setEntries] = useState<DepositEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addConsumerId, setAddConsumerId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [addDate, setAddDate] = useState(nowDateStr());
  const [addTime, setAddTime] = useState(nowTimeStr());
  const [addNote, setAddNote] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const addAmountInputRef = useRef<TextInput | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [historyConsumerId, setHistoryConsumerId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [showAddConsumer, setShowAddConsumer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addConsumerError, setAddConsumerError] = useState('');

  const messId = activeMess?.id ?? null;

  const loadEntries = useCallback(async () => {
    if (!messId || !token) return;
    setLoading(true);
    try {
      const { entries: data } = await api.getDepositEntries(messId, currentYearMonth, token);
      setEntries(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [messId, token, currentYearMonth]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!showAdd) return;
    // Wait for the modal's opening animation to mount the field before
    // focusing it; this consistently opens the keyboard on Android too.
    const focusTimer = setTimeout(() => addAmountInputRef.current?.focus(), 350);
    return () => clearTimeout(focusTimer);
  }, [showAdd]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshMonth(), loadEntries()]).catch(() => {});
    setRefreshing(false);
  }, [refreshMonth, loadEntries]);

  const entriesForConsumer = (cid: string) =>
    entries.filter((e) => e.consumerId.toString() === cid);

  const totalForConsumer = (cid: string) =>
    entriesForConsumer(cid).reduce((s, e) => s + e.amount, 0);

  const grandTotal = entries.reduce((s, e) => s + e.amount, 0);

  const openAdd = (cid: string) => {
    setAddConsumerId(cid);
    setAddAmount('');
    setAddDate(nowDateStr());
    setAddTime(nowTimeStr());
    setAddNote('');
    setAddError('');
    setShowAdd(true);
  };

  const handleAddDeposit = async () => {
    if (!messId || !token || !addConsumerId) return;
    const amount = parseInt(addAmount.trim(), 10);
    if (!amount || isNaN(amount) || amount <= 0) {
      setAddError('Enter a valid amount.');
      return;
    }
    const dateStr = addDate.trim() || nowDateStr();
    const timeStr = addTime.trim() || nowTimeStr();
    const depositedAt = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(depositedAt.getTime())) {
      setAddError('Invalid date or time. Use YYYY-MM-DD and HH:MM.');
      return;
    }
    setAddSaving(true);
    setAddError('');

    const consumerId = parseInt(addConsumerId, 10);
    const note = addNote.trim() || undefined;
    const depositedAtIso = depositedAt.toISOString();

    if (!isOnline) {
      await enqueue({
        type: 'ADD_DEPOSIT_ENTRY',
        key: `deposit_entry:${Date.now()}:${Math.random()}`,
        payload: { messId, consumerId, amount, depositedAt: depositedAtIso, note },
        token,
      });
      const tempEntry: DepositEntry = {
        id: -Date.now(),
        consumerId,
        amount,
        depositedAt: depositedAtIso,
        note: note ?? null,
      };
      setEntries((prev) => [...prev, tempEntry]);
      setShowAdd(false);
      setAddSaving(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    try {
      const { entry } = await api.addDepositEntry(
        { messId, consumerId, amount, depositedAt: depositedAtIso, note },
        token,
      );
      setEntries((prev) => [...prev, entry]);
      setShowAdd(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setAddSaving(false);
    }
  };

  const openHistory = (cid: string) => {
    setHistoryConsumerId(cid);
    setShowHistory(true);
  };

  const handleDeleteEntry = (id: number) => {
    if (!messId || !token) return;
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot delete while offline. Please try again when connected.');
      return;
    }
    Alert.alert('Delete Deposit', 'Remove this deposit entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeletingId(id);
          try {
            await api.deleteDepositEntry(id, messId, token);
            setEntries((prev) => prev.filter((e) => e.id !== id));
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const handleAddConsumer = async () => {
    const trimmed = newName.trim();
    const emailTrimmed = newEmail.trim();
    const phoneTrimmed = newPhone.trim() || undefined;
    setAddConsumerError('');
    if (!trimmed) { setAddConsumerError('Name is required.'); return; }
    if (!emailTrimmed) { setAddConsumerError('Email is required.'); return; }
    if (phoneTrimmed && phoneTrimmed.length !== 11) { setAddConsumerError('Phone must be exactly 11 digits.'); return; }
    try {
      await addConsumer(trimmed, emailTrimmed, phoneTrimmed);
      setNewName(''); setNewEmail(''); setNewPhone(''); setAddConsumerError('');
      setShowAddConsumer(false);
    } catch (e: unknown) {
      setAddConsumerError(e instanceof Error ? e.message : 'Failed to add consumer.');
    }
  };

  const handleRemoveConsumer = (id: string, name: string) => {
    if (!isAdmin) return;
    Alert.alert('Remove Consumer', `Remove "${name}" from the mess?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await removeConsumer(id); } },
    ]);
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 49;

  const historyConsumer = consumers.find((c) => c.id === historyConsumerId);
  const historyEntries = historyConsumerId
    ? entriesForConsumer(historyConsumerId).slice().sort((a, b) => new Date(b.depositedAt).getTime() - new Date(a.depositedAt).getTime())
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding }]}>
      {/* Page header */}
      <View style={[styles.pageHeader, { backgroundColor: PURPLE }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={openDrawer} activeOpacity={0.7}>
          <Feather name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Deposit Tracker</Text>
        <View style={styles.headerRight}>
          <NotificationBell badgeBorderColor="#7C3AED" />
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>৳{formatAmt(grandTotal)}</Text>
          </View>
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
      </View>

      <MonthPicker accentColor={PURPLE} />

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={PURPLE} />
        </View>
      )}

      {consumers.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No consumers yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Add consumers from the Meals tab or tap + above
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Table header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: PURPLE_DARK }]}>
            <View style={[styles.nameCol, { width: NAME_COL_W }]}>
              <Text style={styles.headerText}>Consumers ({consumers.length})</Text>
            </View>
            <View style={[styles.totalCol, { width: TOTAL_COL_W }]}>
              <Text style={styles.headerText}>Total</Text>
            </View>
            <View style={[styles.depositsCol, styles.compactDepositsCol]}>
              <Text style={styles.headerText}>Deposits</Text>
            </View>
          </View>

          {/* Consumer rows */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomPadding }}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} colors={[PURPLE]} />}
          >
            {consumers.map((consumer, idx) => {
              const cEntries = entriesForConsumer(consumer.id);
              const total = totalForConsumer(consumer.id);
              const dots = cEntries.length;

              return (
                <View
                  key={consumer.id}
                  style={[
                    styles.row,
                    { backgroundColor: idx % 2 === 0 ? colors.card : colors.rowAlt, borderBottomColor: colors.border },
                  ]}
                >
                  {/* Name column */}
                  <TouchableOpacity
                    style={[styles.nameCol, { width: NAME_COL_W, borderRightColor: colors.border }]}
                    onLongPress={() => handleRemoveConsumer(consumer.id, consumer.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.nameText, { color: colors.foreground }]} numberOfLines={2}>
                      {consumer.name}
                    </Text>
                  </TouchableOpacity>

                  {/* Total column */}
                  <View style={[styles.totalCol, { width: TOTAL_COL_W, borderRightColor: colors.border }]}>
                    <Text style={[styles.totalText, { color: total > 0 ? PURPLE : colors.mutedForeground }]}>
                      ৳{formatAmt(total)}
                    </Text>
                  </View>

                  {/* Deposits column: dots + plus button */}
                  <View style={[styles.depositsCol, { borderRightColor: colors.border }]}>
                    {/* Dots area — tappable to show history */}
                    <TouchableOpacity
                      style={styles.dotsArea}
                      onPress={() => dots > 0 ? openHistory(consumer.id) : undefined}
                      activeOpacity={dots > 0 ? 0.7 : 1}
                    >
                      {dots === 0 ? (
                        <Text style={[styles.noDepositsText, { color: colors.mutedForeground }]}>
                          No deposits
                        </Text>
                      ) : (
                        <View style={styles.dotsWrap}>
                          {cEntries.map((e) => (
                            <View key={e.id} style={styles.dot} />
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Plus button — admin only */}
                    {isAdmin && (
                      <TouchableOpacity
                        style={[styles.plusBtn, { backgroundColor: PURPLE }]}
                        onPress={() => openAdd(consumer.id)}
                        activeOpacity={0.8}
                      >
                        <Feather name="plus" size={18} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Grand total footer */}
            <View style={[styles.grandTotalRow, { backgroundColor: PURPLE_DARK }]}>
              <View style={[styles.nameCol, { width: NAME_COL_W }]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
              </View>
              <View style={[styles.totalCol, { width: TOTAL_COL_W }]}>
                <Text style={[styles.grandTotalText, { textAlign: 'right' }]}>
                  ৳{formatAmt(grandTotal)}
                </Text>
              </View>
              <View style={[styles.depositsCol, styles.compactDepositsCol]} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* Add Deposit Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => Keyboard.dismiss()} />
            <View
              style={[
                styles.bottomSheet,
                {
                  backgroundColor: colors.card,
                  marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
                },
              ]}
            >
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <View style={styles.sheetTitleRow}>
                <Text style={[styles.sheetTitle, { color: colors.foreground, marginBottom: 0 }]}>Add Deposit</Text>
                <TouchableOpacity
                  style={[styles.sheetCloseBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => { Keyboard.dismiss(); setShowAdd(false); }}
                  accessibilityLabel="Close add deposit form"
                >
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}> 
                {consumers.find((c) => c.id === addConsumerId)?.name ?? ''}
              </Text>

              <ScrollView
                style={styles.sheetFormList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount (৳) *</Text>
                <TextInput
                  ref={addAmountInputRef}
                  style={[styles.sheetInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                  placeholder="e.g. 500"
                  placeholderTextColor={colors.mutedForeground}
                  value={addAmount}
                  onChangeText={setAddAmount}
                  keyboardType="number-pad"
                />

                <View style={styles.dateTimeRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Date</Text>
                    <TouchableOpacity
                      style={[styles.pickerInput, { borderColor: colors.border, backgroundColor: colors.background }]}
                      onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}
                    >
                      <Feather name="calendar" size={15} color={PURPLE} />
                      <Text style={[styles.pickerInputText, { color: colors.foreground }]} numberOfLines={1}>
                        {formatPickerDate(addDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Time</Text>
                    <TouchableOpacity
                      style={[styles.pickerInput, { borderColor: colors.border, backgroundColor: colors.background }]}
                      onPress={() => { Keyboard.dismiss(); setShowTimePicker(true); }}
                    >
                      <Feather name="clock" size={15} color={PURPLE} />
                      <Text style={[styles.pickerInputText, { color: colors.foreground }]} numberOfLines={1}>
                        {formatTime12Hour(addTime)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Note (optional)</Text>
                <TextInput
                  style={[styles.sheetInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                  placeholder="e.g. Cash payment"
                  placeholderTextColor={colors.mutedForeground}
                  value={addNote}
                  onChangeText={setAddNote}
                />

                {addError ? <Text style={styles.sheetError}>{addError}</Text> : null}
              </ScrollView>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[styles.sheetBtn, { backgroundColor: PURPLE, flex: 1 }]}
                  onPress={handleAddDeposit}
                  disabled={addSaving}
                >
                  {addSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={{ color: '#fff', fontWeight: '600' as const }}>Add Deposit</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DepositDatePicker
        visible={showDatePicker}
        initialDate={addDate}
        colors={colors}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => { setAddDate(date); setShowDatePicker(false); }}
      />
      <DepositTimePicker
        visible={showTimePicker}
        initialTime={addTime}
        colors={colors}
        onClose={() => setShowTimePicker(false)}
        onSelect={(time) => { setAddTime(time); setShowTimePicker(false); }}
      />

      {/* History Bottom Sheet */}
      <Modal visible={showHistory} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowHistory(false)}>
            <View style={{ flex: 1 }} />
          </TouchableOpacity>
          <View style={[styles.bottomSheet, styles.historySheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.historyHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground, marginBottom: 0 }]}>
                Deposits — {historyConsumer?.name ?? ''}
              </Text>
              <Text style={[styles.historyTotal, { color: PURPLE }]}>
                ৳{formatAmt(historyConsumerId ? totalForConsumer(historyConsumerId) : 0)}
              </Text>
            </View>

            {historyEntries.length === 0 ? (
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, marginTop: 16 }]}>
                No deposits this month.
              </Text>
            ) : (
              <FlatList
                data={historyEntries}
                keyExtractor={(item) => item.id.toString()}
                style={{ marginTop: 12 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <View style={[styles.entryRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.entryDotCol}>
                      <View style={styles.dot} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryAmount, { color: PURPLE }]}>৳{formatAmt(item.amount)}</Text>
                      <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>{fmtDate(item.depositedAt)}</Text>
                      {item.note ? (
                        <Text style={[styles.entryNote, { color: colors.mutedForeground }]}>{item.note}</Text>
                      ) : null}
                    </View>
                    {isAdmin && (
                      <TouchableOpacity
                        onPress={() => handleDeleteEntry(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id
                          ? <ActivityIndicator size="small" color="#DC2626" />
                          : <Feather name="trash-2" size={16} color="#DC2626" />}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.closeHistoryBtn, { backgroundColor: PURPLE }]}
              onPress={() => setShowHistory(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '600' as const }}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Consumer Modal */}
      <Modal visible={showAddConsumer} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => Keyboard.dismiss()} />
            <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <View style={styles.sheetTitleRow}>
                <Text style={[styles.sheetTitle, { color: colors.foreground, marginBottom: 0 }]}>Add Consumer</Text>
                <TouchableOpacity
                  style={[styles.sheetCloseBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => { Keyboard.dismiss(); setShowAddConsumer(false); setNewName(''); setNewEmail(''); setNewPhone(''); setAddConsumerError(''); }}
                  accessibilityLabel="Close add consumer form"
                >
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}> 
                A login account will be created and credentials sent by email.
              </Text>

              <ScrollView
                style={styles.sheetFormList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
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
                {addConsumerError ? <Text style={styles.sheetError}>{addConsumerError}</Text> : null}
              </ScrollView>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[styles.sheetBtn, { backgroundColor: PURPLE, flex: 1 }]}
                  onPress={handleAddConsumer}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' as const }}>Add &amp; Send Credentials</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function DepositDatePicker({
  visible,
  initialDate,
  colors,
  onClose,
  onSelect,
}: {
  visible: boolean;
  initialDate: string;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onSelect: (date: string) => void;
}) {
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    if (!visible) return;
    const [year, month, day] = initialDate.split('-').map(Number);
    setCursor(new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1));
  }, [visible, initialDate]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = nowDateStr();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={[styles.datePickerSheet, { backgroundColor: colors.card }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.pickerTitleRow}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select date</Text>
            <View style={styles.pickerHeaderActions}>
              <Feather name="calendar" size={23} color={PURPLE} />
              <TouchableOpacity
                style={[styles.pickerCloseBtn, { backgroundColor: colors.secondary }]}
                onPress={onClose}
                accessibilityLabel="Close date picker"
              >
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.monthSelectRow}>
            <TouchableOpacity style={styles.monthArrow} onPress={() => setCursor(new Date(year, month - 1, 1))}>
              <Feather name="chevron-left" size={20} color={PURPLE} />
            </TouchableOpacity>
            <Text style={[styles.monthSelectTitle, { color: colors.foreground }]}>
              {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity style={styles.monthArrow} onPress={() => setCursor(new Date(year, month + 1, 1))}>
              <Feather name="chevron-right" size={20} color={PURPLE} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekdayRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={`${day}-${index}`} style={[styles.weekdayText, { color: colors.mutedForeground }]}>{day}</Text>
            ))}
          </View>
          <View style={styles.dateGrid}>
            {Array.from({ length: 42 }, (_, index) => {
              const day = index - firstDay + 1;
              if (day < 1 || day > daysInMonth) return <View key={index} style={styles.dateCell} />;
              const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const selected = date === initialDate;
              const isToday = date === today;
              return (
                <TouchableOpacity
                  key={date}
                  style={styles.dateCell}
                  onPress={() => onSelect(date)}
                >
                  <View style={[styles.dateNumber, selected && { backgroundColor: PURPLE }, isToday && !selected && { borderColor: PURPLE, borderWidth: 1 }]}>
                    <Text style={[styles.dateCellText, { color: selected ? '#fff' : colors.foreground }]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DepositTimePicker({
  visible,
  initialTime,
  colors,
  onClose,
  onSelect,
}: {
  visible: boolean;
  initialTime: string;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onSelect: (time: string) => void;
}) {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (!visible) return;
    const [rawHour, rawMinute] = initialTime.split(':').map(Number);
    const validHour = Number.isInteger(rawHour) && rawHour >= 0 && rawHour < 24;
    setHour(validHour ? ((rawHour % 12) || 12) : 12);
    setMinute(Number.isInteger(rawMinute) ? rawMinute : 0);
    setPeriod(validHour && rawHour >= 12 ? 'PM' : 'AM');
  }, [visible, initialTime]);

  const selectTime = () => {
    const hour24 = period === 'AM' ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
    onSelect(`${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={[styles.timePickerSheet, { backgroundColor: colors.card }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.pickerTitleRow}>
            <View>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select time</Text>
              <Text style={[styles.timePickerDisplay, { color: PURPLE }]}>{hour}:{String(minute).padStart(2, '0')} {period}</Text>
            </View>
            <View style={styles.pickerHeaderActions}>
              <Feather name="clock" size={26} color={PURPLE} />
              <TouchableOpacity
                style={[styles.pickerCloseBtn, { backgroundColor: colors.secondary }]}
                onPress={onClose}
                accessibilityLabel="Close time picker"
              >
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.pickerSectionLabel, { color: colors.mutedForeground }]}>Hour</Text>
          <View style={styles.timePickerGrid}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <TouchableOpacity key={value} style={[styles.timePickerOption, { borderColor: colors.border }, hour === value && { backgroundColor: PURPLE, borderColor: PURPLE }]} onPress={() => setHour(value)}>
                <Text style={[styles.timePickerOptionText, { color: hour === value ? '#fff' : colors.foreground }]}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.periodPickerRow}>
            {(['AM', 'PM'] as const).map((value) => (
              <TouchableOpacity key={value} style={[styles.periodPickerOption, { borderColor: colors.border }, period === value && { backgroundColor: PURPLE, borderColor: PURPLE }]} onPress={() => setPeriod(value)}>
                <Text style={[styles.periodPickerText, { color: period === value ? '#fff' : colors.foreground }]}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.pickerSectionLabel, { color: colors.mutedForeground }]}>Minute</Text>
          <View style={styles.timePickerGrid}>
            {Array.from({ length: 12 }, (_, index) => index * 5).map((value) => (
              <TouchableOpacity key={value} style={[styles.timePickerOption, { borderColor: colors.border }, minute === value && { backgroundColor: PURPLE, borderColor: PURPLE }]} onPress={() => setMinute(value)}>
                <Text style={[styles.timePickerOptionText, { color: minute === value ? '#fff' : colors.foreground }]}>{String(value).padStart(2, '0')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.pickerConfirmButton, { backgroundColor: PURPLE }]} onPress={selectTime}>
            <Text style={styles.pickerConfirmText}>Set time</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 15,
    gap: 8,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: PURPLE,
    shadowOpacity: 0.2,
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
  pageTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalBadge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  totalBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOnlyBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  viewOnlyText: {
    color: '#fff', fontSize: 7, lineHeight: 8,
    fontFamily: 'Inter_600SemiBold', textAlign: 'center',
  },
  loadingRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    height: 38,
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 0,
  },
  headerText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    paddingVertical: 0,
    paddingHorizontal: 10,
  },
  nameCol: {
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.2)',
  },
  depositsCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 52,
  },
  compactDepositsCol: {
    minHeight: 0,
    height: '100%',
    paddingVertical: 0,
  },
  totalCol: {
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRightWidth: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    minHeight: 52,
  },
  nameText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dotsArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    minHeight: 36,
    paddingRight: 4,
  },
  dotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE_DOT,
  },
  noDepositsText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  plusBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  totalText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
    paddingVertical: 0,
  },
  grandTotalLabel: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: 10,
  },
  grandTotalText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomSheetWrap: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomSheetContent: {
    padding: 20,
    paddingBottom: 36,
  },
  sheetFormList: {
    maxHeight: 320,
  },
  historySheet: {
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  sheetTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
  },
  sheetCloseBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
  },
  sheetSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
    marginTop: 10,
  },
  sheetInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  pickerInput: {
    height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pickerInputText: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  dateTimeRow: {
    flexDirection: 'row',
    marginTop: 0,
  },
  sheetError: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  sheetBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTotal: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  entryDotCol: {
    width: 20,
    alignItems: 'center',
  },
  entryAmount: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  entryDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  entryNote: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginTop: 2,
  },
  closeHistoryBtn: {
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },

  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.46)', justifyContent: 'center', paddingHorizontal: 22,
  },
  datePickerSheet: { borderRadius: 20, padding: 18 },
  timePickerSheet: { borderRadius: 20, padding: 20, maxHeight: '88%' },
  pickerTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  pickerHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  monthSelectRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  monthArrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  monthSelectTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayText: { width: '14.285%', textAlign: 'center', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dateCell: { width: '14.285%', height: 40, alignItems: 'center', justifyContent: 'center' },
  dateNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dateCellText: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 18, includeFontPadding: false },
  timePickerDisplay: { fontSize: 27, fontFamily: 'Inter_700Bold', marginTop: 2 },
  pickerSectionLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  timePickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 15 },
  timePickerOption: {
    width: '14.3%', height: 34, borderWidth: 1, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  timePickerOptionText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  periodPickerRow: { flexDirection: 'row', gap: 10, marginTop: -7, marginBottom: 15 },
  periodPickerOption: {
    flex: 1, height: 36, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  periodPickerText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  pickerConfirmButton: { height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  pickerConfirmText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
});
