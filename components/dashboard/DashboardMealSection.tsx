import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DASHBOARD_MEAL_ICONS,
  DASHBOARD_MEAL_LABELS,
  DASHBOARD_MEAL_TYPES,
} from "@/constants/dashboard";
import type { DashboardMealType, TodaySchedule } from "@/types/dashboard";
import type { AppColors } from "@/types/theme";
import {
  formatDashboardDateLabel,
  formatDashboardFullDate,
} from "@/utils/dashboard";
import { dashboardStyles as styles } from "./dashboardStyles";

const getMealEnabled = (
  schedule: TodaySchedule | null,
  mealType: DashboardMealType,
) => schedule?.schedule[`${mealType}Enabled`] ?? true;

const getMealMenu = (
  schedule: TodaySchedule | null,
  mealType: DashboardMealType,
) => schedule?.schedule[`${mealType}Menu`] ?? null;

const MenuMarquee = ({ menu, color }: { menu: string; color: string }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const gap = 28;
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
      <Animated.View
        style={[styles.menuMarqueeTrack, { transform: [{ translateX }] }]}
      >
        {[0, 1].map((copyIndex) => (
          <Text
            key={copyIndex}
            style={[
              styles.mealBoxMenu,
              styles.menuMarqueeText,
              {
                color,
                width: marqueeWidth,
                marginLeft: copyIndex === 1 ? gap : 0,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {menu}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
};

interface MealBoxProps {
  mealType: DashboardMealType;
  schedule: TodaySchedule | null;
  optedOut: boolean;
  pending: boolean;
  canInteract: boolean;
  onPress: (mealType: DashboardMealType) => void;
}

const MealBox = ({
  mealType,
  schedule,
  optedOut,
  pending,
  canInteract,
  onPress,
}: MealBoxProps) => {
  const enabled = getMealEnabled(schedule, mealType);
  const menu = getMealMenu(schedule, mealType);
  const visual = !enabled
    ? {
        background: "#F3F4F6",
        border: "#E5E7EB",
        label: "#9CA3AF",
        status: "Disabled",
        statusColor: "#9CA3AF",
      }
    : optedOut
      ? {
          background: "#FEF2F2",
          border: "#FECACA",
          label: "#DC2626",
          status: "Turned Off",
          statusColor: "#DC2626",
        }
      : {
          background: "#F0FDFA",
          border: "#6EE7B7",
          label: "#065F46",
          status: "Active",
          statusColor: "#059669",
        };
  const isTappable = enabled && canInteract && !pending;

  return (
    <TouchableOpacity
      style={[
        styles.mealBox,
        {
          backgroundColor: visual.background,
          borderColor: visual.border,
          opacity: canInteract ? 1 : 0.7,
        },
      ]}
      onPress={() => isTappable && onPress(mealType)}
      activeOpacity={isTappable ? 0.75 : 1}
      disabled={!isTappable}
    >
      <Text style={styles.mealBoxIcon}>{DASHBOARD_MEAL_ICONS[mealType]}</Text>
      <Text style={[styles.mealBoxLabel, { color: visual.label }]}>
        {DASHBOARD_MEAL_LABELS[mealType]}
      </Text>
      {menu ? <MenuMarquee menu={menu} color={visual.label} /> : null}
      {pending ? (
        <ActivityIndicator
          size="small"
          color={visual.statusColor}
          style={styles.mealBoxLoader}
        />
      ) : (
        <Text style={[styles.mealBoxStatus, { color: visual.statusColor }]}>
          {visual.status}
        </Text>
      )}
    </TouchableOpacity>
  );
};

interface DashboardMealSectionProps {
  colors: AppColors;
  selectedDate: string;
  today: string;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  isAtFutureLimit: boolean;
  isAdmin: boolean;
  schedule: TodaySchedule | null;
  optOuts: Set<string>;
  pendingOptOuts: Set<string>;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onManage: () => void;
  onToggleMeal: (mealType: DashboardMealType) => void;
}

export const DashboardMealSection = ({
  colors,
  selectedDate,
  today,
  isPast,
  isToday,
  isFuture,
  isAtFutureLimit,
  isAdmin,
  schedule,
  optOuts,
  pendingOptOuts,
  onPrevious,
  onNext,
  onToday,
  onManage,
  onToggleMeal,
}: DashboardMealSectionProps) => (
  <View
    style={[
      styles.mealSection,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}
  >
    <View style={styles.dateNav}>
      <TouchableOpacity
        style={styles.dateNavButton}
        onPress={onPrevious}
        activeOpacity={0.7}
      >
        <Feather name="chevron-left" size={20} color={colors.foreground} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dateCenter}
        onPress={isToday ? undefined : onToday}
        activeOpacity={isToday ? 1 : 0.7}
      >
        <Text style={[styles.datePrimary, { color: colors.foreground }]}>
          {formatDashboardDateLabel(selectedDate, today)}
        </Text>
        {!isToday && (
          <Text style={[styles.dateSecondary, { color: colors.primary }]}>
            {formatDashboardFullDate(selectedDate)} · Tap for Today
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.dateNavButton, isAtFutureLimit && { opacity: 0.35 }]}
        onPress={onNext}
        activeOpacity={0.7}
        disabled={isAtFutureLimit}
      >
        <Feather name="chevron-right" size={20} color={colors.foreground} />
      </TouchableOpacity>
    </View>

    {isPast && (
      <View style={styles.dateBanner}>
        <Feather name="lock" size={12} color="#92400E" />
        <Text style={styles.dateBannerText}>
          Past date — view only, meal on/off locked
        </Text>
      </View>
    )}
    {isFuture && (
      <View style={[styles.dateBanner, styles.dateBannerFuture]}>
        <Feather name="calendar" size={12} color="#1E40AF" />
        <Text style={[styles.dateBannerText, { color: "#1E40AF" }]}>
          Future date — meal on/off allowed
        </Text>
      </View>
    )}

    {isAdmin && (
      <View style={styles.adminBar}>
        {schedule ? (
          <View style={styles.mealCountRow}>
            {DASHBOARD_MEAL_TYPES.map((mealType) => {
              const enabled = getMealEnabled(schedule, mealType);
              return (
                <View key={mealType} style={styles.mealCountChip}>
                  <Text style={styles.mealCountIcon}>
                    {DASHBOARD_MEAL_ICONS[mealType]}
                  </Text>
                  <Text
                    style={[
                      styles.mealCountNumber,
                      { color: enabled ? "#059669" : "#9CA3AF" },
                    ]}
                  >
                    {enabled ? schedule.activeByMeal[mealType] : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
        <View style={styles.flex} />
        <TouchableOpacity
          style={styles.manageButton}
          onPress={onManage}
          activeOpacity={0.75}
        >
          <Feather name="settings" size={13} color="#0F766E" />
          <Text style={styles.manageButtonText}>Manage</Text>
        </TouchableOpacity>
      </View>
    )}

    <View style={styles.mealBoxRow}>
      {DASHBOARD_MEAL_TYPES.map((mealType) => (
        <MealBox
          key={mealType}
          mealType={mealType}
          schedule={schedule}
          optedOut={optOuts.has(mealType)}
          pending={pendingOptOuts.has(mealType)}
          canInteract={!isPast}
          onPress={onToggleMeal}
        />
      ))}
    </View>
    {!isAdmin && !isPast && (
      <Text style={[styles.mealHint, { color: colors.mutedForeground }]}>
        Tap a meal to turn it on or off
      </Text>
    )}
  </View>
);
