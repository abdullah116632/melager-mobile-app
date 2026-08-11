import { useRouter } from "expo-router";

import { SecurityScreen } from "@/screens/SecurityScreen";

export default function SecurityRoute() {
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  return <SecurityScreen onBack={goBack} />;
}
