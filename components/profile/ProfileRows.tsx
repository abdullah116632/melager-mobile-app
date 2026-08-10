import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

interface ProfileRowProps {
  icon: FeatherIconName;
  label: string;
  value: string;
  valueClassName?: string;
  showDivider?: boolean;
}

const RowIcon = ({ icon }: { icon: FeatherIconName }) => (
  <View className="h-[34px] w-[34px] items-center justify-center rounded-lg bg-slate-100">
    <Feather name={icon} size={16} color="#0F766E" />
  </View>
);

export const ProfileRow = ({
  icon,
  label,
  value,
  valueClassName = "text-slate-900",
  showDivider,
}: ProfileRowProps) => (
  <View
    className={`flex-row items-center gap-3 px-3.5 py-[13px] ${showDivider ? "border-b-[0.5px] border-slate-200" : ""}`}
  >
    <RowIcon icon={icon} />
    <View className="flex-1">
      <Text className="font-inter-medium text-[11px] text-slate-500">
        {label}
      </Text>
      <Text className={`mt-px font-inter-medium text-sm ${valueClassName}`}>
        {value}
      </Text>
    </View>
  </View>
);

interface ProfileEditableRowProps extends ProfileRowProps {
  onEdit?: () => void;
}

export const ProfileEditableRow = ({
  icon,
  label,
  value,
  valueClassName = "text-slate-900",
  showDivider,
  onEdit,
}: ProfileEditableRowProps) => (
  <View
    className={`flex-row items-center gap-3 px-3.5 py-[13px] ${showDivider ? "border-b-[0.5px] border-slate-200" : ""}`}
  >
    <RowIcon icon={icon} />
    <View className="flex-1">
      <Text className="font-inter-medium text-[11px] text-slate-500">
        {label}
      </Text>
      <Text className={`mt-px font-inter-medium text-sm ${valueClassName}`}>
        {value}
      </Text>
    </View>
    {onEdit && (
      <TouchableOpacity
        className="flex-row items-center gap-[5px] rounded-lg bg-slate-100 px-2.5 py-[7px]"
        onPress={onEdit}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Feather name="edit-2" size={14} color="#0F766E" />
        <Text className="font-inter-semibold text-xs text-teal-700">Edit</Text>
      </TouchableOpacity>
    )}
  </View>
);

interface ProfileEditRowProps {
  icon: FeatherIconName;
  label: string;
  value: string;
  saving: boolean;
  error: string;
  showDivider?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const ProfileEditRow = ({
  icon,
  label,
  value,
  saving,
  error,
  showDivider,
  onChange,
  onSave,
  onCancel,
}: ProfileEditRowProps) => (
  <View className={showDivider ? "border-b-[0.5px] border-slate-200" : ""}>
    <View className="flex-row items-center gap-3 px-3.5 py-[13px]">
      <RowIcon icon={icon} />
      <View className="flex-1">
        <Text className="font-inter-medium text-[11px] text-slate-500">
          {label}
        </Text>
        <TextInput
          autoFocus
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSave}
          returnKeyType="done"
          className="mt-0.5 border-b-[1.5px] border-teal-700 py-0.5 font-inter-medium text-[15px] text-slate-900"
          maxLength={100}
          editable={!saving}
        />
      </View>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100"
          onPress={onCancel}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Feather name="x" size={16} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity
          className="h-8 w-8 items-center justify-center rounded-lg bg-teal-700"
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size={14} color="#fff" />
          ) : (
            <Feather name="check" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
    {!!error && (
      <Text className="-mt-1 px-3.5 pb-2.5 font-inter text-xs text-red-600">
        {error}
      </Text>
    )}
  </View>
);
