import Feather from "@expo/vector-icons/Feather";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

import {
  MAX_ATTACHMENT_BYTES,
  formatFileSize,
} from "@/lib/chatMedia/mediaFiles";

export type AttachmentSource = "gallery" | "document";

const SOURCES: {
  source: AttachmentSource;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  detail: string;
}[] = [
  {
    source: "gallery",
    icon: "image",
    title: "Photos & videos",
    detail: "From your gallery",
  },
  {
    source: "document",
    icon: "file",
    title: "Document or file",
    detail: "PDF, documents, audio and any other file",
  },
];

/** Asks where the file to send should come from. */
export const AttachmentSourceSheet = ({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (source: AttachmentSource) => void;
  onClose: () => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable className="flex-1 justify-end bg-slate-950/60" onPress={onClose}>
      <Pressable
        className="pb-safe-offset-4 rounded-t-3xl border-t border-slate-700 bg-[#0F172A] px-4 pt-4"
        onPress={(event) => event.stopPropagation()}
      >
        <Text className="font-inter-bold text-[15px] text-white">
          Send a file
        </Text>
        <Text className="mb-3 mt-1 font-inter text-[11px] leading-4 text-slate-400">
          Files go straight to the other members' phones and are not stored on
          the server. Up to {formatFileSize(MAX_ATTACHMENT_BYTES)} each.
        </Text>
        {SOURCES.map((entry) => (
          <TouchableOpacity
            key={entry.source}
            className="mb-2 flex-row items-center rounded-2xl border border-slate-700 bg-slate-800 px-3 py-3"
            onPress={() => onSelect(entry.source)}
            accessibilityRole="button"
            accessibilityLabel={entry.title}
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20">
              <Feather name={entry.icon} size={19} color="#5EEAD4" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-inter-semibold text-[14px] text-white">
                {entry.title}
              </Text>
              <Text className="mt-0.5 font-inter text-[11px] text-slate-400">
                {entry.detail}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </TouchableOpacity>
        ))}
      </Pressable>
    </Pressable>
  </Modal>
);
