import { useLocalSearchParams } from "expo-router";
import ConsumersScreen from "@/screens/ConsumersScreen";

const ConsumersRoute = () => {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const source = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  return (
    <ConsumersScreen
      returnTo={source === "manager" ? "manager" : "dashboard"}
    />
  );
};

export default ConsumersRoute;
