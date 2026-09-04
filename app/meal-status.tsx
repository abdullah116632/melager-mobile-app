import { useLocalSearchParams, useRouter } from "expo-router";
import { MealStatusScreen } from "@/screens/MealStatusScreen";

export default function MealStatusRoute() {
  const router = useRouter();
  const { date, returnTo } = useLocalSearchParams<{
    date?: string | string[];
    returnTo?: string | string[];
  }>();
  const initialDate = Array.isArray(date) ? date[0] : date;
  const source = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const goBack = () =>
    source === "manager"
      ? router.replace("/(tabs)/manager")
      : router.replace("/(tabs)/dashboard");

  return <MealStatusScreen initialDate={initialDate} onBack={goBack} />;
}
