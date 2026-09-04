/**
 * Android Fabric can leave a screen's child attached while a native Fragment
 * removal transition is finishing. A subsequent mount then crashes with
 * "The specified child already has a parent". This must run before Expo
 * Router creates any navigator, so it lives in the app entry point.
 *
 * Keep Fabric/New Architecture enabled for Reanimated 4 and the rest of the
 * native modules; only use react-native-screens' documented plain-View
 * fallback on Android until the upstream transition bug is fixed.
 */
const { Platform } = require("react-native");
const { enableScreens } = require("react-native-screens");

if (Platform.OS === "android") {
  enableScreens(false);
}

require("expo-router/entry");
