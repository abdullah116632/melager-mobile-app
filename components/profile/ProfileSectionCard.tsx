import type { ReactNode } from "react";
import { Text, View } from "react-native";

interface ProfileSectionCardProps {
  title: string;
  children: ReactNode;
}

export const ProfileSectionCard = ({
  title,
  children,
}: ProfileSectionCardProps) => (
  <View className="gap-1.5 px-4">
    <Text className="pl-1 font-inter-semibold text-[11px] tracking-[0.8px] text-slate-500">
      {title.toUpperCase()}
    </Text>
    <View className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      {children}
    </View>
  </View>
);
