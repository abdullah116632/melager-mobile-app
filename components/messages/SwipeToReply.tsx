import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { Platform, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// How far the bubble must travel before the release counts as a reply, and how
// far it may travel at all.
const TRIGGER_DISTANCE = 52;
const MAX_TRAVEL = 78;
// The drag moves the bubble less than the finger, so the bubble feels attached
// to the thread rather than free.
const DRAG_RESISTANCE = 0.55;
const SPRING = { damping: 20, stiffness: 240, mass: 0.6 };

// The arrow sits behind the bubble and is uncovered as the bubble slides away.
const hintPosition = {
  position: "absolute",
  top: 0,
  bottom: 0,
  justifyContent: "center",
} as const;

const notifyReady = () => {
  if (Platform.OS !== "web") void Haptics.selectionAsync();
};

/**
 * Drag a message either way to reply to it, as WhatsApp does. The reply arrow
 * fades in on the side the drag came from and the bubble springs back on
 * release.
 */
export const SwipeToReply = ({
  enabled,
  onReply,
  className,
  children,
}: {
  enabled: boolean;
  onReply: () => void;
  /** Sits on the outer view, so a width cap resolves against the message row. */
  className?: string;
  children: ReactNode;
}) => {
  const translateX = useSharedValue(0);
  // Tracks whether the drag has already passed the trigger, so the haptic
  // fires once per crossing instead of on every frame beyond it.
  const armed = useSharedValue(false);

  const pan = Gesture.Pan()
    .enabled(enabled)
    // The thread scrolls vertically, so the pan may only take over once the
    // movement is clearly sideways.
    .activeOffsetX([-18, 18])
    .failOffsetY([-14, 14])
    .onUpdate((event) => {
      const travel = event.translationX * DRAG_RESISTANCE;
      translateX.value = Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, travel));
      const passed = Math.abs(translateX.value) >= TRIGGER_DISTANCE;
      if (passed !== armed.value) {
        armed.value = passed;
        if (passed) runOnJS(notifyReady)();
      }
    })
    .onEnd(() => {
      if (Math.abs(translateX.value) >= TRIGGER_DISTANCE) runOnJS(onReply)();
      armed.value = false;
      translateX.value = withSpring(0, SPRING);
    });

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const leftHintStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, translateX.value) / TRIGGER_DISTANCE),
  }));
  const rightHintStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -translateX.value) / TRIGGER_DISTANCE),
  }));

  const hint = (
    <View className="h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
      <Feather name="corner-up-left" size={15} color="#67E8F9" />
    </View>
  );

  return (
    <View className={`justify-center ${className ?? ""}`}>
      <Animated.View
        style={[hintPosition, { left: 4 }, leftHintStyle]}
        pointerEvents="none"
      >
        {hint}
      </Animated.View>
      <Animated.View
        style={[hintPosition, { right: 4 }, rightHintStyle]}
        pointerEvents="none"
      >
        {hint}
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={bubbleStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
};
