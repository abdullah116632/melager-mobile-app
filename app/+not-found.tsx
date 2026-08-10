import { Link, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-slate-50 p-5">
        <Text className="font-inter-bold text-xl text-slate-900">
          This screen doesn&apos;t exist.
        </Text>

        <Link href="/(tabs)/dashboard" asChild>
          <Pressable className="mt-[15px] py-[15px]">
            <Text className="font-inter text-sm text-teal-700">
              Go to home screen!
            </Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}
