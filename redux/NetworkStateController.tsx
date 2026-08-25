import NetInfo from "@react-native-community/netinfo";
import { useEffect, useRef, type ReactNode } from "react";

import { subscribeQueueSize } from "@/lib/offlineQueue";
import { useAppDispatch } from "@/redux/hooks";
import {
  networkStatusChanged,
  offlineQueueSizeChanged,
  syncOfflineQueue,
} from "@/redux/slice/networkSlice";

export const NetworkStateController = ({
  children,
}: {
  children: ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const wasOfflineRef = useRef(false);

  useEffect(
    () =>
      subscribeQueueSize((count) => {
        dispatch(offlineQueueSizeChanged(count));
      }),
    [dispatch],
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline =
        state.isConnected === true && state.isInternetReachable !== false;
      dispatch(networkStatusChanged(isOnline));
      if (isOnline && wasOfflineRef.current) {
        void dispatch(syncOfflineQueue());
      }
      wasOfflineRef.current = !isOnline;
    });
    return unsubscribe;
  }, [dispatch]);

  return <>{children}</>;
};
