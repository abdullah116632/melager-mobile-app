import { useEffect, useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SecurityErrorBox } from "@/components/settings/SecurityFormControls";
import { useAuth } from "@/redux/hooks";
import { getMessAdminsV2 } from "@/services/securityService";
import type { MessAdmin } from "@/types/security";

interface ViewAdminsFormProps {
  visible: boolean;
  onClose: () => void;
}

export const ViewAdminsForm = ({ visible, onClose }: ViewAdminsFormProps) => {
  const { token, activeMess } = useAuth();
  const messId = activeMess?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [admins, setAdmins] = useState<MessAdmin[]>([]);

  useEffect(() => {
    if (!visible) {
      setAdmins([]);
      setError("");
      setLoading(true);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      if (!messId) {
        if (!cancelled) {
          setError("No active mess selected.");
          setLoading(false);
        }
        return;
      }
      try {
        const data = await getMessAdminsV2(token, messId);
        if (!cancelled) setAdmins(data.admins);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Failed to load managers",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [visible, messId, token]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/55 px-5">
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="max-h-[80%] rounded-[24px] bg-white shadow-2xl shadow-black/30">
          <ScrollView
            contentContainerClassName="p-6"
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-teal-50">
              <Feather name="users" size={28} color="#0F766E" />
            </View>
            <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
              All Managers
            </Text>
            <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
              Everyone who currently manages {activeMess?.name ?? "this mess"}.
            </Text>

            {loading ? (
              <View className="my-10">
                <ActivityIndicator color="#0F766E" size="large" />
              </View>
            ) : (
              <>
                <SecurityErrorBox message={error} />
                {admins.map((admin) => (
                  <View
                    key={admin.id}
                    className="mb-2 flex-row items-center gap-3 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 p-3"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-teal-700">
                      <Text className="font-inter-bold text-base text-white">
                        {admin.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="font-inter-semibold text-[15px] text-gray-900"
                        numberOfLines={1}
                      >
                        {admin.name}
                      </Text>
                      {!!admin.email && (
                        <Text
                          className="font-inter text-xs text-gray-500"
                          numberOfLines={1}
                        >
                          {admin.email}
                        </Text>
                      )}
                    </View>
                    <View
                      className={`flex-row items-center gap-1 rounded-lg px-2 py-[3px] ${admin.isPrimaryAdmin ? "bg-amber-50" : "bg-green-50"}`}
                    >
                      <Feather
                        name={admin.isPrimaryAdmin ? "star" : "shield"}
                        size={12}
                        color={admin.isPrimaryAdmin ? "#B45309" : "#16A34A"}
                      />
                      <Text
                        className={`font-inter-semibold text-[11px] ${admin.isPrimaryAdmin ? "text-amber-700" : "text-green-600"}`}
                      >
                        {admin.isPrimaryAdmin ? "Primary Manager" : "Manager"}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            <TouchableOpacity
              className="mt-4 h-[52px] items-center justify-center rounded-xl border-[1.5px] border-gray-200 bg-white"
              onPress={onClose}
            >
              <Text className="font-inter-semibold text-base text-gray-700">
                Close
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
