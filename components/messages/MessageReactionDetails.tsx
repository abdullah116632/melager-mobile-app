import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { MessageReactionKind } from "@/lib/api";
import type { MessageItem } from "@/offline/features/messages/MessageRepository";

import { MessageAvatar } from "./MessageAvatar";
import { REACTION_CHOICES } from "./MessageReactionPicker";

const OPEN_DURATION = 220;
const CLOSE_DURATION = 160;
const SHEET_TRAVEL = 340;
const USE_NATIVE_DRIVER = Platform.OS !== "web";

export const MessageReactionDetails = ({
  message,
  myUserId,
  resolveName,
  onRemoveMine,
  onClose,
}: {
  message: MessageItem | null;
  myUserId?: number;
  /** Mess member name for a user id, or undefined when they are unknown. */
  resolveName: (userId: number) => string | undefined;
  onRemoveMine: () => void;
  onClose: () => void;
}) => {
  // The sheet has to survive `message` going null so it can slide back out
  // instead of vanishing, so the last message stays on screen until then.
  const [shown, setShown] = useState<MessageItem | null>(message);
  const [filter, setFilter] = useState<MessageReactionKind | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) setShown(message);
  }, [message]);

  useEffect(() => {
    setFilter(null);
  }, [message?.serverId]);

  useEffect(() => {
    if (message) {
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_DURATION,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished) setShown(null);
    });
  }, [message, progress]);

  if (!shown) return null;

  const counts = REACTION_CHOICES.map((choice) => ({
    ...choice,
    count: shown.reactions.filter((entry) => entry.reaction === choice.kind)
      .length,
  })).filter((entry) => entry.count > 0);
  const visibleReactions = shown.reactions.filter(
    (entry) => filter === null || entry.reaction === filter,
  );
  const nameFor = (userId: number) =>
    userId === myUserId
      ? "You"
      : (resolveName(userId) ??
        (userId === shown.senderUserId ? shown.senderName : "Mess member"));

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, opacity: progress }}>
        <Pressable
          className="flex-1 justify-end bg-slate-950/60"
          onPress={onClose}
        >
          <Animated.View
            style={{
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SHEET_TRAVEL, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            }}
          >
            <Pressable
              className="pb-safe-offset-3 rounded-t-3xl border-t border-slate-700 bg-[#0F172A] px-4 pt-3"
              onPress={(event) => event.stopPropagation()}
            >
              <View className="mb-3 h-1 w-12 self-center rounded-full bg-slate-600" />
              <View className="flex-row items-center">
                <Text className="flex-1 font-inter-bold text-[15px] text-white">
                  Reactions
                </Text>
                <TouchableOpacity
                  className="h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800"
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close reactions"
                >
                  <Feather name="x" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-1 mt-3 grow-0"
                contentContainerClassName="px-1 gap-2"
              >
                <TouchableOpacity
                  className={`flex-row items-center rounded-full border px-3 py-1.5 ${
                    filter === null
                      ? "border-teal-400 bg-teal-900/70"
                      : "border-slate-700 bg-slate-800"
                  }`}
                  onPress={() => setFilter(null)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === null }}
                >
                  <Text className="font-inter-semibold text-[12px] text-slate-200">
                    All {shown.reactions.length}
                  </Text>
                </TouchableOpacity>
                {counts.map((entry) => (
                  <TouchableOpacity
                    key={entry.kind}
                    className={`flex-row items-center rounded-full border px-3 py-1.5 ${
                      filter === entry.kind
                        ? "border-teal-400 bg-teal-900/70"
                        : "border-slate-700 bg-slate-800"
                    }`}
                    onPress={() => setFilter(entry.kind)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === entry.kind }}
                  >
                    <Text className="text-[13px]">{entry.emoji}</Text>
                    <Text className="ml-1.5 font-inter-semibold text-[12px] text-slate-200">
                      {entry.count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView
                className="mt-1 max-h-72"
                showsVerticalScrollIndicator={false}
              >
                {visibleReactions.map((entry) => {
                  const isMine = entry.userId === myUserId;
                  return (
                    <TouchableOpacity
                      key={entry.userId}
                      className="flex-row items-center py-2.5"
                      onPress={isMine ? onRemoveMine : undefined}
                      disabled={!isMine}
                      accessibilityRole={isMine ? "button" : undefined}
                      accessibilityLabel={`${nameFor(entry.userId)} reacted ${entry.reaction}`}
                    >
                      <MessageAvatar userId={entry.userId} size="md" />
                      <View className="ml-3 flex-1">
                        <Text className="font-inter-semibold text-[14px] text-white">
                          {nameFor(entry.userId)}
                        </Text>
                        {isMine ? (
                          <Text className="mt-0.5 font-inter text-[11px] text-slate-400">
                            Tap to remove
                          </Text>
                        ) : null}
                      </View>
                      <Text className="ml-2 text-[22px]">
                        {REACTION_CHOICES.find(
                          (choice) => choice.kind === entry.reaction,
                        )?.emoji ?? ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};
