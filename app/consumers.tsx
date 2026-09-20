import { useLocalSearchParams } from "expo-router";
import ConsumersScreen from "@/screens/ConsumersScreen";

const ConsumersRoute = () => {
  const { returnTo, add } = useLocalSearchParams<{
    returnTo?: string | string[];
    add?: string | string[];
  }>();
  const source = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const openAdd = Array.isArray(add) ? add[0] : add;
  return (
    <ConsumersScreen
      returnTo={source === "manager" ? "manager" : "dashboard"}
      autoOpenAddMember={openAdd === "1"}
    />
  );
};

export default ConsumersRoute;
