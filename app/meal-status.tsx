import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { api, type TodaySchedule, type ConsumerMealStatus } from '@/lib/api';

type MealType = 'breakfast' | 'lunch' | 'dinner';
type ControlScope = 'day' | 'ongoing';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
};

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function todayDate(): string {
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

function isValidTime(t: string): boolean {
  if (!t) return true;
  if (!/^\d{2}:\d{2}$/.test(t)) return false;
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) < 24 && (m ?? 0) < 60;
}

function formatTime12Hour(time: string): string {
  const [rawHour, rawMinute] = time.split(':').map(Number);
  if (!Number.isInteger(rawHour) || !Number.isInteger(rawMinute)) return time;
  const period = rawHour >= 12 ? 'PM' : 'AM';
  const hour = (rawHour % 12) || 12;
  return `${hour}:${String(rawMinute).padStart(2, '0')} ${period}`;
}

export default function MealStatusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { mess, token } = useAuth();
  const params = useLocalSearchParams<{ date?: string }>();

  const today = todayDate();
  const maxFutureDate = addDays(today, 3);
  const initialDate = params.date && params.date > maxFutureDate ? maxFutureDate : (params.date ?? today);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const isToday = selectedDate === today;
  const isPast = selectedDate < today;
  const isAtFutureLimit = selectedDate >= maxFutureDate;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayData, setTodayData] = useState<TodaySchedule | null>(null);
  const [consumers, setConsumers] = useState<ConsumerMealStatus[]>([]);

  const [bfEnabled, setBfEnabled] = useState(true);
  const [bfMenu, setBfMenu] = useState('');
  const [bfStart, setBfStart] = useState('');
  const [bfEnd, setBfEnd] = useState('');

  const [lunchEnabled, setLunchEnabled] = useState(true);
  const [lunchMenu, setLunchMenu] = useState('');
  const [lunchStart, setLunchStart] = useState('');
  const [lunchEnd, setLunchEnd] = useState('');

  const [dinnerEnabled, setDinnerEnabled] = useState(true);
  const [dinnerMenu, setDinnerMenu] = useState('');
  const [dinnerStart, setDinnerStart] = useState('');
  const [dinnerEnd, setDinnerEnd] = useState('');
  const [timePicker, setTimePicker] = useState<{
    value: string;
    onChange: (value: string) => void;
  } | null>(null);
  const [pendingControls, setPendingControls] = useState<Partial<Record<MealType, {
    enabled: boolean;
    scope: ControlScope;
  }>>>({});
  const loadedDateRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDraftSnapshot = () => JSON.stringify({
    bfEnabled, bfMenu, bfStart, bfEnd,
    lunchEnabled, lunchMenu, lunchStart, lunchEnd,
    dinnerEnabled, dinnerMenu, dinnerStart, dinnerEnd,
  });

  const openTimePicker = (value: string, onChange: (value: string) => void) => {
    setTimePicker({ value, onChange });
  };

  const load = useCallback(async (date: string) => {
    if (!token || !mess) return;
    loadedDateRef.current = null;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setLoading(true);
    try {
      const [schedData, outData] = await Promise.all([
        api.getTodaySchedule(mess.id, token, date),
        api.getMealOptOuts(mess.id, date, token),
      ]);
      setTodayData(schedData);
      setConsumers(outData.consumers);

      const s = schedData.schedule;
      setBfEnabled(s.breakfastEnabled);
      setBfMenu(s.breakfastMenu ?? '');
      setBfStart(s.breakfastOptOutStart ?? '');
      setBfEnd(s.breakfastOptOutEnd ?? '');

      setLunchEnabled(s.lunchEnabled);
      setLunchMenu(s.lunchMenu ?? '');
      setLunchStart(s.lunchOptOutStart ?? '');
      setLunchEnd(s.lunchOptOutEnd ?? '');

      setDinnerEnabled(s.dinnerEnabled);
      setDinnerMenu(s.dinnerMenu ?? '');
      setDinnerStart(s.dinnerOptOutStart ?? '');
      setDinnerEnd(s.dinnerOptOutEnd ?? '');
      setPendingControls({});
      lastSavedSnapshotRef.current = JSON.stringify({
        bfEnabled: s.breakfastEnabled,
        bfMenu: s.breakfastMenu ?? '',
        bfStart: s.breakfastOptOutStart ?? '',
        bfEnd: s.breakfastOptOutEnd ?? '',
        lunchEnabled: s.lunchEnabled,
        lunchMenu: s.lunchMenu ?? '',
        lunchStart: s.lunchOptOutStart ?? '',
        lunchEnd: s.lunchOptOutEnd ?? '',
        dinnerEnabled: s.dinnerEnabled,
        dinnerMenu: s.dinnerMenu ?? '',
        dinnerStart: s.dinnerOptOutStart ?? '',
        dinnerEnd: s.dinnerOptOutEnd ?? '',
      });
      loadedDateRef.current = date;
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token, mess?.id]);

  useEffect(() => {
    loadedDateRef.current = null;
    setTodayData(null);
    load(selectedDate);
  }, [load, selectedDate]);

  const applyEnabledChange = (type: MealType, enabled: boolean, scope: ControlScope) => {
    if (type === 'breakfast') setBfEnabled(enabled);
    else if (type === 'lunch') setLunchEnabled(enabled);
    else setDinnerEnabled(enabled);
    setPendingControls((current) => ({ ...current, [type]: { enabled, scope } }));
  };

  const handleEnabledChange = (type: MealType, enabled: boolean) => {
    if (isPast) return;
    // Today's state becomes the baseline copied into future snapshots. A
    // change made while viewing a future date only updates that date.
    applyEnabledChange(type, enabled, isToday ? 'ongoing' : 'day');
  };

  const handleSave = async () => {
    if (!token || !mess || isPast || loadedDateRef.current !== selectedDate) return;
    const snapshotBeingSaved = getDraftSnapshot();
    const controlsBeingSaved = { ...pendingControls };

    const timeFields = [
      ['Breakfast start', bfStart], ['Breakfast end', bfEnd],
      ['Lunch start', lunchStart], ['Lunch end', lunchEnd],
      ['Dinner start', dinnerStart], ['Dinner end', dinnerEnd],
    ] as const;

    for (const [label, val] of timeFields) {
      if (val && !isValidTime(val)) {
        Alert.alert('Invalid Time', `${label} must be HH:MM format (e.g. 07:00)`);
        return;
      }
    }

    setSaving(true);
    try {
      await api.setMealSchedule({
        messId: mess.id,
        date: selectedDate,
        breakfastEnabled: bfEnabled,
        breakfastMenu: bfMenu.trim() || null,
        breakfastOptOutStart: bfStart.trim() || null,
        breakfastOptOutEnd: bfEnd.trim() || null,
        lunchEnabled,
        lunchMenu: lunchMenu.trim() || null,
        lunchOptOutStart: lunchStart.trim() || null,
        lunchOptOutEnd: lunchEnd.trim() || null,
        dinnerEnabled,
        dinnerMenu: dinnerMenu.trim() || null,
        dinnerOptOutStart: dinnerStart.trim() || null,
        dinnerOptOutEnd: dinnerEnd.trim() || null,
        mealControls: (Object.entries(controlsBeingSaved) as Array<[
          MealType,
          { enabled: boolean; scope: ControlScope },
        ]>).map(([mealType, control]) => ({ mealType, ...control })),
      }, token);
      lastSavedSnapshotRef.current = snapshotBeingSaved;
      setPendingControls((current) => {
        const next = { ...current };
        for (const [mealType, savedControl] of Object.entries(controlsBeingSaved) as Array<[
          MealType,
          { enabled: boolean; scope: ControlScope },
        ]>) {
          const currentControl = next[mealType];
          if (
            currentControl?.enabled === savedControl.enabled
            && currentControl.scope === savedControl.scope
          ) {
            delete next[mealType];
          }
        }
        return next;
      });
    } catch (e) {
      // Prevent an endless retry loop. A subsequent edit will trigger another
      // auto-save attempt.
      lastSavedSnapshotRef.current = snapshotBeingSaved;
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (
      loading
      || saving
      || isPast
      || !token
      || !mess
      || loadedDateRef.current !== selectedDate
    ) return;

    const currentSnapshot = getDraftSnapshot();
    if (currentSnapshot === lastSavedSnapshotRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void handleSave();
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    bfEnabled, bfMenu, bfStart, bfEnd,
    lunchEnabled, lunchMenu, lunchStart, lunchEnd,
    dinnerEnabled, dinnerMenu, dinnerStart, dinnerEnd,
    pendingControls, loading, saving, isPast, selectedDate, token, mess?.id,
  ]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  // Only show consumers who opted out of at least one meal
  const optOutRows = consumers.filter((c) => c.breakfast || c.lunch || c.dinner);
  const hasOptOuts = optOutRows.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => setSelectedDate((d) => addDays(d, -1))} activeOpacity={0.7} style={styles.navArrow}>
            <Feather name="chevron-left" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={isToday ? undefined : () => setSelectedDate(today)}
            activeOpacity={isToday ? 1 : 0.7}
            style={styles.dateCenter}
          >
            <Text style={styles.datePrimary}>{formatDateLabel(selectedDate, today)}</Text>
            {!isToday && (
              <Text style={styles.dateSub}>Tap → Today</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedDate((d) => d >= maxFutureDate ? d : addDays(d, +1))}
            activeOpacity={0.7}
            style={[styles.navArrow, isAtFutureLimit && { opacity: 0.35 }]}
            disabled={isAtFutureLimit}
          >
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={() => load(selectedDate)} activeOpacity={0.7}>
          <Feather name="refresh-cw" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 16 }}
        >
          {/* Schedule Editor */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Schedule</Text>
            {isPast && (
              <View style={[styles.readOnlyBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}> 
                <Feather name="lock" size={13} color={colors.mutedForeground} />
                <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>Past schedules are read only.</Text>
              </View>
            )}

            {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((type, idx) => {
              const enabled = type === 'breakfast' ? bfEnabled : type === 'lunch' ? lunchEnabled : dinnerEnabled;
              const menu = type === 'breakfast' ? bfMenu : type === 'lunch' ? lunchMenu : dinnerMenu;
              const setMenu = type === 'breakfast' ? setBfMenu : type === 'lunch' ? setLunchMenu : setDinnerMenu;
              const start = type === 'breakfast' ? bfStart : type === 'lunch' ? lunchStart : dinnerStart;
              const setStart = type === 'breakfast' ? setBfStart : type === 'lunch' ? setLunchStart : setDinnerStart;
              const end = type === 'breakfast' ? bfEnd : type === 'lunch' ? lunchEnd : dinnerEnd;
              const setEnd = type === 'breakfast' ? setBfEnd : type === 'lunch' ? setLunchEnd : setDinnerEnd;
              const isLast = idx === 2;

              return (
                <View key={type} style={[styles.mealBlock, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                  {/* Meal header row */}
                  <View style={styles.mealHeaderRow}>
                    <Text style={styles.mealIcon}>{MEAL_ICONS[type]}</Text>
                    <Text style={[styles.mealLabel, { color: colors.foreground }]}>{MEAL_LABELS[type]}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[styles.toggleHint, { color: enabled ? '#059669' : colors.mutedForeground }]}>
                      {enabled ? 'Active' : 'Disabled'}
                    </Text>
                    <Switch
                      value={enabled}
                      onValueChange={(value) => handleEnabledChange(type, value)}
                      disabled={isPast}
                      trackColor={{ false: '#D1D5DB', true: '#6EE7B7' }}
                      thumbColor={enabled ? '#059669' : '#9CA3AF'}
                    />
                  </View>

                  {/* Menu item input */}
                  {enabled && (
                    <TextInput
                      style={[styles.menuInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                      placeholder={`Menu (optional)`}
                      placeholderTextColor={colors.mutedForeground}
                      value={menu}
                      onChangeText={setMenu}
                      editable={!isPast}
                      maxLength={80}
                    />
                  )}

                  {/* Per-meal opt-out window */}
                  <View style={styles.windowRow}>
                    <Feather name="clock" size={12} color={colors.mutedForeground} style={{ marginTop: 1 }} />
                    <Text style={[styles.windowHint, { color: colors.mutedForeground }]}>On/off window</Text>
                    <View style={styles.windowInputs}>
                      <TouchableOpacity
                        style={[styles.timeInput, { borderColor: colors.border, backgroundColor: colors.background }]}
                        onPress={() => openTimePicker(start, setStart)}
                        disabled={isPast}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.timeValue, { color: start ? colors.foreground : colors.mutedForeground }]}>
                          {formatTime12Hour(start || '07:00')}
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.timeSep, { color: colors.mutedForeground }]}>–</Text>
                      <TouchableOpacity
                        style={[styles.timeInput, { borderColor: colors.border, backgroundColor: colors.background }]}
                        onPress={() => openTimePicker(end, setEnd)}
                        disabled={isPast}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.timeValue, { color: end ? colors.foreground : colors.mutedForeground }]}>
                          {formatTime12Hour(end || '09:30')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Default window notice */}
            <View style={[styles.noticeBanner, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Feather name="info" size={12} color={colors.mutedForeground} />
              <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
                Changes save automatically. Today's meal and window changes apply to future dates; future-date changes apply only to that date.
              </Text>
            </View>

            {!isPast && (
              <View style={styles.autoSaveRow}>
                {saving
                  ? <ActivityIndicator size={13} color={colors.primary} />
                  : <Feather name="check-circle" size={14} color="#059669" />
                }
                <Text style={[styles.autoSaveText, { color: saving ? colors.primary : colors.mutedForeground }]}>
                  {saving ? 'Saving changes...' : 'Changes save automatically'}
                </Text>
              </View>
            )}
          </View>

          {/* Opt-out table */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Meal On/Off {hasOptOuts ? `(${optOutRows.length})` : ''}
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
                {/* Table header */}
                <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.thName, styles.thText]}>Name</Text>
                  <Text style={[styles.thMeal, styles.thText]}>{MEAL_ICONS['breakfast']}</Text>
                  <Text style={[styles.thMeal, styles.thText]}>{MEAL_ICONS['lunch']}</Text>
                  <Text style={[styles.thMeal, styles.thText]}>{MEAL_ICONS['dinner']}</Text>
                </View>

                {optOutRows.map((row, idx) => (
                  <View
                    key={row.consumerId}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: idx % 2 === 0 ? colors.card : colors.rowAlt,
                        borderBottomColor: colors.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <Text style={[styles.tdName, { color: colors.foreground }]} numberOfLines={1}>
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
        </ScrollView>
      )}
      <TimePickerModal
        visible={!!timePicker}
        initialValue={timePicker?.value ?? ''}
        colors={colors}
        onClose={() => setTimePicker(null)}
        onSelect={(value) => {
          timePicker?.onChange(value);
          setTimePicker(null);
        }}
      />
    </View>
  );
}

function TimePickerModal({
  visible,
  initialValue,
  colors,
  onClose,
  onSelect,
}: {
  visible: boolean;
  initialValue: string;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    if (!visible) return;
    const [savedHour, savedMinute] = initialValue.split(':').map(Number);
    const isSavedHour = Number.isInteger(savedHour) && savedHour >= 0 && savedHour < 24;
    setHour(isSavedHour ? ((savedHour % 12) || 12) : 7);
    setMinute(Number.isInteger(savedMinute) ? savedMinute : 0);
    setPeriod(isSavedHour && savedHour >= 12 ? 'PM' : 'AM');
    setMode('hour');
  }, [visible, initialValue]);

  const clockSize = 252;
  const clockCenter = clockSize / 2;
  const clockRadius = 96;
  const clockValues = mode === 'hour'
    ? Array.from({ length: 12 }, (_, index) => index + 1)
    : Array.from({ length: 12 }, (_, index) => index * 5);
  const selectedValue = mode === 'hour' ? hour : minute;
  const selectedIndex = mode === 'hour' ? hour % 12 : minute / 5;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.timePickerBackdrop} onPress={onClose}>
        <Pressable style={[styles.timePickerSheet, { backgroundColor: colors.card }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.timePickerHeader}>
            <Text style={[styles.timePickerTitle, { color: colors.foreground }]}>Select time</Text>
            <TouchableOpacity style={[styles.timePickerClose, { backgroundColor: colors.secondary }]} onPress={onClose}>
              <Feather name="x" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.timeDisplayPanel, { backgroundColor: colors.secondary }]}>
            <TouchableOpacity
              style={[styles.timeDisplayPart, mode === 'hour' && { backgroundColor: colors.primary }]}
              onPress={() => setMode('hour')}
            >
              <Text style={[styles.timeDisplayPartText, { color: mode === 'hour' ? '#fff' : colors.foreground }]}>
                {String(hour).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.timeDisplayColon, { color: colors.foreground }]}>:</Text>
            <TouchableOpacity
              style={[styles.timeDisplayPart, mode === 'minute' && { backgroundColor: colors.primary }]}
              onPress={() => setMode('minute')}
            >
              <Text style={[styles.timeDisplayPartText, { color: mode === 'minute' ? '#fff' : colors.foreground }]}>
                {String(minute).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
            <View style={styles.periodStack}>
              {(['AM', 'PM'] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.periodChip, period === value && { backgroundColor: colors.primary }]}
                  onPress={() => setPeriod(value)}
                >
                  <Text style={[styles.periodChipText, { color: period === value ? '#fff' : colors.mutedForeground }]}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={[styles.clockModeHint, { color: colors.mutedForeground }]}>
            {mode === 'hour' ? 'Choose hour' : 'Choose minute'}
          </Text>
          <View style={[styles.clockFace, { width: clockSize, height: clockSize, borderRadius: clockSize / 2, backgroundColor: colors.secondary }]}>
            <View
              pointerEvents="none"
              style={[
                styles.clockHandLayer,
                { width: clockSize, height: clockSize, transform: [{ rotate: `${selectedIndex * 30}deg` }] },
              ]}
            >
              <View style={[styles.clockHand, { backgroundColor: colors.primary, height: clockRadius - 18, top: clockCenter - clockRadius + 18 }]} />
              <View style={[styles.clockCenterDot, { backgroundColor: colors.primary }]} />
            </View>

            {clockValues.map((value) => {
              const dialIndex = mode === 'hour' ? value % 12 : value / 5;
              const angle = (dialIndex * 30) * Math.PI / 180;
              const left = clockCenter + clockRadius * Math.sin(angle) - 19;
              const top = clockCenter - clockRadius * Math.cos(angle) - 19;
              const selected = value === selectedValue;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.clockNumber,
                    { left, top },
                    selected && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    if (mode === 'hour') {
                      setHour(value);
                      setMode('minute');
                    } else {
                      setMinute(value);
                    }
                  }}
                >
                  <Text style={[styles.clockNumberText, { color: selected ? '#fff' : colors.foreground }]}>
                    {mode === 'minute' ? String(value).padStart(2, '0') : value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.timePickerActions}>
            <TouchableOpacity style={[styles.timePickerClear, { borderColor: colors.border }]} onPress={() => onSelect('')}>
              <Text style={[styles.timePickerClearText, { color: colors.foreground }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timePickerSave, { backgroundColor: colors.primary }]}
              onPress={() => {
                const hour24 = period === 'AM' ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
                onSelect(`${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
              }}
            >
              <Text style={styles.timePickerSaveText}>Set time</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MealCell({ opted }: { opted: boolean }) {
  return (
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
}

const MEAL_COL = 54;
const NAME_COL = 140;

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  dateNav: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  navArrow: {
    padding: 6,
  },
  dateCenter: {
    alignItems: 'center', paddingHorizontal: 8, minWidth: 100,
  },
  datePrimary: {
    fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff',
  },
  dateSub: {
    fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', marginTop: 1,
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  cardTitle: {
    fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 14,
  },

  mealBlock: {
    paddingVertical: 14,
  },
  mealHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  mealIcon: { fontSize: 18 },
  mealLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  toggleHint: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  menuInput: {
    height: 42, borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 12, fontSize: 14, fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },

  windowRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  windowHint: {
    fontSize: 11, fontFamily: 'Inter_400Regular',
  },
  windowInputs: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto',
  },
  timeInput: {
    width: 78, height: 34, borderWidth: 1.5, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  timeValue: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  timeSep: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  timePickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', paddingHorizontal: 24,
  },
  timePickerSheet: {
    width: '100%', maxWidth: 340, alignSelf: 'center',
    borderRadius: 22, padding: 20,
  },
  timePickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  timePickerTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  timePickerClose: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  timeDisplayPanel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, padding: 10, marginBottom: 10,
  },
  timeDisplayPart: {
    width: 68, height: 54, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  timeDisplayPartText: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  timeDisplayColon: { fontSize: 28, fontFamily: 'Inter_700Bold', marginHorizontal: 4 },
  periodStack: { gap: 4, marginLeft: 10 },
  periodChip: {
    width: 42, height: 25, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  periodChipText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  clockModeHint: {
    fontSize: 12, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginBottom: 8,
  },
  clockFace: {
    position: 'relative', alignSelf: 'center', marginBottom: 18,
  },
  clockHandLayer: { position: 'absolute', left: 0, top: 0 },
  clockHand: {
    position: 'absolute', left: '50%', marginLeft: -1, width: 2,
    borderRadius: 2,
  },
  clockCenterDot: {
    position: 'absolute', left: '50%', top: '50%',
    width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: 5,
  },
  clockNumber: {
    position: 'absolute', width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  clockNumberText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  timePickerActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  timePickerClear: {
    flex: 1, height: 44, borderWidth: 1, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  timePickerClearText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  timePickerSave: {
    flex: 2, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  timePickerSaveText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },

  noticeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8, padding: 10,
    marginTop: 14, marginBottom: 14,
  },
  noticeText: {
    fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1,
  },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderRadius: 9, padding: 10, marginBottom: 8,
  },
  readOnlyText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  autoSaveRow: {
    minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  autoSaveText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  emptyWrap: {
    alignItems: 'center', paddingVertical: 24, gap: 10,
  },
  emptyText: {
    fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center',
  },

  tableRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  tableHeader: {
    borderRadius: 8, marginBottom: 4,
    paddingVertical: 10,
  },
  thText: {
    color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center',
  },
  thName: {
    width: NAME_COL, paddingLeft: 12, textAlign: 'left',
  },
  thMeal: {
    width: MEAL_COL, alignItems: 'center', justifyContent: 'center',
  },
  tdName: {
    width: NAME_COL, paddingLeft: 12, paddingVertical: 12,
    fontSize: 14, fontFamily: 'Inter_400Regular',
  },
  optedOutCell: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  activeCell: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center',
  },
});
