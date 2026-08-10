import { MEMBER_AVATAR_COLORS } from "@/constants/memberRequest";

export const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

export const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  return MEMBER_AVATAR_COLORS[Math.abs(hash) % MEMBER_AVATAR_COLORS.length]!;
};
