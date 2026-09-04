import NetInfo from "@react-native-community/netinfo";
import { useEffect, useRef, type ReactNode } from "react";

import { subscribeQueueSize } from "@/lib/offlineQueue";
import { useAppDispatch } from "@/redux/hooks";
import { useAppSelector } from "@/redux/hooks";
import { selectActiveMess } from "@/redux/slice/authSlice";
import { loadBazar } from "@/redux/slice/bazarSlice";
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
  const activeMess = useAppSelector(selectActiveMess);
  const wasOfflineRef = useRef(false);
  const didInitialSyncRef = useRef(false);

  useEffect(
    () =>
      subscribeQueueSize((count) => {
        dispatch(offlineQueueSizeChanged(count));
      }),
    [dispatch],
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isCheckingReachability =
        state.isConnected === null ||
        (state.isConnected === true && state.isInternetReachable === null);
      if (isCheckingReachability) {
        dispatch(networkStatusChanged(null));
        return;
      }

      const isOnline =
        state.isConnected === true && state.isInternetReachable === true;
      dispatch(networkStatusChanged(isOnline));
      if (isOnline && (!didInitialSyncRef.current || wasOfflineRef.current)) {
        didInitialSyncRef.current = true;
        void dispatch(syncOfflineQueue())
          .unwrap()
          .then((syncedCount) => {
            if (!activeMess || syncedCount === 0) return;
            return dispatch(
              loadBazar({ includeConsumers: activeMess.role === "admin" }),
            ).unwrap();
          })
          .catch(() => undefined);
      }
      wasOfflineRef.current = !isOnline;
    });
    return unsubscribe;
  }, [activeMess, dispatch]);

  return <>{children}</>;
};
