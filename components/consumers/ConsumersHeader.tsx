import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

import type { AppColors } from "@/types/theme";
import { consumerStyles as styles } from "./consumerStyles";

type ConsumersHeaderProps = {
  colors: AppColors;
  loading: boolean;
  totalConsumers: number;
  onBack: () => void;
  onRefresh: () => void;
};

export const ConsumersHeader = ({
  colors,
  loading,
  totalConsumers,
  onBack,
  onRefresh,
}: ConsumersHeaderProps) => (
  <View style={[styles.header, { backgroundColor: colors.primary }]}>
    <TouchableOpacity
      style={styles.backBtn}
      onPress={onBack}
      activeOpacity={0.7}
    >
      <Feather name="arrow-left" size={22} color="#fff" />
    </TouchableOpacity>
    <View style={styles.headerContent}>
      <Text style={styles.headerTitle}>Consumers</Text>
      {!loading && <Text style={styles.headerSub}>{totalConsumers} total</Text>}
    </View>
    <TouchableOpacity
      style={styles.refreshBtn}
      onPress={onRefresh}
      activeOpacity={0.7}
    >
      <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.8)" />
    </TouchableOpacity>
  </View>
);
