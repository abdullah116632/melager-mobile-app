import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";
import { messHubStyles as styles } from "./messHubStyles";

export const MessHubErrorBanner = ({ message }: { message: string }) => (
  <View style={styles.errorBanner}>
    <Feather name="alert-circle" size={14} color="#DC2626" />
    <Text style={styles.errorBannerText}>{message}</Text>
  </View>
);
