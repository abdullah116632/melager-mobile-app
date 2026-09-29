import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { ActivityIndicator, Text, View } from "react-native";

import { kindForMimeType, type PickedFile } from "@/lib/chatMedia/mediaFiles";

export interface PreparingFile extends PickedFile {
  key: string;
}

const PREVIEW_WIDTH = 220;

const previewHeight = (file: PickedFile) => {
  if (!file.width || !file.height) return 180;
  const height = (PREVIEW_WIDTH * file.height) / file.width;
  return Math.min(300, Math.max(120, Math.round(height)));
};

/**
 * Stands in for a file message while its file is copied into chat storage
 * and checksummed, which takes a few seconds for a large video. It is not a
 * message yet, so it only lives on screen and is replaced by the real bubble.
 */
export const PreparingAttachmentBubble = ({
  file,
}: {
  file: PreparingFile;
}) => {
  const isImage = kindForMimeType(file.mimeType ?? "") === "image";
  return (
    <View className="mb-3 flex-row items-end justify-end">
      <View className="max-w-[76%] rounded-[22px] rounded-br-md border border-teal-500 bg-teal-600 px-4 py-3 shadow-sm shadow-teal-950/40">
        {isImage ? (
          <View className="mb-1.5">
            <Image
              source={{ uri: file.uri }}
              style={{
                width: PREVIEW_WIDTH,
                height: previewHeight(file),
                borderRadius: 14,
                opacity: 0.6,
              }}
              contentFit="cover"
            />
            <View className="absolute inset-0 items-center justify-center">
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          </View>
        ) : (
          <View className="mb-1.5 min-w-[210px] flex-row items-center rounded-2xl bg-teal-700/70 px-3 py-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-950/40">
              <ActivityIndicator size="small" color="#CCFBF1" />
            </View>
            <Text
              numberOfLines={2}
              className="ml-3 flex-1 font-inter-semibold text-[13px] text-white"
            >
              {file.name || "File"}
            </Text>
          </View>
        )}
        <View className="flex-row items-center justify-end">
          <Feather name="clock" size={11} color="#CCFBF1" />
          <Text className="ml-1 font-inter text-[10px] text-teal-100">
            Preparing...
          </Text>
        </View>
      </View>
    </View>
  );
};
