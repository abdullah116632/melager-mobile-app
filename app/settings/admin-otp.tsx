import { Stack } from "expo-router";

import { AdminOtpScreen } from "@/screens/AdminOtpScreen";

export default function AdminOtpRoute() {
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <AdminOtpScreen />
    </>
  );
}
