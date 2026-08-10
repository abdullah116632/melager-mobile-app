import { StyleSheet } from "react-native";

export const profileStyles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingTop: 20, gap: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  sectionWrapper: { paddingHorizontal: 16, gap: 6 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  editInput: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    borderBottomWidth: 1.5,
    paddingVertical: 2,
    marginTop: 2,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 14,
    paddingBottom: 10,
    marginTop: -4,
  },

  profileActions: { paddingHorizontal: 16, gap: 10 },
  messKeyValue: { letterSpacing: 2 },
  inviteIconWrapper: { backgroundColor: "#EFF6FF" },
  inviteButton: { backgroundColor: "#EFF6FF" },
  inviteButtonText: { color: "#3B82F6" },
  successText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 14,
    paddingBottom: 10,
    marginTop: -4,
    color: "#059669",
  },
  switchMessButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ECFDF5",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
  },
  switchMessText: {
    color: "#0F766E",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#DC2626",
    paddingVertical: 15,
    borderRadius: 14,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
