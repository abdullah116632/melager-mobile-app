import { useEffect, useMemo, useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SecurityErrorBox,
  SecuritySubmitButton,
} from "@/components/settings/SecurityFormControls";
import { useAuth } from "@/context/AuthContext";
import { savePendingAdminOtp } from "@/services/pendingAdminOtpService";
import {
  getEligibleAdmins,
  requestSecurityOtp,
} from "@/services/securityService";
import type { EligibleAdmin } from "@/types/security";

interface TransferAdminFormProps {
  onClose: () => void;
}

export const TransferAdminForm = ({ onClose }: TransferAdminFormProps) => {
  const router = useRouter();
  const { token, user, activeMess } = useAuth();
  const messId = activeMess?.id;
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<EligibleAdmin[]>([]);
  const [search, setSearch] = useState("");
  const [selectedConsumerId, setSelectedConsumerId] = useState<number | null>(
    null,
  );

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return members;

    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(normalizedSearch) ||
        (member.email?.toLowerCase().includes(normalizedSearch) ?? false),
    );
  }, [members, search]);

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      if (!messId) {
        setError("No active mess selected.");
        setLoadingMembers(false);
        return;
      }

      try {
        const data = await getEligibleAdmins(token, messId);
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
  }, [messId, token]);

  const sendCode = async () => {
    if (!messId || !user) {
      setError("No active mess selected.");
      return;
    }
    if (!selectedConsumerId) {
      setError("Please select a member to transfer admin to.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await requestSecurityOtp(token, {
        action: "add_admin",
        payload: String(selectedConsumerId),
        messId,
      });
      const selected = members.find(
        (member) => member.id === selectedConsumerId,
      );
      await savePendingAdminOtp({
        action: "add_admin",
        userId: user.id,
        messId,
        consumerId: selectedConsumerId,
        memberName: selected?.name,
        requestedAt: Date.now(),
      });
      onClose();
      router.push("/settings/admin-otp");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

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
          <ActivityIndicator color="#0F766E" size="large" />
        </View>
      ) : members.length === 0 ? (
        <View className="items-center gap-2.5 py-8">
          <Feather name="users" size={36} color="#CBD5E1" />
          <Text className="font-inter-semibold text-base text-gray-500">
            No eligible members
          </Text>
          <Text className="px-2 text-center font-inter text-[13px] leading-5 text-gray-400">
            Members must have linked accounts to become admin. Add them via the
            Consumers tab with an email address.
          </Text>
        </View>
      ) : filteredMembers.length === 0 ? (
        <View className="items-center gap-2 py-7">
          <Feather name="search" size={28} color="#CBD5E1" />
          <Text className="font-inter-medium text-sm text-gray-500">
            No matching members found
          </Text>
        </View>
      ) : (
        <>
          <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
            Select Member
          </Text>
          {filteredMembers.map((member) => {
            const selected = selectedConsumerId === member.id;
            return (
              <TouchableOpacity
                key={member.id}
                className={`mb-2 flex-row items-center gap-3 rounded-[10px] border-[1.5px] p-3 ${selected ? "border-teal-700 bg-teal-50" : "border-gray-200 bg-gray-50"}`}
                onPress={() => {
                  setSelectedConsumerId(member.id);
                  setError("");
                }}
                activeOpacity={0.7}
              >
                <View
                  className={`h-9 w-9 items-center justify-center rounded-full ${selected ? "bg-teal-700" : "bg-gray-200"}`}
                >
                  <Text
                    className={`font-inter-bold text-base ${selected ? "text-white" : "text-gray-700"}`}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className={`text-[15px] ${selected ? "font-inter-semibold text-teal-700" : "font-inter text-gray-900"}`}
                    numberOfLines={1}
                  >
                    {member.name}
                  </Text>
                  {!!member.email && (
                    <Text
                      className={`font-inter text-xs ${selected ? "text-teal-600" : "text-gray-500"}`}
                      numberOfLines={1}
                    >
                      {member.email}
                    </Text>
                  )}
                </View>
                {selected && (
                  <Feather name="check-circle" size={18} color="#0F766E" />
                )}
              </TouchableOpacity>
            );
          })}
        </>
      )}
      <SecurityErrorBox message={error} />
      {members.length > 0 && (
        <SecuritySubmitButton
          loading={loading}
          onPress={() => void sendCode()}
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
