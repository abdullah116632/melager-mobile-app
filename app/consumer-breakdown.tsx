import { useLocalSearchParams } from "expo-router";
import { ConsumerBreakdownScreen } from "@/screens/ConsumerBreakdownScreen";

export default function ConsumerBreakdownRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const source = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  return (
    <ConsumerBreakdownScreen
      returnTo={source === "manager" ? "manager" : "dashboard"}
    />
  );
}
