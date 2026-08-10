const AVATAR_COLORS = [
  "#0D9488",
  "#0284C7",
  "#7C3AED",
  "#DB2777",
  "#EA580C",
  "#059669",
];

export const getProfileInitials = (name: string): string =>
  name
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

export const getProfileAvatarColor = (name: string): string => {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const isValidInviteEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
