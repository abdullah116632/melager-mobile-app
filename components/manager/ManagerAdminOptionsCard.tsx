import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, TouchableOpacity, View } from "react-native";

type AdminOption = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tintClassName: string;
  iconColor: string;
  onPress: () => void;
};

interface ManagerAdminOptionsCardProps {
  options: AdminOption[];
}

export const ManagerAdminOptionsCard = ({
  options,
}: ManagerAdminOptionsCardProps) => (
  <View className="mx-4 mb-4 rounded-[18px] border border-slate-300 bg-white p-3">
    <View className="mb-3 flex-row items-center gap-2 px-1">
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
        <Ionicons name="settings-outline" size={17} color="#475569" />
      </View>
      <Text className="font-inter-semibold text-sm text-slate-800">
        Admin Options
      </Text>
    </View>

    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => (
        <TouchableOpacity
          key={option.label}
          className="min-h-[64px] w-[23%] flex-shrink-0 flex-grow-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-1 py-1.5"
          onPress={option.onPress}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={option.label}
        >
          <View
            className={`h-8 w-8 items-center justify-center rounded-lg ${option.tintClassName}`}
          >
            <Ionicons name={option.icon} size={18} color={option.iconColor} />
          </View>
          <Text
            className="mt-1 text-center font-inter-semibold text-[9px] text-slate-600"
            numberOfLines={2}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);
