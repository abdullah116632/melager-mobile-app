import { useLocalSearchParams } from "expo-router";
import { CalculatorScreen } from "@/screens/CalculatorScreen";

export default function CalculatorRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const source = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  return (
    <CalculatorScreen
      returnTo={source === "manager" ? "manager" : "dashboard"}
    />
  );
}
