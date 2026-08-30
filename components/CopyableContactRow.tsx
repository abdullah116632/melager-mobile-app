import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface CopyableContactRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  copyable?: boolean;
}

export const CopyableContactRow = ({
  icon,
  label,
  value,
  copyable = false,
}: CopyableContactRowProps) => {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCopy = copyable && value !== "Not available";

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copyValue = async () => {
    if (!canCopy) return;
    await Clipboard.setStringAsync(value);
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <View className="flex-row items-center gap-3 border-b-[0.5px] border-slate-200 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-teal-50">
        <Feather name={icon} size={17} color="#0F766E" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-inter-medium text-[11px] text-slate-500">
          {label}
        </Text>
        <Text
          className="mt-0.5 font-inter-semibold text-[14px] text-slate-900"
          selectable
        >
          {value}
        </Text>
      </View>
      {canCopy ? (
        <TouchableOpacity
          className={`h-9 w-9 items-center justify-center rounded-full border ${
            copied
              ? "border-emerald-200 bg-emerald-50"
              : "border-slate-200 bg-slate-50"
          }`}
          onPress={() => void copyValue()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Copy ${label.toLowerCase()}`}
        >
          <Feather
            name={copied ? "check" : "copy"}
            size={16}
            color={copied ? "#059669" : "#64748B"}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
