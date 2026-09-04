import { useLocalSearchParams, useRouter } from "expo-router";
import { MemberRequestsScreen } from "@/screens/MemberRequestsScreen";

export default function MemberRequestsRoute() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const source = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const goBack = () =>
    source === "manager"
      ? router.replace("/(tabs)/manager")
      : router.replace("/(tabs)/dashboard");

  return <MemberRequestsScreen onBack={goBack} />;
}
