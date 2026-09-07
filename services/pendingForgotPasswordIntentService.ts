import AsyncStorage from "@react-native-async-storage/async-storage";

const OPEN_FORGOT_PASSWORD_INTENT_KEY = "@mess_open_forgot_password_intent";

// Set right before signing the user out from an authenticated screen (e.g.
// Delete Mess) so the auth screen can jump straight to the Forgot Password
// card once it remounts, instead of the default login/signup view.
export const saveOpenForgotPasswordIntent = () =>
  AsyncStorage.setItem(OPEN_FORGOT_PASSWORD_INTENT_KEY, "1");

export const consumeOpenForgotPasswordIntent = async (): Promise<boolean> => {
  const stored = await AsyncStorage.getItem(OPEN_FORGOT_PASSWORD_INTENT_KEY);
  if (!stored) return false;
  await AsyncStorage.removeItem(OPEN_FORGOT_PASSWORD_INTENT_KEY);
  return true;
};
