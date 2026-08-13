import Feather from "@expo/vector-icons/Feather";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/context/AuthContext";

import { ErrorBox } from "./AuthFeedback";

type GoogleSignInButtonProps = {
  disabled?: boolean;
};

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

if (googleWebClientId) {
  GoogleSignin.configure({ webClientId: googleWebClientId });
}

export const GoogleSignInButton = ({
  disabled = false,
}: GoogleSignInButtonProps) => {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signInWithGoogle = async () => {
    if (!googleWebClientId) {
      setError(
        "Google sign-in is not configured yet. Please contact the app administrator.",
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) return;
      if (!response.data.idToken) {
        setError("Google did not return a sign-in token. Please try again.");
        return;
      }

      await loginWithGoogle(response.data.idToken);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Google sign-in failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const buttonDisabled = disabled || loading;

  return (
    <View>
      <ErrorBox error={error} />
      <TouchableOpacity
        className={`h-[52px] flex-row items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-gray-200 bg-white ${buttonDisabled ? "opacity-50" : "opacity-100"}`}
        onPress={signInWithGoogle}
        disabled={buttonDisabled}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <>
            <Feather name="chrome" size={20} color="#4285F4" />
            <Text className="font-inter-semibold text-[15px] text-gray-700">
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
