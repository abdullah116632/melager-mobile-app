import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { Consumer } from "@/types/consumer";

type ConsumerTableSectionProps = {
  label: string;
  consumers: Consumer[];
  copiedId: string | null;
  onCopy: (value: string, key: string, label: string) => void;
  topMargin?: boolean;
  isAdmin: boolean;
  onDelete: (consumer: Consumer) => void;
  deletingId: number | null;
};

export const ConsumerTableSection = ({
  label,
  consumers,
  copiedId,
  onCopy,
  topMargin = false,
  isAdmin,
  onDelete,
  deletingId,
}: ConsumerTableSectionProps) => (
  <View className={`px-4 pt-4 ${topMargin ? "mt-4" : "mt-0"}`}>
    <Text className="mb-2 ml-0.5 font-inter-semibold text-[11px] tracking-[1px] text-slate-500">
      {label}
    </Text>

    <View className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
      >
        <View>
          <View className="h-9 flex-row border-b-[0.5px] border-slate-200 bg-slate-100">
            <View className="w-[160px] justify-center px-3">
              <Text className="font-inter-semibold text-[10px] tracking-[0.8px] text-slate-500">
                NAME
              </Text>
            </View>
            <View className="w-[210px] justify-center border-l-[0.5px] border-slate-200 px-3">
              <Text className="font-inter-semibold text-[10px] tracking-[0.8px] text-slate-500">
                EMAIL
              </Text>
            </View>
            <View className="w-[140px] justify-center border-l-[0.5px] border-slate-200 px-3">
              <Text className="font-inter-semibold text-[10px] tracking-[0.8px] text-slate-500">
                PHONE
              </Text>
            </View>
            {isAdmin && (
              <View className="w-14 items-center justify-center border-l-[0.5px] border-slate-200 px-3" />
            )}
          </View>

          {consumers.map((consumer, index) => {
            const emailCopyId = `email-${consumer.id}`;
            const phoneCopyId = `phone-${consumer.id}`;

            return (
              <View
                key={consumer.id}
                className={`min-h-[52px] flex-row border-slate-200 ${index === 0 ? "border-t-0" : "border-t-[0.5px]"}`}
              >
                <View className="w-[160px] justify-center px-3 py-2.5">
                  <Text
                    className="font-inter-semibold text-sm text-slate-900"
                    numberOfLines={1}
                  >
                    {consumer.name}
                  </Text>
                  <Text
                    className={`mt-0.5 font-inter text-[10px] ${consumer.userId ? "text-teal-700" : "text-slate-400"}`}
                  >
                    {consumer.userId ? "● Registered" : "● Manual"}
                  </Text>
                </View>

                <View className="w-[210px] justify-center border-l-[0.5px] border-slate-200 px-3 py-2.5">
                  {consumer.email ? (
                    <View className="flex-row items-center gap-2">
                      <Text
                        className="flex-1 font-inter text-[13px] text-slate-900"
                        numberOfLines={1}
                      >
                        {consumer.email}
                      </Text>
                      <TouchableOpacity
                        className="h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-slate-100"
                        onPress={() =>
                          onCopy(consumer.email!, emailCopyId, "Email")
                        }
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Feather
                          name={copiedId === emailCopyId ? "check" : "copy"}
                          size={13}
                          color={
                            copiedId === emailCopyId ? "#16A34A" : "#0F766E"
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text className="font-inter text-sm text-slate-500">—</Text>
                  )}
                </View>

                <View className="w-[140px] justify-center border-l-[0.5px] border-slate-200 px-3 py-2.5">
                  {consumer.mobileNumber ? (
                    <View className="flex-row items-center gap-2">
                      <Text
                        className="flex-1 font-inter text-[13px] text-slate-900"
                        numberOfLines={1}
                      >
                        {consumer.mobileNumber}
                      </Text>
                      <TouchableOpacity
                        className="h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-slate-100"
                        onPress={() =>
                          onCopy(consumer.mobileNumber!, phoneCopyId, "Phone")
                        }
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Feather
                          name={copiedId === phoneCopyId ? "check" : "copy"}
                          size={13}
                          color={
                            copiedId === phoneCopyId ? "#16A34A" : "#0F766E"
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text className="font-inter text-sm text-slate-500">—</Text>
                  )}
                </View>

                {isAdmin && (
                  <View className="w-14 items-center justify-center border-l-[0.5px] border-slate-200 px-3 py-2.5">
                    {deletingId === consumer.id ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : consumer.isAdmin ? (
                      <Feather name="shield" size={15} color="#64748B" />
                    ) : (
                      <TouchableOpacity
                        className="h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50"
                        onPress={() => onDelete(consumer)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="trash-2" size={15} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  </View>
);
