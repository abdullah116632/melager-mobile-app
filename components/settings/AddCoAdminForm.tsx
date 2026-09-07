import { useEffect, useMemo, useState } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SecurityErrorBox,
  SecuritySubmitButton,
  SecuritySuccessCard,
} from "@/components/settings/SecurityFormControls";
import { useKeyboardSheetOffset } from "@/hooks/useKeyboardSheetOffset";
import { useAuth } from "@/redux/hooks";
import { saveOpenForgotPasswordIntent } from "@/services/pendingForgotPasswordIntentService";
import {
  GOOGLE_SIGN_IN_BUILD_REQUIRED_MESSAGE,
  loadGoogleSignInModule,
} from "@/services/googleSignInService";
import {
  addCoAdminV2,
  getEligibleAdminsV2,
} from "@/services/securityService";
import type { EligibleAdmin } from "@/types/security";

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

interface AddCoAdminFormProps {
  visible: boolean;
  onClose: () => void;
}

export const AddCoAdminForm = ({ visible, onClose }: AddCoAdminFormProps) => {
  const { token, user, activeMess, logout } = useAuth();
  const messId = activeMess?.id;
  const androidKeyboardOffset = useKeyboardSheetOffset();
  const [step, setStep] = useState<"select" | "identity" | "success">(
    "select",
  );
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<EligibleAdmin[]>([]);
  const [search, setSearch] = useState("");
  const [selectedConsumerId, setSelectedConsumerId] = useState<number | null>(
    null,
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep("select");
      setError("");
      setMembers([]);
      setSearch("");
      setSelectedConsumerId(null);
      setPassword("");
      setShowPassword(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoadingMembers(true);

    const loadMembers = async () => {
      if (!messId) {
        if (!cancelled) {
          setError("No active mess selected.");
          setLoadingMembers(false);
        }
        return;
      }

      try {
        const data = await getEligibleAdminsV2(token, messId);
        if (!cancelled) setMembers(data.consumers);
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Failed to load members",
          );
        }
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    };

    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [visible, messId, token]);

  const { nonAdminMembers, alreadyAdmins } = useMemo(() => {
    // Defensive: the server already excludes the caller from the eligible
    // list, but never allow the current admin to appear as a target here
    // regardless.
    const selectable = members.filter((member) => member.userId !== user?.id);
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = selectable.filter(
      (member) =>
        !normalizedSearch ||
        member.name.toLowerCase().includes(normalizedSearch) ||
        (member.email?.toLowerCase().includes(normalizedSearch) ?? false),
    );

    return {
      nonAdminMembers: filtered.filter((member) => !member.isAdmin),
      alreadyAdmins: filtered.filter((member) => member.isAdmin),
    };
  }, [members, search, user?.id]);

  const selectedMember = members.find(
    (member) => member.id === selectedConsumerId,
  );

  const close = () => {
    if (!loading) onClose();
  };

  const goToIdentityStep = () => {
    if (!selectedConsumerId) {
      setError("Please select a member to grant manager access to.");
      return;
    }
    if (selectedMember?.userId === user?.id) {
      setError("You are already the manager.");
      return;
    }
    setError("");
    setStep("identity");
  };

  const grantAdmin = async () => {
    if (!messId || !selectedConsumerId) return;
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await addCoAdminV2(token, {
        messId,
        consumerId: selectedConsumerId,
        password,
      });
      setStep("success");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to grant manager access.",
      );
      setLoading(false);
    }
  };

  const grantAdminWithGoogle = async () => {
    if (!messId || !selectedConsumerId) return;
    if (!googleWebClientId) {
      setError("Google sign-in is not configured yet.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const googleSignInModule = await loadGoogleSignInModule();
      if (!googleSignInModule) {
        setError(GOOGLE_SIGN_IN_BUILD_REQUIRED_MESSAGE);
        return;
      }
      const { GoogleSignin, isSuccessResponse } = googleSignInModule;
      GoogleSignin.configure({ webClientId: googleWebClientId });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return;
      if (!response.data.idToken) {
        setError("Google did not return a sign-in token. Please try again.");
        return;
      }
      await addCoAdminV2(token, {
        messId,
        consumerId: selectedConsumerId,
        googleIdToken: response.data.idToken,
      });
      setStep("success");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(
        message.includes("RNGoogleSignin")
          ? GOOGLE_SIGN_IN_BUILD_REQUIRED_MESSAGE
          : "Verification failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const goToForgotPassword = async () => {
    await saveOpenForgotPasswordIntent();
    onClose();
    await logout();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        className="flex-1 justify-center bg-black/55 px-5"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ paddingBottom: androidKeyboardOffset }}
      >
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={close}
        />
        <View className="max-h-[92%] rounded-[24px] bg-white shadow-2xl shadow-black/30">
          <ScrollView
            contentContainerClassName="p-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === "success" ? (
              <SecuritySuccessCard
                icon="check-circle"
                iconClassName="bg-green-50"
                iconColor="#16A34A"
                title="Manager Added!"
                body="The selected member now has manager privileges. Your privileges are unchanged."
                onClose={onClose}
              />
            ) : step === "identity" ? (
              <>
                <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-blue-50">
                  <Feather name="user-check" size={28} color="#2563EB" />
                </View>
                <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
                  Confirm Your Identity
                </Text>
                <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
                  Verify it&apos;s you to grant manager access
                  {selectedMember ? ` to ${selectedMember.name}` : ""}.
                </Text>

                <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
                  Password
                </Text>
                <View className="flex-row gap-2">
                  <TextInput
                    className="h-12 flex-1 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 px-3.5 font-inter text-[15px] text-gray-900"
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      setError("");
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={() => void grantAdmin()}
                  />
                  <TouchableOpacity
                    className="h-12 w-12 items-center justify-center rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50"
                    onPress={() => setShowPassword((visibleState) => !visibleState)}
                    disabled={loading}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  className="mb-4 mt-3 self-start"
                  onPress={() => void goToForgotPassword()}
                  disabled={loading}
                >
                  <Text className="font-inter-semibold text-[13px] text-teal-700">
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`h-[52px] flex-row items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-gray-200 bg-white ${loading ? "opacity-50" : "opacity-100"}`}
                  onPress={() => void grantAdminWithGoogle()}
                  disabled={loading}
                >
                  <AntDesign name="google" size={18} color="#EA4335" />
                  <Text className="font-inter-semibold text-[15px] text-gray-700">
                    Verify with Google
                  </Text>
                </TouchableOpacity>

                <SecurityErrorBox message={error} />

                <View className="mt-2 flex-row gap-3">
                  <TouchableOpacity
                    className="h-[52px] flex-1 items-center justify-center rounded-xl border-[1.5px] border-gray-200 bg-white"
                    onPress={() => {
                      setError("");
                      setStep("select");
                    }}
                    disabled={loading}
                  >
                    <Text className="font-inter-semibold text-base text-gray-700">
                      Back
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`h-[52px] flex-1 items-center justify-center rounded-xl bg-blue-600 ${loading || !password ? "opacity-50" : "opacity-100"}`}
                    onPress={() => void grantAdmin()}
                    disabled={loading || !password}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="font-inter-bold text-base text-white">
                        Grant Manager
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-blue-50">
                  <Feather name="user-check" size={28} color="#2563EB" />
                </View>
                <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
                  Add New Manager
                </Text>
                <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
                  Select a member to grant manager privileges. They will be
                  able to edit data alongside you.
                </Text>
                {members.length > 0 && (
                  <View className="mb-4 h-12 flex-row items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5">
                    <Feather name="search" size={16} color="#64748B" />
                    <TextInput
                      className="flex-1 py-0 font-inter text-sm text-gray-900"
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search by name or email"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                    />
                    {search.length > 0 && (
                      <TouchableOpacity
                        className="h-7 w-7 items-center justify-center rounded-full bg-gray-200"
                        onPress={() => setSearch("")}
                        hitSlop={8}
                      >
                        <Feather name="x" size={14} color="#64748B" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {loadingMembers ? (
                  <View className="my-10">
                    <ActivityIndicator color="#2563EB" size="large" />
                  </View>
                ) : members.length === 0 ? (
                  <View className="items-center gap-2.5 py-8">
                    <Feather name="users" size={36} color="#CBD5E1" />
                    <Text className="font-inter-semibold text-base text-gray-500">
                      No eligible members
                    </Text>
                    <Text className="px-2 text-center font-inter text-[13px] leading-5 text-gray-400">
                      Members must have linked accounts to become manager. Add
                      them via the Consumers tab with an email address.
                    </Text>
                  </View>
                ) : (
                  <>
                    {nonAdminMembers.length > 0 && (
                      <>
                        <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
                          Select Member
                        </Text>
                        {nonAdminMembers.map((member) => {
                          const selected = selectedConsumerId === member.id;
                          return (
                            <TouchableOpacity
                              key={member.id}
                              className={`mb-2 flex-row items-center gap-3 rounded-[10px] border-[1.5px] p-3 ${selected ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
                              onPress={() => {
                                setSelectedConsumerId(member.id);
                                setError("");
                              }}
                              activeOpacity={0.7}
                            >
                              <View
                                className={`h-9 w-9 items-center justify-center rounded-full ${selected ? "bg-blue-600" : "bg-gray-200"}`}
                              >
                                <Text
                                  className={`font-inter-bold text-base ${selected ? "text-white" : "text-gray-700"}`}
                                >
                                  {member.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View className="min-w-0 flex-1">
                                <Text
                                  className={`text-[15px] ${selected ? "font-inter-semibold text-blue-600" : "font-inter text-gray-900"}`}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {member.name}
                                </Text>
                                {!!member.email && (
                                  <Text
                                    className={`font-inter text-xs ${selected ? "text-blue-500" : "text-gray-500"}`}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                  >
                                    {member.email}
                                  </Text>
                                )}
                              </View>
                              {selected && (
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
                          Already Manager
                        </Text>
                        {alreadyAdmins.map((member) => (
                          <View
                            key={member.id}
                            className="mb-2 flex-row items-center gap-3 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 p-3 opacity-50"
                          >
                            <View className="h-9 w-9 items-center justify-center rounded-full bg-green-600">
                              <Text className="font-inter-bold text-base text-white">
                                {member.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View className="min-w-0 flex-1">
                              <Text
                                className="font-inter text-[15px] text-gray-900"
                                numberOfLines={1}
                              >
                                {member.name}
                              </Text>
                              {!!member.email && (
                                <Text
                                  className="font-inter text-xs text-gray-500"
                                  numberOfLines={1}
                                >
                                  {member.email}
                                </Text>
                              )}
                            </View>
                            <View className="flex-row items-center gap-1 rounded-lg bg-green-50 px-2 py-[3px]">
                              <Feather name="shield" size={12} color="#16A34A" />
                              <Text className="font-inter-semibold text-[11px] text-green-600">
                                Manager
                              </Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                    {nonAdminMembers.length === 0 &&
                      alreadyAdmins.length === 0 && (
                        <View className="items-center gap-2 py-7">
                          <Feather name="search" size={28} color="#CBD5E1" />
                          <Text className="font-inter-medium text-sm text-gray-500">
                            No matching members found
                          </Text>
                        </View>
                      )}
                  </>
                )}
                <SecurityErrorBox message={error} />
                {nonAdminMembers.length > 0 && (
                  <SecuritySubmitButton
                    loading={false}
                    onPress={goToIdentityStep}
                    disabled={!selectedConsumerId}
                    label="Continue"
                  />
                )}
                <View className="mt-4 flex-row items-start gap-2 rounded-[10px] border border-blue-200 bg-blue-50 px-3.5 py-3">
                  <Feather name="info" size={14} color="#1D4ED8" />
                  <Text className="flex-1 font-inter-medium text-xs leading-[18px] text-blue-800">
                    The new manager will have full edit access. You remain
                    manager.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
