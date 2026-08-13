import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

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

const AuthScreen = () => {
  const { login, signup, verifyOtp, resendOtp } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
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
    if (mode === "signup" && password !== signupConfirmPassword) {
      setError("Passwords do not match.");
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
        setSignupConfirmPassword("");
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
    setSignupConfirmPassword("");
  };

  const changeMobileNumber = (value: string) => {
    setMobileNumber(value.replace(/\D/g, "").slice(0, 11));
  };

  return (
    <View className="flex-1 bg-[#0B5E57]">
      <StatusBar style="light" backgroundColor="#0B5E57" />
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
        contentContainerClassName="flex-grow justify-center px-6 pb-40 pt-safe-offset-10"
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
            confirmPassword={signupConfirmPassword}
            showPassword={showPassword}
            loading={loading}
            error={error}
            onNameChange={setName}
            onEmailChange={setEmail}
            onMobileNumberChange={changeMobileNumber}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setSignupConfirmPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
            onSubmit={submitLoginOrSignup}
            onForgotPassword={showForgotPassword}
            onToggleMode={toggleAuthMode}
          />
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
};

export default AuthScreen;
