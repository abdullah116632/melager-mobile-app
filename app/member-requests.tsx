import { useRouter } from "expo-router";
import { MemberRequestsScreen } from "@/screens/MemberRequestsScreen";

export default function MemberRequestsRoute() {
  const router = useRouter();

  return <MemberRequestsScreen onBack={() => router.back()} />;
}
