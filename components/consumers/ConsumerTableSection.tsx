import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  type LayoutChangeEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/redux/hooks";
import type { Consumer } from "@/types/consumer";

type ConsumerTableSectionProps = {
  label: string;
  consumers: Consumer[];
  copiedId: string | null;
  onCopy: (value: string, key: string, label: string) => void;
  topMargin?: boolean;
  onDelete: (consumer: Consumer) => void;
  deletingId: number | null;
};

type ConsumerTableProps = ConsumerTableSectionProps & {
  isAdmin: boolean;
};

const consumerNameColors = [
  "#0F766E",
  "#4338CA",
  "#BE123C",
  "#B45309",
  "#7E22CE",
  "#0369A1",
];

const ConsumerName = ({ name, color }: { name: string; color: string }) => {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const shouldScroll = viewportWidth > 0 && contentWidth > viewportWidth;

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);

    if (!shouldScroll) return;

    const distance = contentWidth + 24;
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -distance,
        duration: Math.max(4500, distance * 36),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => animation.stop();
  }, [contentWidth, name, shouldScroll, translateX]);

  return (
    <View
      className="h-7 justify-center overflow-hidden"
      onLayout={(event: LayoutChangeEvent) =>
        setViewportWidth(event.nativeEvent.layout.width)
      }
    >
      <Animated.View
        className="flex-row"
        style={{ transform: [{ translateX }] }}
      >
        <Text
          className="font-inter-semibold text-[15px]"
          numberOfLines={1}
          style={{ color, flexShrink: 0 }}
          onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
        >
          {name}
        </Text>
        {shouldScroll && (
          <Text
            className="ml-6 font-inter-semibold text-[15px]"
            numberOfLines={1}
            style={{ color, flexShrink: 0 }}
          >
            {name}
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

export const ConsumerTableSection = ({
  label,
  consumers,
  copiedId,
  onCopy,
  topMargin = false,
  onDelete,
  deletingId,
}: ConsumerTableSectionProps) => {
  const { role } = useAuth();

  return (
    <ConsumerTable
      label={label}
      consumers={consumers}
      copiedId={copiedId}
      onCopy={onCopy}
      topMargin={topMargin}
      isAdmin={role === "admin"}
      onDelete={onDelete}
      deletingId={deletingId}
    />
  );
};

const ConsumerTable = ({
  label,
  consumers,
  copiedId,
  onCopy,
  topMargin = false,
  isAdmin,
  onDelete,
  deletingId,
}: ConsumerTableProps) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [scrollViewportWidth, setScrollViewportWidth] = useState(0);
  const [scrollContentWidth, setScrollContentWidth] = useState(0);
  const hasMoreToScroll =
    scrollContentWidth > scrollViewportWidth + 1 &&
    scrollOffset < scrollContentWidth - scrollViewportWidth - 4;

  return (
    <View className={`px-4 ${topMargin ? "mt-6" : "mt-4"}`}>
      <View className="mb-2.5 flex-row items-center justify-between px-0.5">
        <Text className="font-inter-semibold text-[11px] tracking-[1px] text-slate-500">
          {label}
        </Text>
        <View className="rounded-full bg-teal-50 px-2.5 py-1">
          <Text className="font-inter-semibold text-[10px] text-teal-700">
            {consumers.length} {consumers.length === 1 ? "MEMBER" : "MEMBERS"}
          </Text>
        </View>
      </View>

      <View className="relative flex-row overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-300/50">
        {/* Fixed pane: only the columns to its right scroll horizontally. */}
        <View className="z-10 w-[128px] border-r border-slate-200 bg-white shadow-md shadow-slate-300/40">
          <View className="h-10 justify-center border-b border-slate-200 bg-slate-100 px-3">
            <Text className="font-inter-semibold text-[10px] tracking-[0.9px] text-slate-500">
              CONSUMER
            </Text>
          </View>

          {consumers.map((consumer, index) => (
            <View
              key={consumer.id}
              className={`h-16 justify-center px-3 ${index > 0 ? "border-t border-slate-100" : ""}`}
            >
              <ConsumerName
                name={consumer.name}
                color={
                  consumerNameColors[consumer.id % consumerNameColors.length]
                }
              />
            </View>
          ))}
        </View>

        <ScrollView
          className="flex-1"
          horizontal
          showsHorizontalScrollIndicator
          bounces={false}
          contentContainerStyle={{ minWidth: isAdmin ? 406 : 350 }}
          scrollEventThrottle={16}
          onLayout={(event) =>
            setScrollViewportWidth(event.nativeEvent.layout.width)
          }
          onContentSizeChange={(width) => setScrollContentWidth(width)}
          onScroll={(event) =>
            setScrollOffset(event.nativeEvent.contentOffset.x)
          }
        >
          <View>
            <View className="h-10 flex-row border-b border-slate-200 bg-slate-100">
              <View className="w-[210px] justify-center px-3.5">
                <Text className="font-inter-semibold text-[10px] tracking-[0.9px] text-slate-500">
                  EMAIL ADDRESS
                </Text>
              </View>
              <View className="w-[140px] justify-center border-l border-slate-200 px-3.5">
                <Text className="font-inter-semibold text-[10px] tracking-[0.9px] text-slate-500">
                  PHONE
                </Text>
              </View>
              {isAdmin && <View className="w-14 border-l border-slate-200" />}
            </View>

            {consumers.map((consumer, index) => {
              const emailCopyId = `email-${consumer.id}`;
              const phoneCopyId = `phone-${consumer.id}`;

              return (
                <View
                  key={consumer.id}
                  className={`h-16 flex-row ${index > 0 ? "border-t border-slate-100" : ""}`}
                >
                  <View className="w-[210px] justify-center px-3.5">
                    {consumer.email ? (
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="flex-1 font-inter text-[13px] text-slate-700"
                          numberOfLines={1}
                        >
                          {consumer.email}
                        </Text>
                        <TouchableOpacity
                          className={`h-7 w-7 items-center justify-center rounded-lg ${copiedId === emailCopyId ? "bg-emerald-50" : "bg-slate-100"}`}
                          onPress={() =>
                            onCopy(consumer.email!, emailCopyId, "Email")
                          }
                          activeOpacity={0.7}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Feather
                            name={copiedId === emailCopyId ? "check" : "copy"}
                            size={13}
                            color={
                              copiedId === emailCopyId ? "#16A34A" : "#0F766E"
                            }
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text className="font-inter text-sm text-slate-400">
                        —
                      </Text>
                    )}
                  </View>

                  <View className="w-[140px] justify-center border-l border-slate-100 px-3.5">
                    {consumer.mobileNumber ? (
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="flex-1 font-inter text-[13px] text-slate-700"
                          numberOfLines={1}
                        >
                          {consumer.mobileNumber}
                        </Text>
                        <TouchableOpacity
                          className={`h-7 w-7 items-center justify-center rounded-lg ${copiedId === phoneCopyId ? "bg-emerald-50" : "bg-slate-100"}`}
                          onPress={() =>
                            onCopy(consumer.mobileNumber!, phoneCopyId, "Phone")
                          }
                          activeOpacity={0.7}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Feather
                            name={copiedId === phoneCopyId ? "check" : "copy"}
                            size={13}
                            color={
                              copiedId === phoneCopyId ? "#16A34A" : "#0F766E"
                            }
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text className="font-inter text-sm text-slate-400">
                        —
                      </Text>
                    )}
                  </View>

                  {isAdmin && (
                    <View className="w-14 items-center justify-center border-l border-slate-100">
                      {deletingId === consumer.id ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : consumer.accountDeletedAt ? (
                        <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                          <Feather name="lock" size={14} color="#94A3B8" />
                        </View>
                      ) : consumer.isAdmin ? (
                        <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                          <Feather name="shield" size={15} color="#64748B" />
                        </View>
                      ) : (
                        <TouchableOpacity
                          className="h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50"
                          onPress={() => onDelete(consumer)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="trash-2" size={15} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {hasMoreToScroll && (
          <View
            pointerEvents="none"
            className="absolute right-2 top-2 z-20 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-teal-600 shadow-md shadow-teal-950/40"
          >
            <Feather name="chevron-right" size={18} color="#FFFFFF" />
          </View>
        )}
      </View>
    </View>
  );
};
