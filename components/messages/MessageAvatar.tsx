import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

const avatarThemes = [
  { background: "bg-violet-500", border: "border-violet-300" },
  { background: "bg-sky-500", border: "border-sky-300" },
  { background: "bg-amber-500", border: "border-amber-300" },
  { background: "bg-rose-500", border: "border-rose-300" },
  { background: "bg-indigo-500", border: "border-indigo-300" },
  { background: "bg-emerald-500", border: "border-emerald-300" },
] as const;

const sizes = {
  sm: { box: "h-8 w-8 rounded-xl", icon: 15 },
  md: { box: "h-10 w-10 rounded-2xl", icon: 18 },
} as const;

export const MessageAvatar = ({
  userId,
  size = "sm",
}: {
  userId: number;
  size?: keyof typeof sizes;
}) => {
  const theme = avatarThemes[Math.abs(userId) % avatarThemes.length];
  const { box, icon } = sizes[size];
  return (
    <View
      className={`items-center justify-center border ${box} ${theme.background} ${theme.border}`}
    >
      <Feather name="user" size={icon} color="#FFFFFF" />
    </View>
  );
};
