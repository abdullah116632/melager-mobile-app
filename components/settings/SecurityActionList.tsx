import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/redux/hooks";
import type { SecurityModalType } from "@/types/security";

type ActionModal = Exclude<SecurityModalType, null>;
type IconName = ComponentProps<typeof Feather>["name"];

interface SecurityActionListProps {
  onOpen: (modal: ActionModal) => void;
}

interface SecurityActionProps {
  icon: IconName;
  iconClassName: string;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
  warning?: boolean;
  danger?: boolean;
}

const SecurityAction = ({
  icon,
  iconClassName,
  iconColor,
  title,
  description,
  onPress,
  warning = false,
  danger = false,
}: SecurityActionProps) => (
  <TouchableOpacity
    className={`mb-3 flex-row items-center gap-3.5 rounded-2xl border p-4 shadow-sm ${danger ? "border-red-200 bg-red-50/50 shadow-red-200/30" : warning ? "border-amber-200 bg-amber-50/40 shadow-amber-200/30" : "border-slate-200 bg-white shadow-slate-300/40"}`}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View
      className={`h-10 w-10 items-center justify-center rounded-[10px] ${iconClassName}`}
    >
      <Feather name={icon} size={18} color={iconColor} />
    </View>
    <View className="flex-1">
      <Text className="mb-0.5 font-inter-semibold text-[15px] text-slate-900">
        {title}
      </Text>
      <Text className="font-inter text-xs text-slate-500">{description}</Text>
    </View>
    <Feather name="chevron-right" size={18} color="#64748B" />
  </TouchableOpacity>
);

export const SecurityActionList = ({ onOpen }: SecurityActionListProps) => {
  const { role } = useAuth();

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="p-4 pb-safe-offset-6"
    >
      <Text className="mb-2.5 ml-1 font-inter-semibold text-[11px] tracking-[1px] text-slate-500">
        ACCOUNT SECURITY
      </Text>
      <SecurityAction
        icon="lock"
        iconClassName="bg-blue-50"
        iconColor="#2563EB"
        title="Change Password"
        description="Update your account password"
        onPress={() => onOpen("changePassword")}
      />
      <SecurityAction
        icon="at-sign"
        iconClassName="bg-teal-50"
        iconColor="#0D9488"
        title="Update Email"
        description="Change your login email address"
        onPress={() => onOpen("updateEmail")}
      />

      {role === "admin" && (
        <>
          <Text className="mb-2.5 ml-1 mt-3 font-inter-semibold text-[11px] tracking-[1px] text-slate-500">
            ADMIN CONTROLS
          </Text>
          <SecurityAction
            icon="user-check"
            iconClassName="bg-blue-50"
            iconColor="#2563EB"
            title="Add New Admin"
            description="Grant admin to a member, keep yours"
            onPress={() => onOpen("addCoAdmin")}
          />
          <SecurityAction
            icon="shield"
            iconClassName="bg-orange-50"
            iconColor="#EA580C"
            title="Transfer Admin Role"
            description="Make another member the admin"
            warning
            onPress={() => onOpen("transferAdmin")}
          />
          <SecurityAction
            icon="user-minus"
            iconClassName="bg-red-100"
            iconColor="#DC2626"
            title="Remove My Admin Role"
            description="Continue in this mess as a regular member"
            danger
            onPress={() => onOpen("leaveAdmin")}
          />
        </>
      )}
    </ScrollView>
  );
};
