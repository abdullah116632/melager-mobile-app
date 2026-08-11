import { useRouter } from "expo-router";

import { MessHubScreen } from "@/screens/MessHubScreen";

export default function RootRoute() {
  const router = useRouter();

  return (
    <MessHubScreen
      onCreateMess={() => router.push("/mess-setup?mode=create")}
      onJoinMess={() => router.push("/mess-setup?mode=join")}
    />
  );
}
