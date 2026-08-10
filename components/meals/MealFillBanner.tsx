import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface MealFillBannerProps {
  visible: boolean;
  value: number;
  backgroundColor: string;
  onDone: () => void;
}

export const MealFillBanner = ({
  visible,
  value,
  backgroundColor,
  onDone,
}: MealFillBannerProps) => {
  if (!visible) return null;

  return (
    <View style={[styles.banner, { backgroundColor }]}>
      <Feather name="copy" size={14} color="#fff" style={styles.icon} />
      <Text style={styles.text}>
        Fill mode · value: <Text style={styles.value}>{value}</Text> · Drag or
        tap cells to fill
      </Text>
      <TouchableOpacity style={styles.doneButton} onPress={onDone}>
        <Text style={styles.doneText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  icon: { marginRight: 6 },
  text: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  value: { fontFamily: "Inter_700Bold" },
  doneButton: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  doneText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
});
