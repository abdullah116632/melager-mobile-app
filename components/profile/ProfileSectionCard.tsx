import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { useColors } from "@/hooks/useColors";
import { profileStyles as styles } from "./profileStyles";

interface ProfileSectionCardProps {
  title: string;
  children: ReactNode;
  colors: ReturnType<typeof useColors>;
}

export const ProfileSectionCard = ({
  title,
  children,
  colors,
}: ProfileSectionCardProps) => (
  <View style={styles.sectionWrapper}>
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
      {title.toUpperCase()}
    </Text>
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  </View>
);
