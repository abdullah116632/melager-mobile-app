import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import type { useColors } from "@/hooks/useColors";
import { profileStyles as styles } from "./profileStyles";

interface MessKeyRowProps {
  messKey: string;
  copied: boolean;
  colors: ReturnType<typeof useColors>;
  onCopy: () => void;
}

export const MessKeyRow = ({
  messKey,
  copied,
  colors,
  onCopy,
}: MessKeyRowProps) => (
  <View
    style={[
      styles.rowItem,
      styles.rowDivider,
      { borderBottomColor: colors.border },
    ]}
  >
    <View
      style={[styles.rowIconWrapper, { backgroundColor: colors.secondary }]}
    >
      <Feather name="key" size={16} color={colors.primary} />
    </View>
    <View style={styles.rowContent}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
        Mess Key
      </Text>
      <Text
        style={[
          styles.rowValue,
          styles.messKeyValue,
          { color: colors.foreground },
        ]}
      >
        {messKey}
      </Text>
    </View>
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor: copied ? "#059669" : colors.secondary },
      ]}
      onPress={onCopy}
      activeOpacity={0.7}
    >
      <Feather
        name={copied ? "check" : "copy"}
        size={15}
        color={copied ? "#fff" : colors.primary}
      />
      <Text
        style={[
          styles.actionButtonText,
          { color: copied ? "#fff" : colors.primary },
        ]}
      >
        {copied ? "Copied!" : "Copy"}
      </Text>
    </TouchableOpacity>
  </View>
);
