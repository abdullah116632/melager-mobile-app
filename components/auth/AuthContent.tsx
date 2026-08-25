import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { getPendingPasswordReset } from "@/services/pendingPasswordResetService";
import { getPendingSignupOtp } from "@/services/pendingSignupOtpService";
import type {
  AuthCredentialsDraft,
  AuthMode,
  ResetPasswordDraft,
} from "@/types/auth";
import { AuthBrand } from "./AuthBrand";
import { ForgotPasswordCard } from "./ForgotPasswordCard";
import { LoginSignupCard } from "./LoginSignupCard";
import { ResetOtpCard } from "./ResetOtpCard";
import { ResetPasswordCard } from "./ResetPasswordCard";
import { SignupOtpCard } from "./SignupOtpCard";

const emptyAuthDraft: AuthCredentialsDraft = {
  name: "",
  email: "",
  mobileNumber: "",
  password: "",
  confirmPassword: "",
  showPassword: false,
};

const emptyResetDraft: ResetPasswordDraft = {
  newPassword: "",
  confirmPassword: "",
  showPassword: false,
};

export const AuthContent = () => {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [authDraft, setAuthDraft] =
    useState<AuthCredentialsDraft>(emptyAuthDraft);
  const [resetDraft, setResetDraft] =
    useState<ResetPasswordDraft>(emptyResetDraft);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [startResetTimer, setStartResetTimer] = useState(true);

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
        setResetOtp("");
        setStartResetTimer(true);
        setMode(activeFlow.mode);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

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
            onBack={() => setMode("signup")}
          />
        )}

        {mode === "forgot" && (
          <ForgotPasswordCard
            initialEmail={authDraft.email}
            onBack={(email) => {
              setAuthDraft((current) => ({ ...current, email }));
              setMode("login");
            }}
            onCodeRequested={(nextPendingEmail, enteredEmail) => {
              setAuthDraft((current) => ({
                ...current,
                email: enteredEmail,
              }));
              setPendingEmail(nextPendingEmail);
              setResetOtp("");
              setResetDraft((current) => ({
                ...current,
                newPassword: "",
                confirmPassword: "",
              }));
              setStartResetTimer(true);
              setMode("reset-otp");
            }}
          />
        )}

        {mode === "reset-otp" && (
          <ResetOtpCard
            pendingEmail={pendingEmail}
            startTimerOnMount={startResetTimer}
            onBack={() => {
              setResetOtp("");
              setMode("forgot");
            }}
            onVerified={(verifiedOtp) => {
              setResetOtp(verifiedOtp);
              setMode("reset");
            }}
          />
        )}

        {mode === "reset" && (
          <ResetPasswordCard
            pendingEmail={pendingEmail}
            otp={resetOtp}
            initialDraft={resetDraft}
            onBack={(draft) => {
              setResetDraft(draft);
              setResetOtp("");
              setStartResetTimer(false);
              setMode("reset-otp");
            }}
            onResetComplete={(email, draft) => {
              setAuthDraft((current) => ({
                ...current,
                email,
                password: "",
              }));
              setResetOtp("");
              setResetDraft({
                ...draft,
                newPassword: "",
                confirmPassword: "",
              });
              setMode("login");
            }}
          />
        )}

        {(mode === "login" || mode === "signup") && (
          <LoginSignupCard
            mode={mode}
            initialDraft={authDraft}
            onModeChange={(nextMode, draft) => {
              setAuthDraft(draft);
              setMode(nextMode);
            }}
            onSignupPending={(nextPendingEmail, draft) => {
              setAuthDraft(draft);
              setPendingEmail(nextPendingEmail);
              setMode("otp");
            }}
            onForgotPassword={(draft) => {
              setAuthDraft(draft);
              setMode("forgot");
            }}
          />
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
};
