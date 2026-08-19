import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useAuth } from "@/context/AuthContext";

import { ErrorBox } from "./AuthFeedback";

type GoogleSignInButtonProps = {
  disabled?: boolean;
};

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M21.35 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h5.23a4.46 4.46 0 0 1-1.94 2.93v2.78h3.15c1.84-1.69 2.91-4.18 2.91-7.73Z"
    />
    <Path
      fill="#34A853"
      d="M12 21.75c2.62 0 4.82-.87 6.44-2.36l-3.15-2.44c-.87.59-1.99.94-3.29.94-2.53 0-4.68-1.71-5.45-4.01H3.3v2.86A9.74 9.74 0 0 0 12 21.75Z"
    />
    <Path
      fill="#FBBC05"
      d="M6.55 13.88A5.86 5.86 0 0 1 6.25 12c0-.65.11-1.28.3-1.88V7.26H3.3A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.74l3.25-2.86Z"
    />
    <Path
      fill="#EA4335"
      d="M12 6.11c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.81 3.19 14.61 2.25 12 2.25A9.74 9.74 0 0 0 3.3 7.26l3.25 2.86c.77-2.3 2.92-4.01 5.45-4.01Z"
    />
  </Svg>
);

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
      const { GoogleSignin, isSuccessResponse } =
        await import("@react-native-google-signin/google-signin");
      GoogleSignin.configure({ webClientId: googleWebClientId });
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
      const message = caughtError instanceof Error ? caughtError.message : "";
      setError(
        message.includes("RNGoogleSignin")
          ? "Google sign-in requires a new development build. Rebuild and reinstall the app, then try again."
          : message || "Google sign-in failed",
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
            <GoogleIcon />
            <Text className="font-inter-semibold text-[15px] text-gray-700">
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
