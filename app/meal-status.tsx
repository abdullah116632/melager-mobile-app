import { useLocalSearchParams, useRouter } from "expo-router";
import { MealStatusScreen } from "@/screens/MealStatusScreen";

export default function MealStatusRoute() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string | string[] }>();
  const initialDate = Array.isArray(date) ? date[0] : date;

  return (
    <MealStatusScreen initialDate={initialDate} onBack={() => router.back()} />
  );
}
