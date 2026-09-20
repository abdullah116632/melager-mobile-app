import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
} from "react-native";

import type { MessageReactionKind } from "@/lib/api";

const BACKDROP_DURATION = 160;
const CLOSE_DURATION = 120;
const STAGGER_DELAY = 28;
const USE_NATIVE_DRIVER = Platform.OS !== "web";

export const REACTION_CHOICES: { kind: MessageReactionKind; emoji: string }[] =
  [
    { kind: "like", emoji: "👍" },
    { kind: "love", emoji: "❤️" },
    { kind: "haha", emoji: "😂" },
    { kind: "sad", emoji: "😢" },
    { kind: "angry", emoji: "😠" },
    { kind: "dislike", emoji: "👎" },
  ];

export const reactionEmoji = (kind: MessageReactionKind) =>
  REACTION_CHOICES.find((choice) => choice.kind === kind)?.emoji ?? "";

export const MessageReactionPicker = ({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected?: MessageReactionKind;
  onSelect: (kind: MessageReactionKind) => void;
  onClose: () => void;
}) => {
  // The modal has to outlive `visible` so the closing animation can play
  // before the native view goes away.
  const [mounted, setMounted] = useState(visible);
  const backdrop = useRef(new Animated.Value(0)).current;
  const items = useRef(
    REACTION_CHOICES.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: BACKDROP_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.stagger(
          STAGGER_DELAY,
          items.map((item) =>
            Animated.spring(item, {
              toValue: 1,
              friction: 6,
              tension: 140,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ),
        ),
      ]).start();
      return;
    }

    Animated.parallel(
      [backdrop, ...items].map((value) =>
        Animated.timing(value, {
          toValue: 0,
          duration: CLOSE_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ),
    ).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [backdrop, items, visible]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, opacity: backdrop }}>
        <Pressable
          className="flex-1 items-center justify-center bg-slate-950/60 px-6"
          onPress={onClose}
        >
          <Pressable
            className="flex-row items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-2 shadow-lg shadow-black/40"
            onPress={(event) => event.stopPropagation()}
          >
            {REACTION_CHOICES.map((choice, index) => {
              const isSelected = selected === choice.kind;
              const progress = items[index];
              return (
                <Animated.View
                  key={choice.kind}
                  style={{
                    opacity: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                      extrapolate: "clamp",
                    }),
                    transform: [
                      // The spring overshoots past 1, which gives each emoji a
                      // small pop as it settles.
                      {
                        scale: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.4, 1],
                        }),
                      },
                      {
                        translateY: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [18, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    className={`h-12 w-12 items-center justify-center rounded-full ${
                      isSelected
                        ? "border-2 border-teal-400 bg-teal-900/70"
                        : ""
                    }`}
                    onPress={() => onSelect(choice.kind)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={
                      isSelected
                        ? `Remove ${choice.kind}`
                        : `React ${choice.kind}`
                    }
                  >
                    <Text className="text-[26px]">{choice.emoji}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};
