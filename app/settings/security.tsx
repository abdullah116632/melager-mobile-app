import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

type ModalType =
  "changePassword" | "updateEmail" | "transferAdmin" | "addCoAdmin" | null;

interface EligibleAdmin {
  id: number;
  name: string;
  userId: number;
  isAdmin?: boolean;
}

export default function SecurityScreen() {
  const router = useRouter();
  const { role, token, refreshMe, patchUser } = useAuth();
  const isAdmin = role === "admin";

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [showCpNew, setShowCpNew] = useState(false);
  const [cpOtp, setCpOtp] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [ueOtp, setUeOtp] = useState("");

  const [eligibleAdmins, setEligibleAdmins] = useState<EligibleAdmin[]>([]);
  const [selectedConsumerId, setSelectedConsumerId] = useState<number | null>(
    null,
  );
  const [taOtp, setTaOtp] = useState("");
  const [taLoading, setTaLoading] = useState(false);
  const [caOtp, setCaOtp] = useState("");

  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setResendTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const apiCall = async <T = unknown,>(
    method: string,
    path: string,
    body?: object,
  ): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as { error?: string } & T;
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  };

  const openModal = async (type: ModalType) => {
    setActiveModal(type);
    setStep(0);
    setError("");
    setCurrentPassword("");
    setCpNewPassword("");
    setCpConfirmPassword("");
    setCpOtp("");
    setNewEmail("");
    setUeOtp("");
    setTaOtp("");
    setSelectedConsumerId(null);
    setEligibleAdmins([]);
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(0);

    if (type === "transferAdmin" || type === "addCoAdmin") {
      setTaLoading(true);
      try {
        const data = await apiCall<{ consumers: EligibleAdmin[] }>(
          "GET",
          "/settings/security/eligible-admins",
        );
        setEligibleAdmins(data.consumers);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load members");
      } finally {
        setTaLoading(false);
      }
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setStep(0);
    setError("");
    setCaOtp("");
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(0);
  };

  // ── Change Password ──────────────────────────────────────────────────────
  const handleCpSendCode = async () => {
    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (cpNewPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (cpNewPassword !== cpConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiCall("POST", "/settings/security/request-otp", {
        action: "change_password",
        currentPassword,
      });
      setStep(1);
      startTimer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCpVerify = async () => {
    if (cpOtp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiCall("POST", "/settings/security/change-password", {
        otp: cpOtp,
        newPassword: cpNewPassword,
      });
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCpResend = async () => {
    if (resendTimer > 0) return;
    try {
      await apiCall("POST", "/settings/security/request-otp", {
        action: "change_password",
        currentPassword,
      });
      startTimer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend code");
    }
  };

  // ── Update Email ─────────────────────────────────────────────────────────
  const handleUeSendCode = async () => {
    if (!newEmail.trim()) {
      setError("Please enter a new email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiCall("POST", "/settings/security/request-otp", {
        action: "update_email",
        payload: newEmail.trim(),
      });
      setStep(1);
      startTimer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUeVerify = async () => {
    if (ueOtp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await apiCall<{ newEmail: string }>(
        "POST",
        "/settings/security/update-email",
        { otp: ueOtp },
      );
      patchUser({ email: data.newEmail });
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUeResend = async () => {
    if (resendTimer > 0) return;
    try {
      await apiCall("POST", "/settings/security/request-otp", {
        action: "update_email",
        payload: newEmail.trim(),
      });
      startTimer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend code");
    }
  };

  // ── Transfer Admin ───────────────────────────────────────────────────────
  const handleTaSendCode = async () => {
    if (!selectedConsumerId) {
      setError("Please select a member to transfer admin to.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiCall("POST", "/settings/security/request-otp", {
        action: "add_admin",
        payload: String(selectedConsumerId),
      });
      setStep(1);
      startTimer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTaVerify = async () => {
    if (taOtp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiCall("POST", "/settings/security/add-admin", { otp: taOtp });
      setStep(2);
      setTimeout(() => refreshMe(), 600);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTaResend = async () => {
    if (resendTimer > 0) return;
    try {
      await apiCall("POST", "/settings/security/request-otp", {
        action: "add_admin",
        payload: String(selectedConsumerId),
      });
      startTimer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend code");
    }
  };

  // ── Add Co-Admin ─────────────────────────────────────────────────────────
  const handleCaSendCode = async () => {
    if (!selectedConsumerId) {
      setError("Please select a member to grant admin to.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiCall("POST", "/settings/security/request-otp", {
        action: "add_co_admin",
        payload: String(selectedConsumerId),
      });
      setStep(1);
      startTimer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCaVerify = async () => {
    if (caOtp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiCall("POST", "/settings/security/add-co-admin", { otp: caOtp });
      setStep(2);
      setTimeout(() => {}, 600);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCaResend = async () => {
    if (resendTimer > 0) return;
    try {
      await apiCall("POST", "/settings/security/request-otp", {
        action: "add_co_admin",
        payload: String(selectedConsumerId),
      });
      startTimer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend code");
    }
  };

  // ── Shared UI pieces ─────────────────────────────────────────────────────
  const ErrorBox = () =>
    error ? (
      <View className="mb-3 flex-row items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2.5">
        <Feather name="alert-circle" size={14} color="#DC2626" />
        <Text className="flex-1 font-inter text-[13px] text-red-600">
          {error}
        </Text>
      </View>
    ) : null;

  const OtpField = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <TextInput
      className="mb-3 h-16 rounded-xl border-2 border-teal-700 bg-gray-50 text-center font-inter-bold text-[28px] tracking-[12px] text-gray-900"
      value={value}
      onChangeText={(v) => {
        onChange(v.replace(/\D/g, "").slice(0, 6));
        setError("");
      }}
      keyboardType="number-pad"
      maxLength={6}
      placeholder="• • • • • •"
      placeholderTextColor="#CBD5E1"
      autoFocus
    />
  );

  const ResendRow = ({ onResend }: { onResend: () => void }) => (
    <TouchableOpacity
      className="mt-3.5 items-center"
      onPress={onResend}
      disabled={resendTimer > 0}
    >
      <Text
        className={`font-inter-medium text-sm ${resendTimer > 0 ? "text-gray-400" : "text-teal-700"}`}
      >
        {resendTimer > 0
          ? `Resend code in ${resendTimer}s`
          : "Didn't receive it? Resend code"}
      </Text>
    </TouchableOpacity>
  );

  const SubmitBtn = ({
    onPress,
    disabled,
    label,
  }: {
    onPress: () => void;
    disabled?: boolean;
    label: string;
  }) => (
    <TouchableOpacity
      className={`mt-2 h-[52px] items-center justify-center rounded-xl bg-teal-700 ${loading || disabled ? "opacity-50" : "opacity-100"}`}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="font-inter-bold text-base text-white">{label}</Text>
      )}
    </TouchableOpacity>
  );

  const SuccessCard = ({
    icon,
    iconClassName,
    iconColor,
    title,
    body,
    onClose,
  }: {
    icon: string;
    iconClassName: string;
    iconColor: string;
    title: string;
    body: string;
    onClose: () => void;
  }) => (
    <View className="items-center py-6">
      <View
        className={`mb-5 h-[88px] w-[88px] items-center justify-center rounded-full ${iconClassName}`}
      >
        <Feather name={icon as any} size={40} color={iconColor} />
      </View>
      <Text className="mb-2.5 font-inter-bold text-[22px] text-gray-900">
        {title}
      </Text>
      <Text className="text-center font-inter text-sm leading-[22px] text-gray-500">
        {body}
      </Text>
      <TouchableOpacity
        className="mt-6 h-[52px] w-full items-center justify-center rounded-xl bg-teal-700"
        onPress={onClose}
      >
        <Text className="font-inter-bold text-base text-white">Done</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Modal renderers ──────────────────────────────────────────────────────
  const renderChangePassword = () => {
    if (step === 2)
      return (
        <SuccessCard
          icon="check-circle"
          iconClassName="bg-green-50"
          iconColor="#16A34A"
          title="Password Changed!"
          body="Your account password has been updated successfully."
          onClose={closeModal}
        />
      );
    if (step === 1)
      return (
        <>
          <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-teal-50">
            <Feather name="mail" size={28} color="#0F766E" />
          </View>
          <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
            Check Your Email
          </Text>
          <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
            A 6-digit verification code was sent to your email address.
          </Text>
          <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
            Verification Code
          </Text>
          <OtpField value={cpOtp} onChange={setCpOtp} />
          <ErrorBox />
          <SubmitBtn
            onPress={handleCpVerify}
            disabled={cpOtp.length !== 6}
            label="Change Password"
          />
          <ResendRow onResend={handleCpResend} />
        </>
      );
    return (
      <>
        <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-teal-50">
          <Feather name="lock" size={28} color="#0F766E" />
        </View>
        <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
          Change Password
        </Text>
        <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
          First verify your identity, then we'll send a code to your email to
          confirm.
        </Text>
        <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
          Current Password
        </Text>
        <TextInput
          className="h-12 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 px-3.5 font-inter text-[15px] text-gray-900"
          placeholder="Enter current password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          returnKeyType="next"
          autoFocus
        />
        <Text className="mb-1.5 mt-3.5 font-inter-semibold text-[13px] text-gray-700">
          New Password
        </Text>
        <View className="flex-row gap-2">
          <TextInput
            className="h-12 flex-1 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 px-3.5 font-inter text-[15px] text-gray-900"
            placeholder="Min. 6 characters"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showCpNew}
            value={cpNewPassword}
            onChangeText={setCpNewPassword}
          />
          <TouchableOpacity
            className="h-12 w-12 items-center justify-center rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50"
            onPress={() => setShowCpNew((v) => !v)}
          >
            <Feather
              name={showCpNew ? "eye-off" : "eye"}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
        <Text className="mb-1.5 mt-3.5 font-inter-semibold text-[13px] text-gray-700">
          Confirm New Password
        </Text>
        <TextInput
          className="h-12 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 px-3.5 font-inter text-[15px] text-gray-900"
          placeholder="Re-enter new password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showCpNew}
          value={cpConfirmPassword}
          onChangeText={setCpConfirmPassword}
          returnKeyType="done"
          onSubmitEditing={handleCpSendCode}
        />
        <ErrorBox />
        <SubmitBtn onPress={handleCpSendCode} label="Send Verification Code" />
      </>
    );
  };

  const renderUpdateEmail = () => {
    if (step === 2)
      return (
        <SuccessCard
          icon="check-circle"
          iconClassName="bg-green-50"
          iconColor="#16A34A"
          title="Email Updated!"
          body={`Your login email has been changed to\n${newEmail}`}
          onClose={closeModal}
        />
      );
    if (step === 1)
      return (
        <>
          <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-teal-50">
            <Feather name="mail" size={28} color="#0D9488" />
          </View>
          <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
            Verify It's You
          </Text>
          <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
            A 6-digit code was sent to your{" "}
            <Text className="font-inter-semibold text-gray-900">current</Text>{" "}
            email to confirm the change.
          </Text>
          <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
            Verification Code
          </Text>
          <OtpField value={ueOtp} onChange={setUeOtp} />
          <ErrorBox />
          <SubmitBtn
            onPress={handleUeVerify}
            disabled={ueOtp.length !== 6}
            label="Verify & Update Email"
          />
          <ResendRow onResend={handleUeResend} />
        </>
      );
    return (
      <>
        <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-teal-50">
          <Feather name="at-sign" size={28} color="#0D9488" />
        </View>
        <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
          Update Email
        </Text>
        <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
          Enter your new email. We'll send a code to your current email to
          verify the change.
        </Text>
        <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
          New Email Address
        </Text>
        <TextInput
          className="h-12 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 px-3.5 font-inter text-[15px] text-gray-900"
          placeholder="new@example.com"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={newEmail}
          onChangeText={setNewEmail}
          returnKeyType="done"
          onSubmitEditing={handleUeSendCode}
          autoFocus
        />
        <ErrorBox />
        <SubmitBtn onPress={handleUeSendCode} label="Send Verification Code" />
      </>
    );
  };

  const renderTransferAdmin = () => {
    if (step === 2)
      return (
        <SuccessCard
          icon="shield"
          iconClassName="bg-orange-50"
          iconColor="#EA580C"
          title="Admin Transferred!"
          body="The selected member is now the admin of this mess. You are now a regular member."
          onClose={closeModal}
        />
      );
    if (step === 1) {
      const selected = eligibleAdmins.find((c) => c.id === selectedConsumerId);
      return (
        <>
          <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-orange-50">
            <Feather name="shield" size={28} color="#EA580C" />
          </View>
          <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
            Confirm Transfer
          </Text>
          <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
            A code was sent to your email to confirm transferring admin to{" "}
            <Text className="font-inter-bold text-gray-900">
              {selected?.name}
            </Text>
            .
          </Text>
          <View className="flex-row items-start gap-2 rounded-[10px] bg-amber-100 px-3.5 py-3">
            <Feather name="alert-triangle" size={14} color="#92400E" />
            <Text className="flex-1 font-inter-medium text-xs leading-[18px] text-amber-800">
              You will lose admin privileges after this action.
            </Text>
          </View>
          <Text className="mb-1.5 mt-4 font-inter-semibold text-[13px] text-gray-700">
            Verification Code
          </Text>
          <OtpField value={taOtp} onChange={setTaOtp} />
          <ErrorBox />
          <SubmitBtn
            onPress={handleTaVerify}
            disabled={taOtp.length !== 6}
            label="Confirm Transfer"
          />
          <ResendRow onResend={handleTaResend} />
        </>
      );
    }
    return (
      <>
        <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-orange-50">
          <Feather name="shield" size={28} color="#EA580C" />
        </View>
        <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
          Transfer Admin Role
        </Text>
        <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
          Select a member with a linked account to become the new admin.
        </Text>
        {taLoading ? (
          <View className="my-10">
            <ActivityIndicator color="#0F766E" size="large" />
          </View>
        ) : eligibleAdmins.length === 0 ? (
          <View className="items-center gap-2.5 py-8">
            <Feather name="users" size={36} color="#CBD5E1" />
            <Text className="font-inter-semibold text-base text-gray-500">
              No eligible members
            </Text>
            <Text className="px-2 text-center font-inter text-[13px] leading-5 text-gray-400">
              Members must have linked accounts to become admin. Add them via
              the Consumers tab with an email address.
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
              Select Member
            </Text>
            {eligibleAdmins.map((c) => {
              const sel = selectedConsumerId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  className={`mb-2 flex-row items-center gap-3 rounded-[10px] border-[1.5px] p-3 ${sel ? "border-teal-700 bg-teal-50" : "border-gray-200 bg-gray-50"}`}
                  onPress={() => {
                    setSelectedConsumerId(c.id);
                    setError("");
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-full ${sel ? "bg-teal-700" : "bg-gray-200"}`}
                  >
                    <Text
                      className={`font-inter-bold text-base ${sel ? "text-white" : "text-gray-700"}`}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    className={`flex-1 text-[15px] ${sel ? "font-inter-semibold text-teal-700" : "font-inter text-gray-900"}`}
                  >
                    {c.name}
                  </Text>
                  {sel && (
                    <Feather name="check-circle" size={18} color="#0F766E" />
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
        <ErrorBox />
        {eligibleAdmins.length > 0 && (
          <SubmitBtn
            onPress={handleTaSendCode}
            disabled={!selectedConsumerId}
            label="Send Verification Code"
          />
        )}
        <View className="mt-4 flex-row items-start gap-2 rounded-[10px] bg-amber-100 px-3.5 py-3">
          <Feather name="alert-triangle" size={14} color="#92400E" />
          <Text className="flex-1 font-inter-medium text-xs leading-[18px] text-amber-800">
            This is permanent. You will become a regular member.
          </Text>
        </View>
      </>
    );
  };

  const renderAddCoAdmin = () => {
    if (step === 2)
      return (
        <SuccessCard
          icon="user-check"
          iconClassName="bg-blue-50"
          iconColor="#2563EB"
          title="Admin Added!"
          body="The selected member now has admin privileges. Both of you are admins of this mess."
          onClose={closeModal}
        />
      );
    if (step === 1) {
      const selected = eligibleAdmins.find((c) => c.id === selectedConsumerId);
      return (
        <>
          <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-blue-50">
            <Feather name="user-check" size={28} color="#2563EB" />
          </View>
          <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
            Confirm New Admin
          </Text>
          <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
            A code was sent to your email to confirm granting admin to{" "}
            <Text className="font-inter-bold text-gray-900">
              {selected?.name}
            </Text>
            .
          </Text>
          <View className="flex-row items-start gap-2 rounded-[10px] border border-blue-200 bg-blue-50 px-3.5 py-3">
            <Feather name="info" size={14} color="#1D4ED8" />
            <Text className="flex-1 font-inter-medium text-xs leading-[18px] text-blue-800">
              You will both be admins. Your privileges are not affected.
            </Text>
          </View>
          <Text className="mb-1.5 mt-4 font-inter-semibold text-[13px] text-gray-700">
            Verification Code
          </Text>
          <OtpField value={caOtp} onChange={setCaOtp} />
          <ErrorBox />
          <SubmitBtn
            onPress={handleCaVerify}
            disabled={caOtp.length !== 6}
            label="Confirm & Grant Admin"
          />
          <ResendRow onResend={handleCaResend} />
        </>
      );
    }
    // Step 0 — pick a member (show non-admin members only)
    const nonAdminMembers = eligibleAdmins.filter((c) => !c.isAdmin);
    const alreadyAdmins = eligibleAdmins.filter((c) => c.isAdmin);
    return (
      <>
        <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-blue-50">
          <Feather name="user-check" size={28} color="#2563EB" />
        </View>
        <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
          Add New Admin
        </Text>
        <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
          Select a member to grant admin privileges. They will be able to edit
          data alongside you.
        </Text>
        {taLoading ? (
          <View className="my-10">
            <ActivityIndicator color="#2563EB" size="large" />
          </View>
        ) : eligibleAdmins.length === 0 ? (
          <View className="items-center gap-2.5 py-8">
            <Feather name="users" size={36} color="#CBD5E1" />
            <Text className="font-inter-semibold text-base text-gray-500">
              No eligible members
            </Text>
            <Text className="px-2 text-center font-inter text-[13px] leading-5 text-gray-400">
              Members must have linked accounts to become admin. Add them via
              the Consumers tab with an email address.
            </Text>
          </View>
        ) : (
          <>
            {nonAdminMembers.length > 0 && (
              <>
                <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
                  Select Member
                </Text>
                {nonAdminMembers.map((c) => {
                  const sel = selectedConsumerId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      className={`mb-2 flex-row items-center gap-3 rounded-[10px] border-[1.5px] p-3 ${sel ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
                      onPress={() => {
                        setSelectedConsumerId(c.id);
                        setError("");
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        className={`h-9 w-9 items-center justify-center rounded-full ${sel ? "bg-blue-600" : "bg-gray-200"}`}
                      >
                        <Text
                          className={`font-inter-bold text-base ${sel ? "text-white" : "text-gray-700"}`}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        className={`flex-1 text-[15px] ${sel ? "font-inter-semibold text-blue-600" : "font-inter text-gray-900"}`}
                      >
                        {c.name}
                      </Text>
                      {sel && (
                        <Feather
                          name="check-circle"
                          size={18}
                          color="#2563EB"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
            {alreadyAdmins.length > 0 && (
              <>
                <Text className="mb-1.5 mt-3.5 font-inter-semibold text-[13px] text-gray-700">
                  Already Admin
                </Text>
                {alreadyAdmins.map((c) => (
                  <View
                    key={c.id}
                    className="mb-2 flex-row items-center gap-3 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 p-3 opacity-50"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-green-600">
                      <Text className="font-inter-bold text-base text-white">
                        {c.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="flex-1 font-inter text-[15px] text-gray-900">
                      {c.name}
                    </Text>
                    <View className="flex-row items-center gap-1 rounded-lg bg-green-50 px-2 py-[3px]">
                      <Feather name="shield" size={12} color="#16A34A" />
                      <Text className="font-inter-semibold text-[11px] text-green-600">
                        Admin
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
        <ErrorBox />
        {nonAdminMembers.length > 0 && (
          <SubmitBtn
            onPress={handleCaSendCode}
            disabled={!selectedConsumerId}
            label="Send Verification Code"
          />
        )}
        <View className="mt-4 flex-row items-start gap-2 rounded-[10px] border border-blue-200 bg-blue-50 px-3.5 py-3">
          <Feather name="info" size={14} color="#1D4ED8" />
          <Text className="flex-1 font-inter-medium text-xs leading-[18px] text-blue-800">
            The new admin will have full edit access. You remain admin.
          </Text>
        </View>
      </>
    );
  };

  const modalContent =
    activeModal === "changePassword"
      ? renderChangePassword()
      : activeModal === "updateEmail"
        ? renderUpdateEmail()
        : activeModal === "transferAdmin"
          ? renderTransferAdmin()
          : activeModal === "addCoAdmin"
            ? renderAddCoAdmin()
            : null;

  return (
    <View className="flex-1 bg-slate-50">
      {/* ── Header ── */}
      <View
        className={`flex-row items-center justify-between border-b-[0.5px] border-slate-200 bg-white px-4 pb-3.5 ${Platform.OS === "android" ? "pt-safe-offset-3" : "pt-safe-offset-2"}`}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          className="h-9 w-9 items-center justify-center"
        >
          <Feather name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="font-inter-bold text-[17px] text-slate-900">
          Security
        </Text>
        <View className="w-9" />
      </View>

      <ScrollView contentContainerClassName="p-4">
        <Text className="mb-2.5 ml-1 font-inter-semibold text-[11px] tracking-[1px] text-slate-500">
          ACCOUNT SECURITY
        </Text>

        <TouchableOpacity
          className="mb-2.5 flex-row items-center gap-3.5 rounded-[14px] border-[0.5px] border-slate-200 bg-white p-4"
          onPress={() => openModal("changePassword")}
          activeOpacity={0.75}
        >
          <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-blue-50">
            <Feather name="lock" size={18} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="mb-0.5 font-inter-semibold text-[15px] text-slate-900">
              Change Password
            </Text>
            <Text className="font-inter text-xs text-slate-500">
              Update your account password
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity
          className="mb-2.5 flex-row items-center gap-3.5 rounded-[14px] border-[0.5px] border-slate-200 bg-white p-4"
          onPress={() => openModal("updateEmail")}
          activeOpacity={0.75}
        >
          <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-teal-50">
            <Feather name="at-sign" size={18} color="#0D9488" />
          </View>
          <View className="flex-1">
            <Text className="mb-0.5 font-inter-semibold text-[15px] text-slate-900">
              Update Email
            </Text>
            <Text className="font-inter text-xs text-slate-500">
              Change your login email address
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#64748B" />
        </TouchableOpacity>

        {isAdmin && (
          <>
            <TouchableOpacity
              className="mb-2.5 flex-row items-center gap-3.5 rounded-[14px] border-[0.5px] border-slate-200 bg-white p-4"
              onPress={() => openModal("addCoAdmin")}
              activeOpacity={0.75}
            >
              <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-blue-50">
                <Feather name="user-check" size={18} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="mb-0.5 font-inter-semibold text-[15px] text-slate-900">
                  Add New Admin
                </Text>
                <Text className="font-inter text-xs text-slate-500">
                  Grant admin to a member, keep yours
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              className="mb-2.5 flex-row items-center gap-3.5 rounded-[14px] border-[0.5px] border-slate-200 bg-white p-4"
              onPress={() => openModal("transferAdmin")}
              activeOpacity={0.75}
            >
              <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-orange-50">
                <Feather name="shield" size={18} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="mb-0.5 font-inter-semibold text-[15px] text-slate-900">
                  Transfer Admin Role
                </Text>
                <Text className="font-inter text-xs text-slate-500">
                  Make another member the admin
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#64748B" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── Bottom-sheet Modal ── */}
      <Modal
        transparent
        visible={activeModal !== null}
        animationType="slide"
        onRequestClose={step < 2 ? closeModal : undefined}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity
            className="absolute inset-0"
            onPress={step < 2 ? closeModal : undefined}
            activeOpacity={1}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="w-full"
          >
            <View className="pb-safe-offset-4 max-h-[92%] rounded-t-3xl bg-white px-6 pt-7">
              {step < 2 && (
                <TouchableOpacity
                  className="absolute right-4 top-4 z-10 p-1"
                  onPress={closeModal}
                >
                  <Feather name="x" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {modalContent}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
