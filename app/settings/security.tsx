import { useLocalSearchParams } from "expo-router";
import { SecurityScreen } from "@/screens/SecurityScreen";

export default function SecurityRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const source = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  return (
    <SecurityScreen returnTo={source === "manager" ? "manager" : "dashboard"} />
  );
}
