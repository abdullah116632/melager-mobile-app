import { Alert, type AlertButton } from "react-native";

import {
  getOfflineDatabase,
  isOfflineDatabaseSupported,
} from "@/offline/database/connection";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import { useAppStore } from "@/redux/hooks";

type LogoutAction = () => void | Promise<unknown>;

const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

/**
 * Logging out deletes this phone's local data, including changes that have
 * not reached the server yet. The returned guard warns about those first and
 * offers to sync them; with nothing pending it runs the usual flow, either the
 * screen's own confirmation or the logout itself.
 */
export const useLogoutGuard = () => {
  const store = useAppStore();

  const guard = async (
    logoutNow: LogoutAction,
    confirmUsual?: () => void,
    afterSync = false,
  ): Promise<void> => {
    const { auth, network } = store.getState();
    // A sync can end the session (expired token). Logging out then would
    // wipe the very changes this guard is protecting.
    if (afterSync && !auth.token) return;
    const userId = auth.user?.id;
    let pending = 0;
    if (userId && isOfflineDatabaseSupported()) {
      try {
        const runtime = getOfflineRuntime(await getOfflineDatabase());
        pending = await runtime.outbox.countAllPending(userId);
      } catch {
        pending = 0;
      }
    }
    if (pending === 0) {
      if (confirmUsual) confirmUsual();
      else await logoutNow();
      return;
    }

    const syncEverything = async () => {
      const token = store.getState().auth.token;
      if (!token || !userId) return;
      const runtime = getOfflineRuntime(await getOfflineDatabase());
      // An explicit request should not wait out retry backoff.
      await runtime.outbox.makeReadyNow(userId);
      for (const messId of await runtime.outbox.listPendingMessIds(userId)) {
        await runtime.engine.sync({ token, userId, messId }, { force: true });
      }
    };

    const message = [
      `${pending} ${plural(pending, "change", "changes")} made on this phone ${plural(pending, "has", "have")} not reached the server yet. If you log out now, ${plural(pending, "it", "they")} will be deleted.`,
      afterSync ? "Syncing could not send everything yet." : null,
      network.isOnline
        ? null
        : "Connect to the internet and open the app to sync first.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const buttons: AlertButton[] = [{ text: "Cancel", style: "cancel" }];
    if (network.isOnline) {
      buttons.push({
        text: "Sync now",
        onPress: () => {
          void syncEverything()
            .catch(() => undefined)
            .then(() => guard(logoutNow, confirmUsual, true));
        },
      });
    }
    buttons.push({
      text: "Log out anyway",
      style: "destructive",
      onPress: () => {
        void logoutNow();
      },
    });
    Alert.alert("Unsynced changes", message, buttons);
  };

  return guard;
};
