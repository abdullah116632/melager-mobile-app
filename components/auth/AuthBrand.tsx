import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";

import { authStyles as styles } from "./authStyles";

export const AuthBrand = () => (
  <View style={styles.logoSection}>
    <View style={styles.logoCircle}>
      <Feather name="coffee" size={38} color="#0F766E" />
    </View>
    <Text style={styles.appName}>Mess Manager</Text>
    <Text style={styles.tagline}>Track meals, expenses & deposits</Text>
  </View>
);
