import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useColors } from '@/hooks/useColors';
import { useMess } from '@/context/MessContext';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface Props {
  accentColor?: string;
  /**
   * Fired when the user taps the ◀ arrow on the left side of the date
   * bar. Should move the selected cell one column to the left
   * (previous day for the same consumer).
   */
  onCellLeft?: () => void;
  /** Fired when the user taps the ▶ arrow (next day). */
  onCellRight?: () => void;
  /** Fired when the user taps the ▲ arrow (previous consumer row). */
  onCellUp?: () => void;
  /** Fired when the user taps the ▼ arrow (next consumer row). */
  onCellDown?: () => void;
  /**
   * When false, all 4 cell-navigation arrows render dimmed and do not
   * fire (use this to gate them behind "a cell has been selected").
   */
  cellNavEnabled?: boolean;
}

export default function MonthPicker({
  accentColor,
  onCellLeft,
  onCellRight,
  onCellUp,
  onCellDown,
  cellNavEnabled = false,
}: Props) {
  const colors = useColors();
  const {
    currentYearMonth,
    currentMonthLabel,
    goToMonth,
  } = useMess();

  const [visible, setVisible] = useState(false);
  const [curYear, curMonth] = currentYearMonth.split('-').map(Number);
  const [pickerYear, setPickerYear] = useState(curYear);
  const accent = accentColor ?? colors.primary;

  const openPicker = () => {
    setPickerYear(curYear);
    setVisible(true);
  };

  const selectMonth = (m: number) => {
    goToMonth(pickerYear, m);
    setVisible(false);
  };

  const handleArrow = (fn?: () => void) => {
    if (!cellNavEnabled) return;
    fn?.();
  };

  const disabledColor = colors.mutedForeground;
  const enabledColor = accent;

  return (
    <>
      {/* ── Nav bar ───────────────────────────────────────────────────────
          Layout (left → right):
            [◀ ▶]            [ month-label ]            [▲]
                                                              [▼]

          The dropdown sits in the centre of the bar. The two horizontal
          arrows (◀ / ▶) live to its left and the two vertical arrows
          (▲ / ▼) live to its right.

          All 4 arrows move the currently-selected cell in the grid:
            ◀ / ▶  previous / next day  (same consumer row)
            ▲ / ▼  previous / next consumer  (same day)
          They render dimmed when no cell has been selected yet. */}
      <View style={[styles.bar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {/* Cell-nav arrows are a meals-page-only feature. They only render
            when all 4 handlers are passed (currently only meals.tsx does).
            Other pages keep just the centered month dropdown — same layout
            and styling as before, no arrows. */}
        {onCellLeft && onCellRight && onCellUp && onCellDown && (
          <>
            {/* Left cluster: ◀ ▶ (horizontal arrows) */}
            <View style={styles.leftCluster}>
              <TouchableOpacity
                style={[
                  styles.cellArrowBtn,
                  { backgroundColor: colors.secondary, opacity: cellNavEnabled ? 1 : 0.4 },
                ]}
                onPress={() => handleArrow(onCellLeft)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <Feather
                  name="chevron-left"
                  size={18}
                  color={cellNavEnabled ? enabledColor : disabledColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cellArrowBtn,
                  { backgroundColor: colors.secondary, opacity: cellNavEnabled ? 1 : 0.4 },
                ]}
                onPress={() => handleArrow(onCellRight)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Feather
                  name="chevron-right"
                  size={18}
                  color={cellNavEnabled ? enabledColor : disabledColor}
                />
              </TouchableOpacity>
            </View>

            {/* Centre cluster: month dropdown (flex:0 so the pill stays its
                intrinsic size; the bar's flex rows on either side push it to
                the visual centre). */}
            <View style={[styles.centerCluster, styles.centerClusterWithCellNav]}>
              <TouchableOpacity
                style={[styles.labelBtn, { backgroundColor: colors.secondary }]}
                onPress={openPicker}
                activeOpacity={0.75}
              >
                <Feather name="calendar" size={14} color={accent} />
                <Text
                  style={[styles.label, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {currentMonthLabel}
                </Text>
                <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Right cluster: ▲ ▼ (vertical arrows) */}
            <View style={styles.rightCluster}>
              <TouchableOpacity
                style={[
                  styles.cellArrowBtn,
                  { backgroundColor: colors.secondary, opacity: cellNavEnabled ? 1 : 0.4 },
                ]}
                onPress={() => handleArrow(onCellUp)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
              >
                <Feather
                  name="chevron-up"
                  size={16}
                  color={cellNavEnabled ? enabledColor : disabledColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cellArrowBtn,
                  { backgroundColor: colors.secondary, opacity: cellNavEnabled ? 1 : 0.4 },
                ]}
                onPress={() => handleArrow(onCellDown)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name="chevron-down"
                  size={16}
                  color={cellNavEnabled ? enabledColor : disabledColor}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Pages without cell-nav arrows: render only the centered dropdown. */}
        {!(onCellLeft && onCellRight && onCellUp && onCellDown) && (
          <View style={styles.centerCluster}>
            <TouchableOpacity
              style={[styles.labelBtn, { backgroundColor: colors.secondary }]}
              onPress={openPicker}
              activeOpacity={0.75}
            >
              <Feather name="calendar" size={14} color={accent} />
              <Text
                style={[styles.label, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {currentMonthLabel}
              </Text>
              <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Picker modal ────────────────────────────────────────────────── */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          {/* Stop tap propagation so clicking inside the sheet doesn't dismiss */}
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>

            {/* Header row */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select Month</Text>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Year navigation */}
            <View style={styles.yearRow}>
              <TouchableOpacity style={styles.yearArrow} onPress={() => setPickerYear((y) => y - 1)}>
                <Feather name="chevron-left" size={22} color={accent} />
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: colors.foreground }]}>{pickerYear}</Text>
              <TouchableOpacity style={styles.yearArrow} onPress={() => setPickerYear((y) => y + 1)}>
                <Feather name="chevron-right" size={22} color={accent} />
              </TouchableOpacity>
            </View>

            {/* Month grid — 4 × 3 */}
            <View style={styles.monthGrid}>
              {MONTHS_SHORT.map((name, i) => {
                const m = i + 1;
                const isSelected = m === curMonth && pickerYear === curYear;
                return (
                  <View key={m} style={styles.cellOuter}>
                    <TouchableOpacity
                      style={[
                        styles.cell,
                        { borderColor: colors.border },
                        isSelected && { backgroundColor: accent, borderColor: accent },
                      ]}
                      onPress={() => selectMonth(m)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          { color: isSelected ? '#fff' : colors.foreground },
                          isSelected && { fontFamily: 'Inter_700Bold' as const },
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Nav bar — three balanced columns so the month dropdown stays centred:
  //   [ ◀ ▶ ] flex:1   [ month-label ]   flex:1   [ ▲ ]
  //                                                    [ ▼ ]
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  leftCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    // Keep a clear gap between the navigation arrows and the wider month pill.
    paddingRight: 16,
  },
  centerCluster: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerClusterWithCellNav: {
    // Reserve enough room for labels such as "September 2026" to stay on one line.
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    // Match the left-side gap around the month pill.
    paddingLeft: 16,
  },
  cellArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 166,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  label: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },

  // Modal backdrop
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  // Picker card
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // Header
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  closeBtn: { padding: 4 },

  // Year row
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  yearArrow: { padding: 6 },
  yearText: { fontSize: 20, fontFamily: 'Inter_700Bold' },

  // Month grid: 4 columns × 3 rows
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingBottom: 16,
  },
  cellOuter: {
    width: '25%',
    padding: 5,
  },
  cell: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
