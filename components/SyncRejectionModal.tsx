import Feather from "@expo/vector-icons/Feather";
import { useCallback, useEffect, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useOfflineDatabase } from "@/offline/provider/OfflineDatabaseProvider";
import {
  SyncRejectionRepository,
  subscribeToSyncRejections,
  type SyncRejection,
  type SyncRejectionScope,
} from "@/offline/repositories/syncRejectionRepository";
import { useAuth } from "@/redux/hooks";

const formatTime = (ms: number) =>
  new Date(ms).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

interface SyncRejectionModalProps {
  scope: SyncRejectionScope;
  /** Shown on the modal so the admin knows which page it is about. */
  pageLabel: string;
}

/**
 * Tells the admin which of their changes on this page the server turned down
 * because another admin changed the same thing first. Nothing to decide: the
 * page already shows the other admin's version.
 */
export const SyncRejectionModal = ({
  scope,
  pageLabel,
}: SyncRejectionModalProps) => {
  const { database } = useOfflineDatabase();
  const { user, mess } = useAuth();
  const [rejections, setRejections] = useState<SyncRejection[]>([]);
  // Keep the last messages on screen while the modal fades out.
  const [shown, setShown] = useState<SyncRejection[]>([]);

  const refresh = useCallback(() => {
    if (!database || !user?.id || !mess?.id) return;
    void new SyncRejectionRepository(database)
      .list(user.id, mess.id, scope)
      .then(setRejections)
      .catch(() => undefined);
  }, [database, mess?.id, scope, user?.id]);

  useEffect(() => {
    refresh();
    return subscribeToSyncRejections(refresh);
  }, [refresh]);

  useEffect(() => {
    if (rejections.length > 0) setShown(rejections);
  }, [rejections]);

  const dismiss = () => {
    if (!database) return;
    void new SyncRejectionRepository(database)
      .dismiss(rejections.map((rejection) => rejection.id))
      .catch(() => undefined);
  };

  const title =
    shown.length === 1
      ? "1 change was not saved"
      : `${shown.length} changes were not saved`;

  return (
    <Modal
      visible={rejections.length > 0}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-5">
        <View
          className="w-full max-w-[420px] overflow-hidden rounded-3xl bg-white"
          style={{ maxHeight: "80%" }}
        >
          <View className="items-center px-5 pb-4 pt-6">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Feather name="info" size={22} color="#B45309" />
            </View>
            <View className="mt-3 rounded-full bg-teal-50 px-2.5 py-0.5">
              <Text className="font-inter-semibold text-[10px] uppercase tracking-wide text-teal-700">
                {pageLabel}
              </Text>
            </View>
            <Text className="mt-2 text-center font-inter-bold text-[17px] text-slate-900">
              {title}
            </Text>
            <Text className="mt-1.5 text-center font-inter text-[12px] leading-[18px] text-slate-600">
              Another admin changed the same things first, so these changes from
              this phone were not saved. The page now shows the latest version.
            </Text>
          </View>

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            showsVerticalScrollIndicator
          >
            {shown.map((rejection) => (
              <View
                key={rejection.id}
                className="flex-row gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <Feather
                  name="alert-circle"
                  size={15}
                  color="#B45309"
                  style={{ marginTop: 2 }}
                />
                <View className="min-w-0 flex-1">
                  <Text className="font-inter text-[13px] leading-[19px] text-slate-700">
                    {rejection.message}
                  </Text>
                  <Text className="mt-1 font-inter text-[10px] text-slate-400">
                    {formatTime(rejection.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="px-4 pb-4 pt-3">
            <TouchableOpacity
              className="h-12 items-center justify-center rounded-xl bg-teal-700"
              onPress={dismiss}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text className="font-inter-semibold text-sm text-white">
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
