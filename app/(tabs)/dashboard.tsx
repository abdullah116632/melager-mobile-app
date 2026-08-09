import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';

import { useColors } from '@/hooks/useColors';
import { useMess } from '@/context/MessContext';
import { useAuth } from '@/context/AuthContext';
import { useDrawer } from '@/context/DrawerContext';
import MonthPicker from '@/components/MonthPicker';
import { NotificationBell } from '@/components/NotificationBell';
import { api, type TodaySchedule, type MonthData } from '@/lib/api';

// ── Date helpers ──────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function currentDate(): string {
  return localDateStr(new Date());
}

function addDays(dateStr: string, n: number): string {
  const [yr, mo, da] = dateStr.split('-').map(Number);
  const d = new Date(yr!, mo! - 1, da!);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

function formatDateLabel(dateStr: string, today: string): string {
  if (dateStr === today) return 'Today';
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((d.getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
}

// ── Amount helpers ─────────────────────────────────────────────────────────────

function fmtAmt(n: number): string {
  if (n === 0) return '0';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtRate(n: number): string {
  if (n === 0) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Blend helpers ─────────────────────────────────────────────────────────────

function getPastMonths(currentYearMonth: string, count = 11): string[] {
  const [yearStr, monthStr] = currentYearMonth.split('-');
  let year = parseInt(yearStr ?? '2024', 10);
  let month = parseInt(monthStr ?? '1', 10);
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    month--;
    if (month < 1) { month = 12; year--; }
    months.push(`${year}-${month.toString().padStart(2, '0')}`);
  }
  return months;
}

function formatMonthChip(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[(m ?? 1) - 1]} '${(y ?? 2024).toString().slice(2)}`;
}

// ── Table constants ───────────────────────────────────────────────────────────

const NAME_W  = 110;
const MEALS_W =  52;
const COST_W  =  82;
const DEP_W   =  82;
const BAL_W   =  90;
const ROW_PX  =  10;
const TABLE_INNER_W = NAME_W + MEALS_W + COST_W + DEP_W + BAL_W + ROW_PX * 2;

type MealType = 'breakfast' | 'lunch' | 'dinner';
const MEAL_LABELS: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const MEAL_ICONS: Record<MealType, string>  = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

// ── MealBox ───────────────────────────────────────────────────────────────────

interface MealBoxProps {
  type: MealType;
  schedule: TodaySchedule | null;
  myOptOuts: Set<string>;
  pending: boolean;
  canInteract: boolean;
  onPress: (type: MealType) => void;
}

function MenuMarquee({ menu, color }: { menu: string; color: string }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const gap = 28;
  // Reserve width from the complete string length so React Native never
  // measures this text as only the visible card-width portion.
  const marqueeWidth = Math.max(180, menu.length * 12 + 32);

  useEffect(() => {
    translateX.setValue(0);
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -(marqueeWidth + gap),
        duration: Math.max(4000, (marqueeWidth + gap) * 28),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [gap, marqueeWidth, translateX]);

  return (
    <View style={styles.menuMarqueeViewport}>
      <Animated.View style={[styles.menuMarqueeTrack, { transform: [{ translateX }] }]}>
        <Text
          style={[styles.mealBoxMenu, styles.menuMarqueeText, { color, width: marqueeWidth }]}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {menu}
        </Text>
        <Text
          style={[styles.mealBoxMenu, styles.menuMarqueeText, { color, marginLeft: gap, width: marqueeWidth }]}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {menu}
        </Text>
      </Animated.View>
    </View>
  );
}

function MealBox({ type, schedule, myOptOuts, pending, canInteract, onPress }: MealBoxProps) {
  const enabled = schedule ? (schedule.schedule as any)[`${type}Enabled`] as boolean : true;
  const menu: string | null = schedule ? (schedule.schedule as any)[`${type}Menu`] as string | null : null;
  const isOptedOut = myOptOuts.has(type);

  let bg: string, border: string, labelColor: string, statusText: string, statusColor: string;
  if (!enabled) {
    bg = '#F3F4F6'; border = '#E5E7EB'; labelColor = '#9CA3AF';
    statusText = 'Disabled'; statusColor = '#9CA3AF';
  } else if (isOptedOut) {
    bg = '#FEF2F2'; border = '#FECACA'; labelColor = '#DC2626';
    statusText = 'Turned Off'; statusColor = '#DC2626';
  } else {
    bg = '#F0FDFA'; border = '#6EE7B7'; labelColor = '#065F46';
    statusText = 'Active'; statusColor = '#059669';
  }

  const tappable = enabled && canInteract && !pending;

  return (
    <TouchableOpacity
      style={[styles.mealBox, { backgroundColor: bg, borderColor: border, opacity: canInteract ? 1 : 0.7 }]}
      onPress={() => tappable && onPress(type)}
      activeOpacity={tappable ? 0.75 : 1}
      disabled={!tappable}
    >
      <Text style={styles.mealBoxIcon}>{MEAL_ICONS[type]}</Text>
      <Text style={[styles.mealBoxLabel, { color: labelColor }]}>{MEAL_LABELS[type]}</Text>
      {menu ? (
        <MenuMarquee menu={menu} color={labelColor} />
      ) : null}
      {pending ? (
        <ActivityIndicator size="small" color={statusColor} style={{ marginTop: 4 }} />
      ) : (
        <Text style={[styles.mealBoxStatus, { color: statusColor }]}>{statusText}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── HomeScreen ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mess, role, token } = useAuth();
  const { openDrawer } = useDrawer();
  const isAdmin = role === 'admin';

  const {
    consumers, currentYearMonth,
    getGrandTotal, getMonthExpenseTotal, getGrandDepositTotal,
    getConsumerTotal, getConsumerDepositTotal,
    refreshMonth,
  } = useMess();

  // ── Date navigation ────────────────────────────────────────────────────────
  const today = currentDate();
  const maxFutureDate = addDays(today, 3);
  const [selectedDate, setSelectedDate] = useState(today);
  const [keyCopied, setKeyCopied] = useState(false);
  const isPast   = selectedDate < today;
  const isToday  = selectedDate === today;
  const isFuture = selectedDate > today;
  const isAtFutureLimit = selectedDate >= maxFutureDate;

  const goToPrev  = () => setSelectedDate((d) => addDays(d, -1));
  const goToNext  = () => setSelectedDate((d) => d >= maxFutureDate ? d : addDays(d, +1));
  const goToToday = () => setSelectedDate(today);

  const copyMessKey = useCallback(async () => {
    if (!mess?.messKey) return;
    await Clipboard.setStringAsync(mess.messKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1800);
  }, [mess?.messKey]);

  // ── Today schedule ─────────────────────────────────────────────────────────
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule | null>(null);
  const [myOptOuts, setMyOptOuts] = useState<Set<string>>(new Set());
  const [optOutPending, setOptOutPending] = useState<Set<string>>(new Set());

  const fetchSchedule = useCallback(async (date: string) => {
    if (!token || !mess) return;
    try {
      const data = await api.getTodaySchedule(mess.id, token, date);
      setTodaySchedule(data);
      setMyOptOuts(new Set(data.myOptOuts));
    } catch {
      // Silently ignore
    }
  }, [token, mess?.id]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshMonth(), fetchSchedule(selectedDate)]).catch(() => {});
    setRefreshing(false);
  }, [refreshMonth, fetchSchedule, selectedDate]);

  useEffect(() => {
    setTodaySchedule(null);
    fetchSchedule(selectedDate);
  }, [fetchSchedule, selectedDate]);

  const doOptOut = async (type: MealType) => {
    if (!token || !mess) return;
    const wasOptedOut = myOptOuts.has(type);
    setOptOutPending((p) => new Set([...p, type]));
    setMyOptOuts((prev) => {
      const next = new Set(prev);
      wasOptedOut ? next.delete(type) : next.add(type);
      return next;
    });
    try {
      await api.toggleMealOptOut(mess.id, selectedDate, type, token);
      fetchSchedule(selectedDate);
    } catch (e) {
      setMyOptOuts((prev) => {
        const next = new Set(prev);
        wasOptedOut ? next.add(type) : next.delete(type);
        return next;
      });
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update meal preference');
    } finally {
      setOptOutPending((p) => {
        const next = new Set(p);
        next.delete(type);
        return next;
      });
    }
  };

  const handleOptOut = (type: MealType) => {
    if (!token || !mess || !todaySchedule) return;
    if (isPast) {
      Alert.alert('Past Date', 'You cannot change meal on/off for past dates.');
      return;
    }
    const wasOptedOut = myOptOuts.has(type);
    const mealLabel = MEAL_LABELS[type];
    const action = wasOptedOut ? 'turn on' : 'turn off';
    Alert.alert(
      'Are you sure?',
      `Do you want to ${action} ${mealLabel}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => doOptOut(type) },
      ],
    );
  };

  // ── Blend months ───────────────────────────────────────────────────────────
  const [blendPhase, setBlendPhase] = useState<'off' | 'selecting' | 'applied'>('off');
  const [pendingMonths, setPendingMonths] = useState<string[]>([]);
  const [appliedMonths, setAppliedMonths] = useState<string[]>([]);
  const [extraData, setExtraData] = useState<Record<string, MonthData>>({});
  const [summarySending, setSummarySending] = useState(false);

  useEffect(() => {
    if (blendPhase === 'off' || !token || !mess) return;
    const monthsToFetch = blendPhase === 'selecting' ? pendingMonths : appliedMonths;
    for (const ym of monthsToFetch) {
      if (!extraData[ym]) {
        api.getMonthData(ym, token, mess.id)
          .then((d) => setExtraData((prev) => ({ ...prev, [ym]: d })))
          .catch(() => {});
      }
    }
  }, [pendingMonths, appliedMonths, blendPhase, token, mess?.id]);

  const startBlend = () => { setPendingMonths([]); setBlendPhase('selecting'); };
  const cancelBlend = () => { setPendingMonths([]); setAppliedMonths([]); setBlendPhase('off'); };
  const applyBlend  = () => { setAppliedMonths(pendingMonths); setBlendPhase('applied'); };

  const activeMonths = blendPhase === 'applied' ? [currentYearMonth, ...appliedMonths] : [currentYearMonth];

  const sumMealsForMonth = (ym: string): number => {
    if (ym === currentYearMonth) return getGrandTotal(ym);
    const d = extraData[ym]; if (!d) return 0;
    return consumers.reduce((sum, c) => {
      const m = (d.meals as Record<string, Record<string, number>>)[c.id] ?? {};
      return sum + Object.values(m).reduce((s, v) => s + v, 0);
    }, 0);
  };

  const sumExpensesForMonth = (ym: string): number => {
    if (ym === currentYearMonth) return getMonthExpenseTotal(ym);
    const d = extraData[ym]; if (!d) return 0;
    return Object.values(d.expenses).reduce((sum, day) => {
      return sum + (day as { items: Array<{ amount: number }> }).items.reduce((s, i) => s + i.amount, 0);
    }, 0);
  };

  const sumDepositsForMonth = (ym: string): number => {
    if (ym === currentYearMonth) return getGrandDepositTotal(ym);
    const d = extraData[ym]; if (!d) return 0;
    return consumers.reduce((sum, c) => {
      const dep = (d.deposits as Record<string, Record<string, number>>)[c.id] ?? {};
      return sum + Object.values(dep).reduce((s, v) => s + v, 0);
    }, 0);
  };

  const sumConsumerMeals = (ym: string, cId: string): number => {
    if (ym === currentYearMonth) return getConsumerTotal(ym, cId);
    const d = extraData[ym]; if (!d) return 0;
    const m = (d.meals as Record<string, Record<string, number>>)[cId] ?? {};
    return Object.values(m).reduce((s, v) => s + v, 0);
  };

  const sumConsumerDeposits = (ym: string, cId: string): number => {
    if (ym === currentYearMonth) return getConsumerDepositTotal(ym, cId);
    const d = extraData[ym]; if (!d) return 0;
    const dep = (d.deposits as Record<string, Record<string, number>>)[cId] ?? {};
    return Object.values(dep).reduce((s, v) => s + v, 0);
  };

  const totalMeals    = activeMonths.reduce((sum, ym) => sum + sumMealsForMonth(ym), 0);
  const totalExpenses = activeMonths.reduce((sum, ym) => sum + sumExpensesForMonth(ym), 0);
  const totalDeposits = activeMonths.reduce((sum, ym) => sum + sumDepositsForMonth(ym), 0);
  const mealRate      = totalMeals > 0 ? totalExpenses / totalMeals : 0;

  const consumerRows = consumers.map((c) => {
    const meals    = activeMonths.reduce((sum, ym) => sum + sumConsumerMeals(ym, c.id), 0);
    const cost     = meals * mealRate;
    const deposits = activeMonths.reduce((sum, ym) => sum + sumConsumerDeposits(ym, c.id), 0);
    return { id: c.id, name: c.name, meals, cost, deposits, balance: deposits - cost };
  });

  const netBalance = totalDeposits - totalExpenses;

  const handleSendSummary = () => {
    if (!mess || !token) return;
    const doSend = async () => {
      setSummarySending(true);
      try {
        const { sent, total } = await api.sendMonthlySummary(mess.id, currentYearMonth, token);
        Alert.alert('Summary Sent', `Sent to ${sent} of ${total} members with email addresses.`);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send summaries.');
      } finally { setSummarySending(false); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Send the ${currentYearMonth} monthly summary to all members?`)) doSend();
      return;
    }
    Alert.alert(
      'Send Monthly Summary',
      `Email the ${currentYearMonth} breakdown to all members?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Send Emails', onPress: doSend }],
    );
  };

  const handleSendBlendedSummary = () => {
    if (!mess || !token) return;
    const allMonths = [currentYearMonth, ...appliedMonths];
    const label = `${allMonths.length}-month blend`;
    const doSend = async () => {
      setSummarySending(true);
      try {
        const { sent, total } = await api.sendBlendedSummary(mess.id, allMonths, token);
        Alert.alert('Summary Sent', `Sent to ${sent} of ${total} members with email addresses.`);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send summaries.');
      } finally { setSummarySending(false); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Send the ${label} summary to all members?`)) doSend();
      return;
    }
    Alert.alert(
      'Send Blended Summary',
      `Email the ${label} breakdown to all members?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Send Emails', onPress: doSend }],
    );
  };

  const topPadding    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 49;
  const pastMonths    = getPastMonths(currentYearMonth);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { backgroundColor: colors.primary }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={openDrawer} activeOpacity={0.7}>
          <Feather name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          {mess && <Text style={styles.messName}>{mess.name}</Text>}
        </View>
        <NotificationBell />
        <TouchableOpacity
          style={styles.keyBadge}
          onPress={copyMessKey}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Copy mess key"
        >
          <Feather name="key" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={styles.keyText}>{mess?.messKey ?? '——'}</Text>
          <Feather name={keyCopied ? 'check' : 'copy'} size={13} color={keyCopied ? '#A7F3D0' : 'rgba(255,255,255,0.78)'} />
        </TouchableOpacity>
      </View>

      <MonthPicker />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0e7871" colors={['#0e7871']} />}
      >
        {/* ── Meal Boxes ──────────────────────────────────────────────────── */}
        <View style={[styles.mealSection, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Date navigator */}
          <View style={styles.dateNav}>
            <TouchableOpacity style={styles.dateNavBtn} onPress={goToPrev} activeOpacity={0.7}>
              <Feather name="chevron-left" size={20} color={colors.foreground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateCenterWrap}
              onPress={isToday ? undefined : goToToday}
              activeOpacity={isToday ? 1 : 0.7}
            >
              <Text style={[styles.datePrimary, { color: colors.foreground }]}>
                {formatDateLabel(selectedDate, today)}
              </Text>
              {!isToday && (
                <Text style={[styles.dateSecondary, { color: colors.primary }]}>
                  {formatFullDate(selectedDate)} · Tap for Today
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateNavBtn, isAtFutureLimit && { opacity: 0.35 }]}
              onPress={goToNext}
              activeOpacity={0.7}
              disabled={isAtFutureLimit}
            >
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Past/Future banner */}
          {isPast && (
            <View style={styles.dateBanner}>
              <Feather name="lock" size={12} color="#92400E" />
              <Text style={styles.dateBannerText}>Past date — view only, meal on/off locked</Text>
            </View>
          )}
          {isFuture && (
            <View style={[styles.dateBanner, styles.dateBannerFuture]}>
              <Feather name="calendar" size={12} color="#1E40AF" />
              <Text style={[styles.dateBannerText, { color: '#1E40AF' }]}>Future date — meal on/off allowed</Text>
            </View>
          )}

          {/* Admin bar */}
          {isAdmin && (
            <View style={styles.adminBar}>
              {todaySchedule ? (
                <View style={styles.mealCountRow}>
                  {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((type) => {
                    const enabled = todaySchedule.schedule[`${type}Enabled` as keyof typeof todaySchedule.schedule] as boolean;
                    const count = todaySchedule.activeByMeal[type];
                    return (
                      <View key={type} style={styles.mealCountChip}>
                        <Text style={styles.mealCountIcon}>{MEAL_ICONS[type]}</Text>
                        <Text style={[styles.mealCountNum, { color: enabled ? '#059669' : '#9CA3AF' }]}>
                          {enabled ? count : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => router.push((`/meal-status?date=${selectedDate}`) as any)}
                activeOpacity={0.75}
              >
                <Feather name="settings" size={13} color="#0F766E" />
                <Text style={styles.manageBtnText}>Manage</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.mealBoxRow}>
            {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((type) => (
              <MealBox
                key={type}
                type={type}
                schedule={todaySchedule}
                myOptOuts={myOptOuts}
                pending={optOutPending.has(type)}
                canInteract={!isPast}
                onPress={handleOptOut}
              />
            ))}
          </View>

          {!isAdmin && !isPast && (
            <Text style={[styles.mealHint, { color: colors.mutedForeground }]}>
              Tap a meal to turn it on or off
            </Text>
          )}
        </View>

        {/* ── Summary cards ───────────────────────────────────────────────── */}
        <View style={styles.cardsGrid}>
          <SummaryCard icon="coffee"       label="Total Meals"    value={totalMeals.toString()}                         bg="#ECFDF5" iconColor="#059669" />
          <SummaryCard icon="shopping-bag" label="Total Expenses" value={`৳${fmtAmt(totalExpenses)}`}                  bg="#FFF7ED" iconColor="#EA580C" />
          <SummaryCard icon="archive"      label="Total Deposits" value={`৳${fmtAmt(totalDeposits)}`}                  bg="#EFF6FF" iconColor="#3B82F6" />
          <SummaryCard icon="tag"          label="Meal Rate"      value={mealRate > 0 ? `৳${fmtRate(mealRate)}` : '—'} bg="#F5F3FF" iconColor="#7C3AED" sub={mealRate > 0 ? 'per meal' : 'no meals yet'} />
        </View>

        {/* ── Consumer table ───────────────────────────────────────────────── */}
        {consumers.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No consumers yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Add consumers from the Meals tab</Text>
          </View>
        ) : (
          <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

            <View style={styles.tableCardHeader}>
              <Text style={[styles.tableTitle, { color: colors.foreground }]}>
                Consumer Breakdown
                {blendPhase === 'applied' && appliedMonths.length > 0 && (
                  <Text style={{ color: '#7C3AED', fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                    {`  (${1 + appliedMonths.length} months)`}
                  </Text>
                )}
              </Text>
              {isAdmin && (
                blendPhase === 'off' ? (
                  <TouchableOpacity style={styles.blendToggle} onPress={startBlend} activeOpacity={0.75}>
                    <Feather name="layers" size={13} color={colors.mutedForeground} />
                    <Text style={styles.blendToggleText}>Blend</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.blendToggle, styles.blendToggleCancel]} onPress={cancelBlend} activeOpacity={0.75}>
                    <Feather name="x" size={13} color="#DC2626" />
                    <Text style={[styles.blendToggleText, styles.blendToggleCancelText]}>Cancel</Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {isAdmin && blendPhase === 'selecting' && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
                  {pastMonths.map((ym) => {
                    const sel = pendingMonths.includes(ym);
                    return (
                      <TouchableOpacity
                        key={ym}
                        style={[styles.chip, sel && styles.chipSel]}
                        onPress={() => setPendingMonths((prev) => sel ? prev.filter((m) => m !== ym) : [...prev, ym])}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, sel && styles.chipTextSel]}>{formatMonthChip(ym)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {pendingMonths.length > 0 && (
                  <TouchableOpacity style={styles.applyBtn} onPress={applyBlend} activeOpacity={0.8}>
                    <Feather name="check" size={14} color="#fff" />
                    <Text style={styles.applyBtnText}>Apply ({1 + pendingMonths.length} months)</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
              <View style={{ width: TABLE_INNER_W }}>
                <View style={[styles.tableRow, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.th, { width: NAME_W }]}>Consumer</Text>
                  <Text style={[styles.th, styles.thR, { width: MEALS_W }]}>Meals</Text>
                  <Text style={[styles.th, styles.thR, { width: COST_W }]}>Cost</Text>
                  <Text style={[styles.th, styles.thR, { width: DEP_W }]}>Deposit</Text>
                  <Text style={[styles.th, styles.thR, { width: BAL_W }]}>Balance</Text>
                </View>

                {consumerRows.map((row, idx) => {
                  const balPos = row.balance > 0.005;
                  const balNeg = row.balance < -0.005;
                  const balColor = balPos ? '#059669' : balNeg ? '#DC2626' : colors.mutedForeground;
                  return (
                    <View key={row.id} style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? colors.card : colors.rowAlt, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, height: 46 }]}>
                      <Text style={[styles.td, { width: NAME_W, color: colors.foreground }]} numberOfLines={1}>{row.name}</Text>
                      <Text style={[styles.td, styles.tdR, { width: MEALS_W, color: colors.foreground }]}>{row.meals}</Text>
                      <Text style={[styles.td, styles.tdR, { width: COST_W, color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>৳{fmtAmt(row.cost)}</Text>
                      <Text style={[styles.td, styles.tdR, { width: DEP_W, color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>৳{fmtAmt(row.deposits)}</Text>
                      <Text style={[styles.td, styles.tdR, { width: BAL_W, color: balColor, fontFamily: 'Inter_700Bold' as const }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {balPos ? '+' : ''}৳{fmtAmt(Math.abs(row.balance))}
                      </Text>
                    </View>
                  );
                })}

                <View style={[styles.tableRow, { backgroundColor: colors.primary, height: 46 }]}>
                  <Text style={[styles.tf, { width: NAME_W }]}>Total</Text>
                  <Text style={[styles.tf, styles.tfR, { width: MEALS_W }]}>{totalMeals}</Text>
                  <Text style={[styles.tf, styles.tfR, { width: COST_W }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>৳{fmtAmt(totalExpenses)}</Text>
                  <Text style={[styles.tf, styles.tfR, { width: DEP_W }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>৳{fmtAmt(totalDeposits)}</Text>
                  <Text style={[styles.tf, styles.tfR, { width: BAL_W, color: netBalance >= 0 ? '#A7F3D0' : '#FCA5A5' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {netBalance >= 0 ? '+' : ''}৳{fmtAmt(Math.abs(netBalance))}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.legend, { borderTopColor: colors.border }]}>
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                {blendPhase === 'applied' && appliedMonths.length > 0
                  ? `Blending ${1 + appliedMonths.length} months · rate ৳${fmtRate(mealRate)}/meal`
                  : mealRate > 0 ? `Balance = Deposit − (Meals × ৳${fmtRate(mealRate)}/meal)` : 'Balance = Deposit − Cost'}
              </Text>
            </View>
          </View>
        )}

        {isAdmin && blendPhase === 'off' && (
          <TouchableOpacity
            style={[styles.summaryBtn, { opacity: summarySending ? 0.6 : 1 }]}
            onPress={handleSendSummary}
            disabled={summarySending}
            activeOpacity={0.8}
          >
            {summarySending ? <ActivityIndicator size={16} color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
            <Text style={styles.summaryBtnText}>
              {summarySending ? 'Sending…' : 'Email Monthly Summary to Members'}
            </Text>
          </TouchableOpacity>
        )}
        {isAdmin && blendPhase === 'applied' && appliedMonths.length > 0 && (
          <TouchableOpacity
            style={[styles.summaryBtn, styles.summaryBtnBlend, { opacity: summarySending ? 0.6 : 1 }]}
            onPress={handleSendBlendedSummary}
            disabled={summarySending}
            activeOpacity={0.8}
          >
            {summarySending ? <ActivityIndicator size={16} color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
            <Text style={styles.summaryBtnText}>
              {summarySending ? 'Sending…' : `Email ${1 + appliedMonths.length}-Month Blend to Members`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ── SummaryCard ───────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, bg, iconColor, sub }: { icon: string; label: string; value: string; bg: string; iconColor: string; sub?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardIconWrap, { backgroundColor: bg }]}>
        <Feather name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.cardValue, { color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  pageHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  menuBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  pageTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.1 },
  messName: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  keyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  keyText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 2 },

  // Meal section
  mealSection: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },

  dateNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8 },
  dateNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dateCenterWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  datePrimary: { fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  dateSecondary: { fontSize: 10, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 2 },

  dateBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FDE68A',
  },
  dateBannerFuture: { backgroundColor: '#EFF6FF', borderBottomColor: '#BFDBFE' },
  dateBannerText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#92400E' },

  adminBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10 },
  activeCount: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  mealCountRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  mealCountChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F0FDFA', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  mealCountIcon: { fontSize: 13 },
  mealCountNum: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#F0FDFA', borderRadius: 20, borderWidth: 1, borderColor: '#CCFBF1' },
  manageBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#0F766E' },

  mealBoxRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  mealBox: { flex: 1, borderRadius: 14, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 3 },
  mealBoxIcon: { fontSize: 22 },
  mealBoxLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  mealBoxMenu: { fontSize: 10, fontFamily: 'Inter_400Regular', opacity: 0.8 },
  menuMarqueeViewport: { width: '100%', height: 14, overflow: 'hidden', justifyContent: 'center' },
  menuMarqueeTrack: { flexDirection: 'row', alignItems: 'center' },
  menuMarqueeText: { flexShrink: 0, lineHeight: 14 },
  mealBoxStatus: { fontSize: 10, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  mealHint: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingBottom: 10 },

  // Cards
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 20 },
  card: { width: '47%', borderRadius: 18, padding: 16, borderWidth: 1, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  cardValue: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  cardSub: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  // Table
  tableCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  tableCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  tableTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  blendToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB' },
  blendToggleCancel: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  blendToggleText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6B7280' },
  blendToggleCancelText: { color: '#DC2626' },
  chipScroll: { marginBottom: 6, marginTop: 4 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', marginHorizontal: 14, marginBottom: 10, paddingVertical: 9, borderRadius: 10 },
  applyBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  chipSel: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  chipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6B7280' },
  chipTextSel: { color: '#7C3AED' },

  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: ROW_PX, height: 38 },
  th:  { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  thR: { textAlign: 'right' },
  td:  { fontSize: 13, fontFamily: 'Inter_400Regular' },
  tdR: { textAlign: 'right', fontFamily: 'Inter_500Medium' },
  tf:  { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
  tfR: { textAlign: 'right' },
  legend: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  legendText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  summaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563EB', marginHorizontal: 16, marginTop: 12, paddingVertical: 14, borderRadius: 14 },
  summaryBtnBlend: { backgroundColor: '#7C3AED' },
  summaryBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  emptySubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
