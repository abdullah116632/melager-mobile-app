import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, useWindowDimensions } from "react-native";

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
