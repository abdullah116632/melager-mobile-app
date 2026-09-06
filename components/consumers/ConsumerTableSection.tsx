import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/redux/hooks";
import type { Consumer } from "@/types/consumer";
import { getProfileInitials } from "@/utils/profile";

type ConsumerTableSectionProps = {
  label: string;
  consumers: Consumer[];
  copiedId: string | null;
  onCopy: (value: string, key: string, label: string) => void;
  topMargin?: boolean;
  onDelete: (consumer: Consumer) => void;
  onSelect: (consumer: Consumer) => void;
  deletingId: number | null;
};

type ConsumerCardListProps = ConsumerTableSectionProps & {
  isAdmin: boolean;
};

const consumerNameColors = [
  "#0F766E",
  "#4338CA",
  "#BE123C",
  "#B45309",
  "#7E22CE",
  "#0369A1",
];

const ContactRow = ({
  icon,
  value,
  copyId,
  copiedId,
  onCopy,
  copyLabel,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  value?: string | null;
  copyId: string;
  copiedId: string | null;
  onCopy: (value: string, key: string, label: string) => void;
  copyLabel: string;
}) => (
  <View className="mt-2 flex-row items-center gap-2.5">
    <Feather name={icon} size={14} color="#0F766E" />
    {value ? (
      <>
        <Text
          className="min-w-0 flex-1 font-inter text-[13px] text-slate-700"
          numberOfLines={1}
        >
          {value}
        </Text>
        <TouchableOpacity
          className={`h-7 w-7 items-center justify-center rounded-lg ${copiedId === copyId ? "bg-emerald-50" : "bg-teal-50"}`}
          onPress={(event) => {
            event.stopPropagation();
            onCopy(value, copyId, copyLabel);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Feather
            name={copiedId === copyId ? "check" : "copy"}
            size={13}
            color={copiedId === copyId ? "#16A34A" : "#0F766E"}
          />
        </TouchableOpacity>
      </>
    ) : (
      <Text className="font-inter text-[13px] text-slate-400">
        Not available
      </Text>
    )}
  </View>
);

export const ConsumerTableSection = ({
  label,
  consumers,
  copiedId,
  onCopy,
  topMargin = false,
  onDelete,
  onSelect,
  deletingId,
}: ConsumerTableSectionProps) => {
  const { role } = useAuth();

  return (
    <ConsumerCardList
      label={label}
      consumers={consumers}
      copiedId={copiedId}
      onCopy={onCopy}
      topMargin={topMargin}
      isAdmin={role === "admin"}
      onDelete={onDelete}
      onSelect={onSelect}
      deletingId={deletingId}
    />
  );
};

const ConsumerCardList = ({
  label,
  consumers,
  copiedId,
  onCopy,
  topMargin = false,
  isAdmin,
  onDelete,
  onSelect,
  deletingId,
}: ConsumerCardListProps) => {
  return (
    <View className={`px-4 ${topMargin ? "mt-6" : "mt-4"}`}>
      <View className="mb-2.5 flex-row items-center justify-between px-0.5">
        <Text className="font-inter-semibold text-[11px] tracking-[1px] text-slate-500">
          {label}
        </Text>
        <View className="rounded-full bg-teal-50 px-2.5 py-1">
          <Text className="font-inter-semibold text-[10px] text-teal-700">
            {consumers.length} {consumers.length === 1 ? "MEMBER" : "MEMBERS"}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        {consumers.map((consumer) => {
          const emailCopyId = `email-${consumer.id}`;
          const phoneCopyId = `phone-${consumer.id}`;
          const nameColor =
            consumerNameColors[consumer.id % consumerNameColors.length];

          return (
            <TouchableOpacity
              key={consumer.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-300/50"
              onPress={() => onSelect(consumer)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`View details for ${consumer.name}`}
            >
              <View className="flex-row items-start gap-3">
                <View
                  className="h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${nameColor}26` }}
                >
                  <Text
                    className="font-inter-bold text-[15px]"
                    style={{ color: nameColor }}
                  >
                    {getProfileInitials(consumer.name)}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-inter-bold text-[15px] text-slate-950"
                    numberOfLines={1}
                  >
                    {consumer.name}
                  </Text>
                  {(consumer.isAdmin || consumer.accountDeletedAt) && (
                    <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
                      {consumer.isAdmin && (
                        <View className="flex-row items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5">
                          <Feather name="shield" size={11} color="#B45309" />
                          <Text className="font-inter-semibold text-[10px] text-amber-700">
                            Admin
                          </Text>
                        </View>
                      )}
                      {consumer.accountDeletedAt && (
                        <View className="flex-row items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5">
                          <Feather name="user-x" size={11} color="#E11D48" />
                          <Text className="font-inter-semibold text-[10px] text-rose-600">
                            Deleted
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                {isAdmin &&
                  !consumer.accountDeletedAt &&
                  !consumer.isAdmin &&
                  (deletingId === consumer.id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <TouchableOpacity
                      className="h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50"
                      onPress={(event) => {
                        event.stopPropagation();
                        onDelete(consumer);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={15} color="#DC2626" />
                    </TouchableOpacity>
                  ))}
              </View>

              <View className="mt-1 border-t border-slate-100 pt-1">
                <ContactRow
                  icon="mail"
                  value={consumer.email}
                  copyId={emailCopyId}
                  copiedId={copiedId}
                  onCopy={onCopy}
                  copyLabel="Email"
                />
                <ContactRow
                  icon="phone"
                  value={consumer.mobileNumber}
                  copyId={phoneCopyId}
                  copiedId={copiedId}
                  onCopy={onCopy}
                  copyLabel="Phone"
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
