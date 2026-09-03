import Feather from "@expo/vector-icons/Feather";
import { reloadAppAsync } from "expo";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error }: ErrorFallbackProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  return (
    <View className="h-full w-full flex-1 items-center justify-center bg-slate-50 p-6">
      {__DEV__ ? (
        <Pressable
          className="top-safe-offset-4 absolute right-4 z-10 h-11 w-11 flex-row items-center justify-center rounded-lg bg-white active:opacity-80"
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          accessibilityRole="button"
        >
          <Feather name="alert-circle" size={20} color="#0F172A" />
        </Pressable>
      ) : null}

      <View className="w-full max-w-[600px] items-center justify-center gap-4">
        <Text className="text-center font-inter-bold text-[28px] leading-10 text-slate-900">
          Something went wrong
        </Text>

        <Text className="text-center font-inter text-base leading-6 text-slate-500">
          Please reload the app to continue.
        </Text>

        <Pressable
          className="min-w-[200px] rounded-lg bg-teal-700 px-6 py-4 shadow-md shadow-black/10 active:scale-[0.98] active:opacity-90"
          onPress={handleRestart}
        >
          <Text className="text-center font-inter-semibold text-base text-white">
            Try Again
          </Text>
        </Pressable>
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="h-[90%] w-full rounded-t-2xl bg-slate-50">
              <View className="flex-row items-center justify-between border-b border-slate-200 px-4 pb-3 pt-4">
                <Text className="font-inter-semibold text-xl text-slate-900">
                  Error Details
                </Text>
                <Pressable
                  className="h-11 w-11 items-center justify-center active:opacity-60"
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="Close error details"
                  accessibilityRole="button"
                >
                  <Feather name="x" size={24} color="#0F172A" />
                </Pressable>
              </View>

              <ScrollView
                className="flex-1"
                contentContainerClassName="p-4 pb-safe-offset-4"
                showsVerticalScrollIndicator
              >
                <View className="w-full overflow-hidden rounded-lg bg-white p-4">
                  <Text
                    className="w-full font-mono text-xs leading-[18px] text-slate-900"
                    selectable
                  >
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
