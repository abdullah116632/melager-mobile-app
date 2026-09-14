import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  getOfflineDatabase,
  isOfflineDatabaseSupported,
} from "@/offline/database/connection";
import { getLocalAuthSnapshot } from "@/offline/features/reference/storage";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import { useAppSelector } from "@/redux/hooks";

/**
 * Tells whoever is signing in what happens to work left on this phone: unsynced
 * changes stay only if the same account signs in again.
 */
export const AccountNotice = () => {
  const sessionNotice = useAppSelector((state) => state.auth.sessionNotice);
  const [pending, setPending] = useState<{
    email: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    if (!isOfflineDatabaseSupported()) return;
    let cancelled = false;
    void (async () => {
      const snapshot = await getLocalAuthSnapshot();
      if (!snapshot) return;
      const runtime = getOfflineRuntime(await getOfflineDatabase());
      const count = await runtime.outbox.countAllPending(snapshot.me.user.id);
      if (!cancelled && count > 0) {
        setPending({ email: snapshot.me.user.email, count });
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const message = pending
    ? `This phone has ${pending.count} unsynced ${
        pending.count === 1 ? "change" : "changes"
      } from ${pending.email}. Sign in with that account to keep ${
        pending.count === 1 ? "it" : "them"
      }; signing in with a different account deletes ${
        pending.count === 1 ? "it" : "them"
      }.`
    : sessionNotice;
  if (!message) return null;

  return (
    <View className="mb-4 flex-row items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Feather
        name={pending ? "alert-triangle" : "clock"}
        size={16}
        color="#B45309"
        style={{ marginTop: 1 }}
      />
      <Text className="flex-1 font-inter text-[13px] leading-[19px] text-amber-900">
        {message}
      </Text>
    </View>
  );
};
