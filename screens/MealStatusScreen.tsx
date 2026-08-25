import { Platform, View } from "react-native";
import { MealStatusContent } from "@/components/meal-status/MealStatusContent";

interface MealStatusScreenProps {
  initialDate?: string;
  onBack: () => void;
}

export const MealStatusScreen = ({
  initialDate,
  onBack,
}: MealStatusScreenProps) => (
  <View
    className={`flex-1 bg-slate-50 ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
  >
    <MealStatusContent initialDate={initialDate} onBack={onBack} />
  </View>
);
