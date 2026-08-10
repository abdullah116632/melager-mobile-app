import { useRouter } from "expo-router";
import { DashboardScreen } from "@/screens/tabs/DashboardScreen";

export default function DashboardRoute() {
  const router = useRouter();

  return (
    <DashboardScreen
      onManageMealStatus={(date) => router.push(`/meal-status?date=${date}`)}
    />
  );
}
