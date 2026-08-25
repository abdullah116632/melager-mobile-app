import { NativeModules, Platform } from "react-native";

export const GOOGLE_SIGN_IN_BUILD_REQUIRED_MESSAGE =
  "Google sign-in requires a development build that includes the native Google Sign-In module. Rebuild and reinstall the app, then try again.";

export const hasGoogleSignInNativeModule = () =>
  Platform.OS !== "web" && NativeModules.RNGoogleSignin != null;

export const loadGoogleSignInModule = async () => {
  if (!hasGoogleSignInNativeModule()) return null;
  return import("@react-native-google-signin/google-signin");
};
