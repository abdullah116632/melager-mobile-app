import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  Linking,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { APP_VERSION, PLAY_STORE_URL } from "@/constants/app";
import { getAppUpdatePolicy } from "@/lib/api";
import { isAppOlderThan, type AppUpdatePolicy } from "@/lib/appUpdate";

// Coming back after this long counts as opening the app again, so a closed
// normal popup shows once more. Short trips (share sheet, image picker) do not.
const REOPEN_AFTER_MS = 5 * 60 * 1000;

const openStore = async (storeUrl: string) => {
  // market:// opens the Play Store app directly; the web link is the fallback.
  const marketUrl = storeUrl.replace(
    "https://play.google.com/store/apps/",
    "market://",
  );
  try {
    await Linking.openURL(marketUrl);
  } catch {
    await Linking.openURL(storeUrl).catch(() => undefined);
  }
};

/**
 * Update popups, driven by the server's LATEST_APP_VERSION and MIN_APP_VERSION
 * (GET /api/app/version), checked on launch and whenever the app returns to
 * the foreground.
 * - Normal (below latestVersion): "New version available" with a Play Store
 *   button and "Later". Shows again the next time the app is opened.
 * - Hard (below minVersion): "Update required" that cannot be closed, so the
 *   app cannot be used until it is updated.
 * A failed check (offline, server unreachable) shows nothing.
 */
export const AppUpdateGate = () => {
  const [policy, setPolicy] = useState<AppUpdatePolicy | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const check = () => {
      void getAppUpdatePolicy()
        .then(setPolicy)
        .catch(() => undefined);
    };
    check();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        backgroundedAt.current ??= Date.now();
        return;
      }
      const awayFor = Date.now() - (backgroundedAt.current ?? Date.now());
      backgroundedAt.current = null;
      if (awayFor >= REOPEN_AFTER_MS) setDismissed(false);
      check();
    });
    return () => subscription.remove();
  }, []);

  const hard = isAppOlderThan(policy?.minVersion);
  const normal = !hard && !dismissed && isAppOlderThan(policy?.latestVersion);
  const storeUrl = policy?.storeUrl ?? PLAY_STORE_URL;
  const newVersion = policy?.latestVersion ?? policy?.minVersion;

  return (
    <Modal
      visible={hard || normal}
      transparent
      animationType="fade"
      statusBarTranslucent
      // Android back must not close the hard popup.
      onRequestClose={() => {
        if (!hard) setDismissed(true);
      }}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-5">
        <View className="w-full max-w-[420px] overflow-hidden rounded-3xl bg-white">
          <View className="items-center px-5 pb-4 pt-6">
            <View
              className={`h-12 w-12 items-center justify-center rounded-full ${
                hard ? "bg-amber-100" : "bg-teal-50"
              }`}
            >
              <Feather
                name="download"
                size={22}
                color={hard ? "#B45309" : "#0F766E"}
              />
            </View>
            <Text className="mt-3 text-center font-inter-bold text-[17px] text-slate-900">
              {hard ? "Update required" : "New version available"}
            </Text>
            <Text className="mt-1.5 text-center font-inter text-[13px] leading-[19px] text-slate-600">
              {hard
                ? "This update is important. Please update the app from the Play Store to continue using it."
                : "A new version of the app is available. Please update your app from the Play Store."}
            </Text>
            <View className="mt-3 rounded-full bg-slate-100 px-3 py-1">
              <Text className="font-inter-medium text-[11px] text-slate-600">
                Your version {APP_VERSION}
                {newVersion ? `  →  Latest ${newVersion}` : ""}
              </Text>
            </View>
          </View>

          <View className="gap-2 px-4 pb-4 pt-1">
            <TouchableOpacity
              className="h-12 items-center justify-center rounded-xl bg-teal-700"
              onPress={() => void openStore(storeUrl)}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text className="font-inter-semibold text-sm text-white">
                Update on Play Store
              </Text>
            </TouchableOpacity>
            {!hard && (
              <TouchableOpacity
                className="h-11 items-center justify-center rounded-xl"
                onPress={() => setDismissed(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text className="font-inter-medium text-sm text-slate-500">
                  Later
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
