import { useLocalSearchParams, useRouter } from "expo-router";
import { MessSetupScreen } from "@/screens/MessSetupScreen";
import type { MessSetupMode } from "@/types/messSetup";

export default function MessSetupRoute() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string | string[] }>();
  const requestedMode = Array.isArray(mode) ? mode[0] : mode;
  const initialMode: MessSetupMode | undefined =
    requestedMode === "create" || requestedMode === "join"
      ? requestedMode
      : undefined;
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/mess-hub");

  return (
    <MessSetupScreen
      initialMode={initialMode}
      onBack={goBack}
      onBackToHub={() => router.replace("/mess-hub")}
    />
  );
}
