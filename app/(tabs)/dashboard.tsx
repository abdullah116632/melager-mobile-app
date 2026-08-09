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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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

// ── Accounting range helpers ─────────────────────────────────────────────────

function monthRange(startDate: string, endDate: string): string[] {
  const [startYear, startMonth] = startDate.slice(0, 7).split('-').map(Number);
  const [endYear, endMonth] = endDate.slice(0, 7).split('-').map(Number);
  const months: string[] = [];
  let year = startYear!;
  let month = startMonth!;
  while (year < endYear! || (year === endYear && month <= endMonth!)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return months;
}

function monthBounds(yearMonth: string, startDate: string, endDate: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  const firstDay = yearMonth === startDate.slice(0, 7) ? Number(startDate.slice(8, 10)) : 1;
  const lastOfMonth = new Date(year!, month!, 0).getDate();
  const lastDay = yearMonth === endDate.slice(0, 7) ? Number(endDate.slice(8, 10)) : lastOfMonth;
  return { firstDay, lastDay };
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

  // ── Inclusive accounting date range ───────────────────────────────────────
  const defaultStartDate = `${currentYearMonth}-01`;
  const [defaultYear, defaultMonth] = currentYearMonth.split('-').map(Number);
  const defaultEndDate = `${currentYearMonth}-${String(new Date(defaultYear!, defaultMonth!, 0).getDate()).padStart(2, '0')}`;
  const [draftStartDate, setDraftStartDate] = useState(defaultStartDate);
  const [draftEndDate, setDraftEndDate] = useState(defaultEndDate);
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [rangeData, setRangeData] = useState<Record<string, MonthData>>({});
  const [rangeLoading, setRangeLoading] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);
  const [showTableScrollHint, setShowTableScrollHint] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [summarySending, setSummarySending] = useState(false);
  const appliedStartDate = appliedRange?.startDate ?? defaultStartDate;
  const appliedEndDate = appliedRange?.endDate ?? defaultEndDate;
  const hasUnappliedDateChange =
    draftStartDate !== appliedStartDate || draftEndDate !== appliedEndDate;

  useEffect(() => {
    setDraftStartDate(defaultStartDate);
    setDraftEndDate(defaultEndDate);
    setAppliedRange(null);
    setRangeData({});
  }, [currentYearMonth, mess?.id]);

  const fetchRange = useCallback(async (startDate: string, endDate: string) => {
    if (!token || !mess) return null;
    const months = monthRange(startDate, endDate);
    const results = await Promise.all(months.map(async (yearMonth) => [
      yearMonth,
      await api.getMonthData(yearMonth, token, mess.id),
    ] as const));
    return Object.fromEntries(results) as Record<string, MonthData>;
  }, [token, mess?.id]);

  const applyDateRange = async () => {
    if (draftEndDate <= draftStartDate) {
      Alert.alert('Invalid Date Range', 'End date must be later than start date.');
      return;
    }
    setRangeLoading(true);
    try {
      const data = await fetchRange(draftStartDate, draftEndDate);
      if (!data) return;
      setRangeData(data);
      setAppliedRange({ startDate: draftStartDate, endDate: draftEndDate });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load the selected date range.');
    } finally {
      setRangeLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMonth();
      const refreshedRange = appliedRange
        ? await fetchRange(appliedRange.startDate, appliedRange.endDate)
        : null;
      if (refreshedRange) setRangeData(refreshedRange);
      await fetchSchedule(selectedDate);
    } catch {
      // Keep the last successfully loaded figures visible during a refresh failure.
    } finally {
      setRefreshing(false);
    }
  }, [refreshMonth, fetchSchedule, selectedDate, fetchRange, appliedRange]);

  const activeMonths = appliedRange
    ? monthRange(appliedRange.startDate, appliedRange.endDate)
    : [currentYearMonth];

  const dayIsIncluded = (yearMonth: string, day: number) => {
    if (!appliedRange) return true;
    const { firstDay, lastDay } = monthBounds(yearMonth, appliedRange.startDate, appliedRange.endDate);
    return day >= firstDay && day <= lastDay;
  };

  const sumMealsForMonth = (ym: string): number => {
    if (!appliedRange && ym === currentYearMonth) return getGrandTotal(ym);
    const data = rangeData[ym];
    if (!data) return 0;
    return consumers.reduce((sum, consumer) => {
      const days = data.meals[consumer.id] ?? {};
      return sum + Object.entries(days).reduce(
        (daySum, [day, count]) => daySum + (dayIsIncluded(ym, Number(day)) ? count : 0), 0,
      );
    }, 0);
  };

  const sumExpensesForMonth = (ym: string): number => {
    if (!appliedRange && ym === currentYearMonth) return getMonthExpenseTotal(ym);
    const data = rangeData[ym];
    if (!data) return 0;
    return Object.entries(data.expenses).reduce((sum, [day, expense]) => {
      if (!dayIsIncluded(ym, Number(day))) return sum;
      return sum + expense.items.reduce((itemSum, item) => itemSum + item.amount, 0);
    }, 0);
  };

  const sumDepositsForMonth = (ym: string): number => {
    if (!appliedRange && ym === currentYearMonth) return getGrandDepositTotal(ym);
    const data = rangeData[ym];
    if (!data) return 0;
    return consumers.reduce((sum, consumer) => {
      const days = data.deposits[consumer.id] ?? {};
      return sum + Object.entries(days).reduce(
        (daySum, [day, amount]) => daySum + (dayIsIncluded(ym, Number(day)) ? amount : 0), 0,
      );
    }, 0);
  };

  const sumConsumerMeals = (ym: string, consumerId: string): number => {
    if (!appliedRange && ym === currentYearMonth) return getConsumerTotal(ym, consumerId);
    const days = rangeData[ym]?.meals[consumerId] ?? {};
    return Object.entries(days).reduce(
      (sum, [day, count]) => sum + (dayIsIncluded(ym, Number(day)) ? count : 0), 0,
    );
  };

  const sumConsumerDeposits = (ym: string, consumerId: string): number => {
    if (!appliedRange && ym === currentYearMonth) return getConsumerDepositTotal(ym, consumerId);
    const days = rangeData[ym]?.deposits[consumerId] ?? {};
    return Object.entries(days).reduce(
      (sum, [day, amount]) => sum + (dayIsIncluded(ym, Number(day)) ? amount : 0), 0,
    );
  };

  const totalMeals = activeMonths.reduce((sum, ym) => sum + sumMealsForMonth(ym), 0);
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

  const downloadBreakdownPdf = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    const periodStart = appliedRange?.startDate ?? defaultStartDate;
    const periodEnd = appliedRange?.endDate ?? defaultEndDate;
    const balanceColor = netBalance >= 0 ? '#047857' : '#DC2626';
    const rowsHtml = consumerRows.map((row, index) => {
      const rowBalanceColor = row.balance >= 0 ? '#047857' : '#DC2626';
      const rowBalanceSign = row.balance >= 0 ? '+' : '-';
      return `
        <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
          <td class="member">${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.meals)}</td>
          <td>BDT ${escapeHtml(fmtAmt(row.cost))}</td>
          <td>BDT ${escapeHtml(fmtAmt(row.deposits))}</td>
          <td style="color:${rowBalanceColor};font-weight:700">${rowBalanceSign}BDT ${escapeHtml(fmtAmt(Math.abs(row.balance)))}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 landscape; margin: 14mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #17202A; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0F766E; padding-bottom: 12px; margin-bottom: 14px; }
            .brand { color: #0F766E; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
            h1 { margin: 5px 0 4px; font-size: 25px; color: #111827; }
            .mess { color: #4B5563; font-size: 12px; }
            .period { text-align: right; padding: 9px 12px; border: 1px solid #99F6E4; border-radius: 8px; background: #F0FDFA; }
            .period-label { color: #0F766E; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
            .period-value { margin-top: 4px; font-size: 12px; font-weight: 700; }
            .metrics { display: flex; gap: 8px; margin-bottom: 15px; }
            .metric { flex: 1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 9px 10px; background: #FFFFFF; }
            .metric.balance { border-color: ${netBalance >= 0 ? '#A7F3D0' : '#FECACA'}; background: ${netBalance >= 0 ? '#ECFDF5' : '#FEF2F2'}; }
            .metric-label { color: #6B7280; font-size: 8px; font-weight: 700; letter-spacing: .7px; text-transform: uppercase; }
            .metric-value { margin-top: 4px; font-size: 16px; font-weight: 700; color: #111827; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            thead { display: table-header-group; }
            th { padding: 9px 10px; color: #FFFFFF; background: #0F766E; font-size: 9px; letter-spacing: .5px; text-transform: uppercase; text-align: right; }
            th:first-child { width: 34%; text-align: left; border-radius: 7px 0 0 0; }
            th:last-child { border-radius: 0 7px 0 0; }
            td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; text-align: right; }
            td.member { text-align: left; font-weight: 600; }
            tr.even td { background: #FFFFFF; }
            tr.odd td { background: #F8FAFC; }
            tfoot td { padding: 10px; color: #FFFFFF; background: #0F766E; border: 0; font-weight: 700; }
            .note { margin-top: 10px; color: #6B7280; font-size: 9px; }
            .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 8px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Mess Manager</div>
              <h1>Consumer Breakdown</h1>
              <div class="mess">${escapeHtml(mess?.name ?? 'Mess')}</div>
            </div>
            <div class="period">
              <div class="period-label">Selected period</div>
              <div class="period-value">${escapeHtml(shortDate(periodStart))} - ${escapeHtml(shortDate(periodEnd))}</div>
            </div>
          </div>
          <div class="metrics">
            <div class="metric"><div class="metric-label">Total meals</div><div class="metric-value">${escapeHtml(totalMeals)}</div></div>
            <div class="metric"><div class="metric-label">Total expenses</div><div class="metric-value">BDT ${escapeHtml(fmtAmt(totalExpenses))}</div></div>
            <div class="metric"><div class="metric-label">Total deposits</div><div class="metric-value">BDT ${escapeHtml(fmtAmt(totalDeposits))}</div></div>
            <div class="metric"><div class="metric-label">Meal rate</div><div class="metric-value">${mealRate > 0 ? `BDT ${escapeHtml(fmtRate(mealRate))}` : '-'}</div></div>
            <div class="metric balance"><div class="metric-label">Current balance</div><div class="metric-value" style="color:${balanceColor}">${netBalance >= 0 ? '+' : '-'}BDT ${escapeHtml(fmtAmt(Math.abs(netBalance)))}</div></div>
          </div>
          <table>
            <thead><tr><th>Consumers (${consumers.length})</th><th>Meals</th><th>Cost</th><th>Deposit</th><th>Balance</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot><tr><td>Total</td><td>${escapeHtml(totalMeals)}</td><td>BDT ${escapeHtml(fmtAmt(totalExpenses))}</td><td>BDT ${escapeHtml(fmtAmt(totalDeposits))}</td><td>${netBalance >= 0 ? '+' : '-'}BDT ${escapeHtml(fmtAmt(Math.abs(netBalance)))}</td></tr></tfoot>
          </table>
          <div class="note">Balance = Deposit - (Meals x meal rate). The selected start and end dates are both included.</div>
          <div class="footer">Generated ${escapeHtml(new Date().toLocaleString('en-GB'))}</div>
        </body>
      </html>`;

    try {
      const result = await Print.printToFileAsync({ html });
      if (Platform.OS === 'web') return;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Save or share Consumer Breakdown PDF',
        });
      } else {
        await Print.printAsync({ uri: result.uri });
      }
    } catch (error) {
      Alert.alert('PDF Error', error instanceof Error ? error.message : 'Could not generate the PDF.');
    } finally {
      setPdfGenerating(false);
    }
  };

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

  const topPadding    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 49;

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
          <View
            style={[
              styles.balanceHeroCard,
              {
                backgroundColor: '#FFFFFF',
                borderColor: netBalance >= 0 ? '#A7F3D0' : '#FECACA',
              },
            ]}
          >
            <View style={[styles.balanceHeroIcon, { backgroundColor: netBalance >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
              <Feather
                name={netBalance >= 0 ? 'trending-up' : 'trending-down'}
                size={23}
                color={netBalance >= 0 ? '#059669' : '#DC2626'}
              />
            </View>
            <View style={styles.balanceHeroTextWrap}>
              <Text style={[styles.balanceHeroLabel, { color: netBalance >= 0 ? '#065F46' : '#991B1B' }]}>Current Balance</Text>
              <Text style={[styles.balanceHeroSub, { color: netBalance >= 0 ? '#047857' : '#B91C1C' }]}>Total deposits minus total expenses</Text>
            </View>
            <Text
              style={[styles.balanceHeroValue, { color: netBalance >= 0 ? '#059669' : '#DC2626' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {netBalance >= 0 ? '+' : '-'}৳{fmtAmt(Math.abs(netBalance))}
            </Text>
          </View>

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

            <View style={[styles.tableCardHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
              <View style={styles.breakdownIconWrap}>
                <Feather name="bar-chart-2" size={19} color="#0F766E" />
              </View>
              <View style={styles.breakdownHeaderText}>
                <Text style={[styles.breakdownEyebrow, { color: colors.mutedForeground }]}>ACCOUNTING OVERVIEW</Text>
                <Text style={[styles.tableTitle, { color: colors.foreground }]}>Consumer Breakdown</Text>
              </View>
              <View style={styles.breakdownHeaderActions}>
                {appliedRange && (
                  <View style={styles.customRangeBadge}>
                    <Feather name="calendar" size={12} color="#6D28D9" />
                    <Text style={styles.customRangeBadgeText}>Custom</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.pdfDownloadBtn, pdfGenerating && { opacity: 0.6 }]}
                  onPress={downloadBreakdownPdf}
                  disabled={pdfGenerating}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Download Consumer Breakdown PDF"
                >
                  {pdfGenerating
                    ? <ActivityIndicator size={15} color="#0F766E" />
                    : <Feather name="download" size={16} color="#0F766E" />}
                  <Text style={styles.pdfDownloadText}>PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            {appliedRange && (
              <View style={styles.appliedRangeStrip}>
                <View style={styles.appliedRangeLine} />
                <Text style={styles.appliedRangeText}>
                  {shortDate(appliedRange.startDate)}
                </Text>
                <Feather name="arrow-right" size={13} color="#7C3AED" />
                <Text style={styles.appliedRangeText}>
                  {shortDate(appliedRange.endDate)}
                </Text>
                <View style={styles.appliedRangeLine} />
              </View>
            )}

            <View style={[styles.rangePanel, { borderTopColor: colors.border }]}>
              <View style={styles.rangeFields}>
                <View style={styles.rangeFieldWrap}>
                  <Text style={[styles.rangeLabel, { color: colors.mutedForeground }]}>Start Date</Text>
                  <TouchableOpacity
                    style={[styles.rangeDropdown, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setDatePickerTarget('start')}
                    activeOpacity={0.75}
                  >
                    <Feather name="calendar" size={14} color={colors.primary} />
                    <Text style={[styles.rangeValue, { color: colors.foreground }]} numberOfLines={1}>{shortDate(draftStartDate)}</Text>
                    <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <View style={styles.rangeFieldWrap}>
                  <Text style={[styles.rangeLabel, { color: colors.mutedForeground }]}>End Date</Text>
                  <TouchableOpacity
                    style={[styles.rangeDropdown, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setDatePickerTarget('end')}
                    activeOpacity={0.75}
                  >
                    <Feather name="calendar" size={14} color={colors.primary} />
                    <Text style={[styles.rangeValue, { color: colors.foreground }]} numberOfLines={1}>{shortDate(draftEndDate)}</Text>
                    <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
              {hasUnappliedDateChange && (
                <TouchableOpacity
                  style={[styles.rangeApplyBtn, rangeLoading && { opacity: 0.6 }]}
                  onPress={applyDateRange}
                  disabled={rangeLoading}
                  activeOpacity={0.8}
                >
                  {rangeLoading
                    ? <ActivityIndicator size={15} color="#fff" />
                    : <Feather name="check" size={15} color="#fff" />}
                  <Text style={styles.applyBtnText}>{rangeLoading ? 'Loading…' : 'Apply'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.tableScrollWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                bounces={false}
                scrollEventThrottle={16}
                onScroll={(event) => {
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                  setShowTableScrollHint(
                    contentOffset.x < 6 && contentSize.width > layoutMeasurement.width + 4,
                  );
                }}
              >
                <View style={{ width: TABLE_INNER_W }}>
                <View style={[styles.tableRow, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.th, { width: NAME_W }]}>Consumers ({consumers.length})</Text>
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

              <View pointerEvents="none" style={styles.fixedConsumerColumn}>
                <View style={[styles.fixedConsumerHeader, { backgroundColor: colors.primary }]}>
                  <Text style={styles.th}>Consumers ({consumers.length})</Text>
                </View>
                {consumerRows.map((row, index) => (
                  <View
                    key={`fixed-${row.id}`}
                    style={[
                      styles.fixedConsumerRow,
                      {
                        backgroundColor: index % 2 === 0 ? colors.card : colors.rowAlt,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.td, { color: colors.foreground }]} numberOfLines={1}>
                      {row.name}
                    </Text>
                  </View>
                ))}
                <View style={[styles.fixedConsumerTotal, { backgroundColor: colors.primary }]}>
                  <Text style={styles.tf}>Total</Text>
                </View>
              </View>

              {showTableScrollHint && (
                <View pointerEvents="none" style={styles.tableScrollArrow}>
                  <Feather name="chevrons-right" size={20} color="#0F766E" />
                </View>
              )}
            </View>

            <View style={[styles.legend, { borderTopColor: colors.border }]}>
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                {appliedRange
                  ? `${shortDate(appliedRange.startDate)} – ${shortDate(appliedRange.endDate)} (inclusive) · rate ৳${fmtRate(mealRate)}/meal`
                  : mealRate > 0 ? `Balance = Deposit − (Meals × ৳${fmtRate(mealRate)}/meal)` : 'Balance = Deposit − Cost'}
              </Text>
            </View>
          </View>
        )}

        {isAdmin && !appliedRange && (
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
      </ScrollView>

      <DashboardDatePicker
        visible={datePickerTarget !== null}
        value={datePickerTarget === 'end' ? draftEndDate : draftStartDate}
        title={datePickerTarget === 'end' ? 'Select End Date' : 'Select Start Date'}
        onClose={() => setDatePickerTarget(null)}
        onSelect={(date) => {
          if (datePickerTarget === 'start') setDraftStartDate(date);
          else if (datePickerTarget === 'end') setDraftEndDate(date);
          setDatePickerTarget(null);
        }}
      />
    </View>
  );
}

// ── SummaryCard ───────────────────────────────────────────────────────────────

function DashboardDatePicker({
  visible,
  value,
  title,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: string;
  title: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}) {
  const colors = useColors();
  const [viewYearMonth, setViewYearMonth] = useState(value.slice(0, 7));

  useEffect(() => {
    if (visible) setViewYearMonth(value.slice(0, 7));
  }, [visible, value]);

  const [year, month] = viewYearMonth.split('-').map(Number);
  const daysInMonth = new Date(year!, month!, 0).getDate();
  const leadingBlanks = new Date(year!, month! - 1, 1).getDay();
  const cells: Array<number | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const changeMonth = (offset: number) => {
    const next = new Date(year!, month! - 1 + offset, 1);
    setViewYearMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = new Date(year!, month! - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.pickerTitleRow}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>{title}</Text>
            <TouchableOpacity style={styles.pickerClose} onPress={onClose}>
              <Feather name="x" size={19} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={styles.pickerMonthRow}>
            <TouchableOpacity style={styles.pickerArrow} onPress={() => changeMonth(-1)}>
              <Feather name="chevron-left" size={21} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.pickerMonth, { color: colors.foreground }]}>{monthLabel}</Text>
            <TouchableOpacity style={styles.pickerArrow} onPress={() => changeMonth(1)}>
              <Feather name="chevron-right" size={21} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.pickerWeekRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={[styles.pickerWeekday, { color: colors.mutedForeground }]}>{day}</Text>
            ))}
          </View>
          <View style={styles.pickerGrid}>
            {cells.map((day, index) => {
              if (day === null) return <View key={`blank-${index}`} style={styles.pickerDayCell} />;
              const date = `${viewYearMonth}-${String(day).padStart(2, '0')}`;
              const selected = date === value;
              return (
                <TouchableOpacity
                  key={date}
                  style={styles.pickerDayCell}
                  onPress={() => onSelect(date)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pickerDayCircle, selected && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.pickerDayText, { color: selected ? '#fff' : colors.foreground }]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingHorizontal: 16, marginBottom: 20 },
  balanceHeroCard: { width: '100%', minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  balanceHeroIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  balanceHeroTextWrap: { flex: 1, marginLeft: 12, marginRight: 10 },
  balanceHeroLabel: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  balanceHeroSub: { fontSize: 10, lineHeight: 14, fontFamily: 'Inter_400Regular', marginTop: 3 },
  balanceHeroValue: { maxWidth: '42%', fontSize: 23, fontFamily: 'Inter_700Bold', letterSpacing: -0.4, textAlign: 'right' },
  card: { width: '48%', borderRadius: 18, padding: 16, borderWidth: 1, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  cardValue: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  cardSub: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  // Table
  tableCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  tableCardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  breakdownIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CCFBF1', borderWidth: 1, borderColor: '#99F6E4' },
  breakdownHeaderText: { flex: 1, marginLeft: 11 },
  breakdownEyebrow: { fontSize: 9, lineHeight: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1.1, marginBottom: 2 },
  tableTitle: { fontSize: 16, lineHeight: 21, fontFamily: 'Inter_700Bold', letterSpacing: -0.15 },
  breakdownHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customRangeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' },
  customRangeBadgeText: { color: '#6D28D9', fontSize: 10, fontFamily: 'Inter_700Bold' },
  pdfDownloadBtn: { height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 9, borderRadius: 9, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  pdfDownloadText: { color: '#0F766E', fontSize: 10, fontFamily: 'Inter_700Bold' },
  appliedRangeStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, paddingTop: 10 },
  appliedRangeLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#DDD6FE' },
  appliedRangeText: { color: '#6D28D9', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  rangePanel: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  rangeFields: { flexDirection: 'row', gap: 10 },
  rangeFieldWrap: { flex: 1, gap: 5 },
  rangeLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  rangeDropdown: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderRadius: 10 },
  rangeValue: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium' },
  rangeApplyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', marginTop: 10, paddingVertical: 10, borderRadius: 10 },
  applyBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  tableScrollWrap: { position: 'relative' },
  fixedConsumerColumn: { position: 'absolute', top: 0, left: 0, width: NAME_W + ROW_PX, zIndex: 2, shadowColor: '#000', shadowOffset: { width: 3, height: 0 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  fixedConsumerHeader: { height: 38, justifyContent: 'center', paddingLeft: ROW_PX, paddingRight: 8 },
  fixedConsumerRow: { height: 46, justifyContent: 'center', paddingLeft: ROW_PX, paddingRight: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  fixedConsumerTotal: { height: 46, justifyContent: 'center', paddingLeft: ROW_PX, paddingRight: 8 },
  tableScrollArrow: { position: 'absolute', right: 7, top: 5, zIndex: 3, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#6EE7B7' },
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
  summaryBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  pickerOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.45)' },
  pickerCard: { width: '100%', maxWidth: 380, borderRadius: 18, borderWidth: 1, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  pickerTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pickerTitle: { flex: 1, fontSize: 16, fontFamily: 'Inter_700Bold' },
  pickerClose: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  pickerMonthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pickerArrow: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  pickerMonth: { flex: 1, textAlign: 'center', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  pickerWeekRow: { flexDirection: 'row' },
  pickerWeekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 10, fontFamily: 'Inter_600SemiBold', paddingVertical: 7 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  pickerDayCell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  pickerDayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pickerDayText: { fontSize: 13, lineHeight: 18, textAlign: 'center', fontFamily: 'Inter_500Medium', includeFontPadding: false },

  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  emptySubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
