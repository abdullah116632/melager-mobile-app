import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { useState } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { ApiMessageAttachment } from "@/lib/api";
import { formatFileSize } from "@/lib/chatMedia/mediaFiles";
import { deleteLocalCopy } from "@/lib/chatMedia/mediaTransfer";
import { openMediaFile, shareMediaFile } from "@/lib/chatMedia/openMedia";

export interface MediaViewerTarget {
  attachment: ApiMessageAttachment;
  uri: string;
}

/** Video and audio play inside the viewer; audio just has no picture. */
export const isPlayable = (attachment: ApiMessageAttachment): boolean =>
  attachment.kind === "video" || attachment.kind === "audio";

/** Photos, videos and audio open in the app; other files go to a viewer app. */
export const opensInApp = (attachment: ApiMessageAttachment): boolean =>
  attachment.kind === "image" || isPlayable(attachment);

// Its own component so the player exists only while the viewer shows it, and
// is released when the viewer closes.
const MediaPlayer = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, (created) => {
    created.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      contentFit="contain"
      nativeControls
    />
  );
};

const ViewerAction = ({
  icon,
  label,
  tone = "default",
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  tone?: "default" | "danger";
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="flex-1 items-center rounded-2xl border border-slate-700 bg-slate-800 py-3"
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Feather
      name={icon}
      size={19}
      color={tone === "danger" ? "#FCA5A5" : "#E2E8F0"}
    />
    <Text
      className={`mt-1 font-inter-semibold text-[11px] ${
        tone === "danger" ? "text-red-300" : "text-slate-200"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

/**
 * A photo as wide as the screen, edge to edge. One taller than the space it
 * gets scrolls rather than shrinking and leaving bars at its sides.
 */
const FullWidthImage = ({
  uri,
  attachment,
}: {
  uri: string;
  attachment: ApiMessageAttachment;
}) => {
  // The sender's dimensions give the right shape before the file decodes;
  // the decoded size then replaces them, since it accounts for rotation.
  const [aspectRatio, setAspectRatio] = useState(
    attachment.width && attachment.height
      ? attachment.width / attachment.height
      : 1,
  );
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={{ uri }}
        style={{ width: "100%", aspectRatio }}
        contentFit="contain"
        onLoad={({ source }) => {
          if (source.width && source.height) {
            setAspectRatio(source.width / source.height);
          }
        }}
      />
    </ScrollView>
  );
};

/**
 * Shows a file that is on this phone, with ways to open it in another app,
 * share or save it, or remove this phone's copy.
 */
export const MediaViewerModal = ({
  target,
  onClose,
  onError,
}: {
  target: MediaViewerTarget | null;
  onClose: () => void;
  onError: (message: string) => void;
}) => {
  if (!target) return null;
  const { attachment, uri } = target;

  const run = (action: () => Promise<void>) => {
    void action().catch((error: unknown) =>
      onError(
        error instanceof Error ? error.message : "Could not open this file.",
      ),
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete from this phone?",
      "Only your copy is removed. Other members keep theirs, and the message will say the file is no longer available here.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onClose();
            void deleteLocalCopy(attachment.id);
          },
        },
      ],
    );
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="pt-safe pb-safe-offset-3 flex-1 bg-slate-950/95">
        <View className="flex-row items-center px-4 py-3">
          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="font-inter-semibold text-[14px] text-white"
            >
              {attachment.name}
            </Text>
            <Text className="mt-0.5 font-inter text-[11px] text-slate-400">
              {formatFileSize(attachment.size)}
            </Text>
          </View>
          <TouchableOpacity
            className="ml-3 h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Feather name="x" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {isPlayable(attachment) ? (
          // Not inside the Pressable below, which would swallow the taps
          // meant for the player's own controls.
          <View className="flex-1 px-2">
            <MediaPlayer uri={uri} />
          </View>
        ) : (
          <Pressable
            className={
              attachment.kind === "image"
                ? "flex-1"
                : "flex-1 items-center justify-center px-4"
            }
            onPress={onClose}
          >
            {attachment.kind === "image" ? (
              <FullWidthImage uri={uri} attachment={attachment} />
            ) : (
              <View className="items-center">
                <View className="h-20 w-20 items-center justify-center rounded-3xl border border-slate-700 bg-slate-800">
                  <Feather
                    name={
                      attachment.kind === "video"
                        ? "film"
                        : attachment.kind === "audio"
                          ? "music"
                          : "file-text"
                    }
                    size={34}
                    color="#67E8F9"
                  />
                </View>
                <Text className="mt-4 text-center font-inter text-[12px] text-slate-400">
                  {attachment.mimeType}
                </Text>
              </View>
            )}
          </Pressable>
        )}
        <View className="flex-row gap-3 px-4 pt-3">
          <ViewerAction
            icon="external-link"
            label="Open"
            onPress={() => run(() => openMediaFile(uri, attachment))}
          />
          <ViewerAction
            icon="share-2"
            label="Share / Save"
            onPress={() => run(() => shareMediaFile(uri, attachment))}
          />
          <ViewerAction
            icon="trash-2"
            label="Delete"
            tone="danger"
            onPress={confirmDelete}
          />
        </View>
      </View>
    </Modal>
  );
};
