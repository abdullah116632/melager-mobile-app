import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import type { ApiMessageAttachment } from "@/lib/api";
import { formatFileSize } from "@/lib/chatMedia/mediaFiles";
import {
  requestDownload,
  useMediaStatus,
  type MediaStatus,
} from "@/lib/chatMedia/mediaTransfer";

const IMAGE_WIDTH = 220;

const KIND_ICONS: Record<
  ApiMessageAttachment["kind"],
  keyof typeof Feather.glyphMap
> = {
  image: "image",
  video: "play-circle",
  audio: "play-circle",
  file: "file-text",
};

/** One line saying where the file stands on this phone. */
export const describeMediaStatus = (status: MediaStatus | null): string => {
  switch (status?.kind) {
    case "available":
      return "";
    case "deleted":
      return "This file is no longer available on this phone";
    case "queued":
      return "Waiting to download";
    case "searching":
      return "Looking for a member who has this file...";
    case "downloading":
      return `Downloading ${Math.round(status.progress * 100)}%`;
    case "waiting":
      return "Will download when a member who has it comes online";
    case "failed":
      return "Download failed";
    default:
      return "Not downloaded";
  }
};

const canRetry = (status: MediaStatus | null) =>
  status?.kind === "deleted" ||
  status?.kind === "failed" ||
  status?.kind === "waiting" ||
  status?.kind === "idle";

const imageHeight = (attachment: ApiMessageAttachment) => {
  if (!attachment.width || !attachment.height) return 180;
  const height = (IMAGE_WIDTH * attachment.height) / attachment.width;
  return Math.min(300, Math.max(120, Math.round(height)));
};

/**
 * The file part of a chat bubble. A photo shows inline once it is on this
 * phone; everything else is a card. Tapping an available file opens it in the
 * viewer, tapping a missing one asks the other members for it again.
 */
export const MessageAttachment = ({
  attachment,
  messageServerId,
  own,
  onOpen,
  onShowActions,
}: {
  attachment: ApiMessageAttachment;
  messageServerId: number | null;
  own: boolean;
  onOpen: (attachment: ApiMessageAttachment, uri: string) => void;
  /** Share and delete for files that do not open inside the app. */
  onShowActions?: (attachment: ApiMessageAttachment, uri: string) => void;
}) => {
  const status = useMediaStatus(attachment.id);
  const available = status?.kind === "available" ? status : null;
  const busy =
    status?.kind === "queued" ||
    status?.kind === "searching" ||
    status?.kind === "downloading";
  const statusText = describeMediaStatus(status);
  const retryable = canRetry(status) && messageServerId !== null;

  const onPress = () => {
    if (available) onOpen(attachment, available.uri);
    else if (retryable) void requestDownload(messageServerId!, attachment);
  };

  const mutedText = own ? "text-teal-100" : "text-slate-400";

  if (attachment.kind === "image") {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={!available && !retryable}
        accessibilityRole="button"
        accessibilityLabel={available ? "Open photo" : statusText}
        className="mb-1.5"
      >
        {available ? (
          <Image
            source={{ uri: available.uri }}
            style={{
              width: IMAGE_WIDTH,
              height: imageHeight(attachment),
              borderRadius: 14,
            }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View
            style={{ width: IMAGE_WIDTH, height: imageHeight(attachment) }}
            className="items-center justify-center rounded-[14px] border border-slate-600/60 bg-slate-950/40 px-4"
          >
            {busy ? (
              <ActivityIndicator size="small" color="#CCFBF1" />
            ) : (
              <Feather
                name={status?.kind === "deleted" ? "slash" : "download"}
                size={22}
                color="#CBD5E1"
              />
            )}
            <Text
              className={`mt-2 text-center font-inter text-[11px] ${mutedText}`}
            >
              {statusText}
            </Text>
            {retryable ? (
              <Text className="mt-1 font-inter-semibold text-[11px] text-cyan-300">
                Tap to download
              </Text>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!available && !retryable}
      accessibilityRole="button"
      accessibilityLabel={available ? `Open ${attachment.name}` : statusText}
      className={`mb-1.5 min-w-[210px] flex-row items-center rounded-2xl px-3 py-2.5 ${
        own ? "bg-teal-700/70" : "bg-slate-900/50"
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-950/40">
        {busy ? (
          <ActivityIndicator size="small" color="#CCFBF1" />
        ) : (
          <Feather
            name={
              status?.kind === "deleted"
                ? "slash"
                : available
                  ? KIND_ICONS[attachment.kind]
                  : "download"
            }
            size={19}
            color="#E2E8F0"
          />
        )}
      </View>
      <View className="ml-3 flex-1">
        <Text
          numberOfLines={2}
          className="font-inter-semibold text-[13px] text-white"
        >
          {attachment.name}
        </Text>
        <Text className={`mt-0.5 font-inter text-[10px] ${mutedText}`}>
          {formatFileSize(attachment.size)}
          {statusText ? ` · ${statusText}` : ""}
        </Text>
        {retryable ? (
          <Text className="mt-0.5 font-inter-semibold text-[10px] text-cyan-300">
            Tap to download
          </Text>
        ) : null}
      </View>
      {/* A document opens straight in a viewer app on tap, so its share and
          delete actions need a way in of their own. */}
      {available && onShowActions ? (
        <TouchableOpacity
          className="-mr-1 ml-1 h-9 w-7 items-center justify-center"
          onPress={() => onShowActions(attachment, available.uri)}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${attachment.name}`}
        >
          <Feather name="more-vertical" size={17} color="#CBD5E1" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};
