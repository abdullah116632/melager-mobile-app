import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { AuthBrand } from "@/components/auth/AuthBrand";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ForgotPasswordCard } from "@/components/auth/ForgotPasswordCard";
import { LoginSignupCard } from "@/components/auth/LoginSignupCard";
import { ResetOtpCard } from "@/components/auth/ResetOtpCard";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";
import { SignupOtpCard } from "@/components/auth/SignupOtpCard";
import { useAuth } from "@/context/AuthContext";
import {
  clearPendingPasswordReset,
  getPendingPasswordReset,
  savePendingPasswordReset,
} from "@/services/pendingPasswordResetService";
import {
  clearPendingSignupOtp,
  getPendingSignupOtp,
  savePendingSignupOtp,
} from "@/services/pendingSignupOtpService";
import {
  requestPasswordReset,
  resendPasswordResetCode,
  submitPasswordReset,
} from "@/services/authService";
import type { AuthMode } from "@/types/auth";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
};

const AuthScreen = () => {
  const { login, loginWithGoogle, signup, verifyOtp, resendOtp } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const googleClientId = Platform.select({
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    default: undefined,
  });
  const googleConfigured = Boolean(googleClientId);
  const [googleRequest, googleResponse, promptGoogleAsync] =
    AuthSession.useAuthRequest(
      {
        clientId: googleClientId ?? "google-client-id-not-configured",
        redirectUri: AuthSession.makeRedirectUri({ scheme: "mobile" }),
        responseType: AuthSession.ResponseType.IdToken,
        scopes: ["openid", "profile", "email"],
        prompt: AuthSession.Prompt.SelectAccount,
        usePKCE: false,
      },
      GOOGLE_DISCOVERY,
    );

  const stopResendTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startResendTimer = useCallback(() => {
    setResendTimer(60);
    stopResendTimer();
    timerRef.current = setInterval(() => {
      setResendTimer((previousValue) => {
        if (previousValue <= 1) {
          stopResendTimer();
          return 0;
        }
        return previousValue - 1;
      });
    }, 1000);
  }, [stopResendTimer]);

  useEffect(() => stopResendTimer, [stopResendTimer]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([getPendingPasswordReset(), getPendingSignupOtp()]).then(
      ([pendingReset, pendingSignup]) => {
        if (cancelled) return;

        const activeFlow = [
          pendingReset && { mode: "reset-otp" as const, ...pendingReset },
          pendingSignup && { mode: "otp" as const, ...pendingSignup },
        ]
          .filter(Boolean)
          .sort((first, second) => second!.requestedAt - first!.requestedAt)[0];

        if (!activeFlow) return;
        setPendingEmail(activeFlow.email);
        setOtp("");
        setMode(activeFlow.mode);
        startResendTimer();
      },
    );

    return () => {
      cancelled = true;
    };
  }, [startResendTimer]);

  const changeOtp = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
    setError("");
  }, []);

  const completeGoogleSignIn = useCallback(
    async (idToken: string) => {
      setError("");
      setLoading(true);
      try {
        await loginWithGoogle(idToken);
      } catch (caughtError: unknown) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Google sign-in failed",
        );
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle],
  );

  useEffect(() => {
    if (!googleResponse) return;

    if (googleResponse.type === "success") {
      const idToken = googleResponse.params?.id_token;
      if (idToken) {
        void completeGoogleSignIn(idToken);
      } else {
        setError("Google did not return a sign-in token. Please try again.");
      }
    } else if (googleResponse.type === "error") {
      setError("Google sign-in was not completed. Please try again.");
    }
  }, [googleResponse, completeGoogleSignIn]);

  const signInWithGoogle = async () => {
    if (!googleConfigured || !googleRequest) {
      setError(
        "Google sign-in is not configured yet. Please contact the app administrator.",
      );
      return;
    }

    setError("");
    try {
      await promptGoogleAsync();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not open Google sign-in",
      );
    }
  };

  const submitLoginOrSignup = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Your name is required.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        if (mobileNumber.trim() && mobileNumber.trim().length !== 11) {
          setError("Mobile number must be exactly 11 digits.");
          setLoading(false);
          return;
        }
        const { pendingEmail: signupEmail } = await signup(
          email.trim(),
          name.trim(),
          password,
          mobileNumber.trim(),
        );
        setPendingEmail(signupEmail);
        setOtp("");
        await savePendingSignupOtp({
          email: signupEmail,
          requestedAt: Date.now(),
        });
        setMode("otp");
        startResendTimer();
      } else {
        await login(email.trim(), password);
      }
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  const verifySignupOtp = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await verifyOtp(pendingEmail, otp);
      await clearPendingSignupOtp();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const resendSignupOtp = async () => {
    if (resendTimer > 0) return;

    setError("");
    try {
      await resendOtp(pendingEmail);
      await savePendingSignupOtp({
        email: pendingEmail,
        requestedAt: Date.now(),
      });
      startResendTimer();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to resend code",
      );
    }
  };

  const submitForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const data = await requestPasswordReset(email.trim());
      setPendingEmail(data.pendingEmail);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      await savePendingPasswordReset({
        email: data.pendingEmail,
        requestedAt: Date.now(),
      });
      setMode("reset-otp");
      startResendTimer();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  const resendResetOtp = async () => {
    if (resendTimer > 0) return;

    setError("");
    try {
      await resendPasswordResetCode(pendingEmail);
      await savePendingPasswordReset({
        email: pendingEmail,
        requestedAt: Date.now(),
      });
      startResendTimer();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to resend code",
      );
    }
  };

  const verifyResetOtp = () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError("");
    void clearPendingPasswordReset();
    setMode("reset");
  };

  const resetPassword = async () => {
    if (!newPassword.trim()) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await submitPasswordReset(pendingEmail, otp, newPassword);
      await clearPendingPasswordReset();
      setMode("login");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setEmail(pendingEmail);
      setPassword("");
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Reset failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const goBack = (nextMode: AuthMode) => {
    if (mode === "reset-otp") void clearPendingPasswordReset();
    if (mode === "otp") void clearPendingSignupOtp();
    setMode(nextMode);
    setError("");
    setOtp("");
    stopResendTimer();
    setResendTimer(0);
  };

  const showForgotPassword = () => {
    setError("");
    setMode("forgot");
  };

  const toggleAuthMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
  };

  const changeMobileNumber = (value: string) => {
    setMobileNumber(value.replace(/\D/g, "").slice(0, 11));
  };

  return (
    <View className="flex-1 bg-[#0B5E57]">
      <View
        pointerEvents="none"
        className="absolute -right-[90px] -top-[110px] h-[340px] w-[340px] rounded-full bg-white/[0.07]"
      />
      <View
        pointerEvents="none"
        className="absolute -left-[60px] bottom-20 h-[200px] w-[200px] rounded-full bg-white/[0.05]"
      />
      <View
        pointerEvents="none"
        className="absolute -left-5 top-[140px] h-[90px] w-[90px] rounded-full bg-white/[0.06]"
      />
      <KeyboardAwareScrollViewCompat
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 pb-safe-offset-6 pt-safe-offset-10"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={24}
        extraKeyboardSpace={mode === "signup" ? 260 : 120}
        showsVerticalScrollIndicator={false}
      >
        <AuthBrand />

        {mode === "otp" && (
          <SignupOtpCard
            pendingEmail={pendingEmail}
            otp={otp}
            error={error}
            loading={loading}
            resendTimer={resendTimer}
            onBack={() => goBack("signup")}
            onOtpChange={changeOtp}
            onVerify={verifySignupOtp}
            onResend={resendSignupOtp}
          />
        )}

        {mode === "forgot" && (
          <ForgotPasswordCard
            email={email}
            error={error}
            loading={loading}
            onBack={() => goBack("login")}
            onEmailChange={setEmail}
            onSubmit={submitForgotPassword}
          />
        )}

        {mode === "reset-otp" && (
          <ResetOtpCard
            pendingEmail={pendingEmail}
            otp={otp}
            error={error}
            resendTimer={resendTimer}
            onBack={() => goBack("forgot")}
            onOtpChange={changeOtp}
            onVerify={verifyResetOtp}
            onResend={resendResetOtp}
          />
        )}

        {mode === "reset" && (
          <ResetPasswordCard
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            showNewPassword={showNewPassword}
            error={error}
            loading={loading}
            onBack={() => goBack("reset-otp")}
            onNewPasswordChange={setNewPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onTogglePassword={() => setShowNewPassword((value) => !value)}
            onSubmit={resetPassword}
          />
        )}

        {(mode === "login" || mode === "signup") && (
          <LoginSignupCard
            mode={mode}
            name={name}
            email={email}
            mobileNumber={mobileNumber}
            password={password}
            showPassword={showPassword}
            loading={loading}
            error={error}
            onNameChange={setName}
            onEmailChange={setEmail}
            onMobileNumberChange={changeMobileNumber}
            onPasswordChange={setPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
            onSubmit={submitLoginOrSignup}
            onForgotPassword={showForgotPassword}
            onGoogleSignIn={signInWithGoogle}
            onToggleMode={toggleAuthMode}
          />
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
};

export default AuthScreen;
