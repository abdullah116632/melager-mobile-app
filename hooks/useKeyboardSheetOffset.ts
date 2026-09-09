import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, useWindowDimensions } from "react-native";

/**
 * Legacy Android lift for bottom sheets inside a `Modal`.
 *
 * Prefer `KeyboardAvoidingView` from `react-native-keyboard-controller`: it
 * reads the IME inset from the modal dialog's own window, so it stays correct
 * under edge-to-edge, where Android ignores the `adjustResize` flag React
 * Native puts on every modal. This heuristic instead compares the *app*
 * window, which is not the window the sheet lives in, and therefore lifts the
 * sheet only some of the time.
 *
 * Still used by the settings forms; the deposit and expense sheets have moved
 * to the library component.
 */
export const useKeyboardSheetOffset = () => {
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const screenHeightRef = useRef(windowHeight);

  useEffect(() => {
    if (keyboardHeight === 0) screenHeightRef.current = windowHeight;
  }, [keyboardHeight, windowHeight]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return Platform.OS === "android" &&
    keyboardHeight > 0 &&
    screenHeightRef.current - windowHeight < keyboardHeight * 0.5
    ? keyboardHeight
    : 0;
};
