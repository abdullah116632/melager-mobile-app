import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import type { MessSetupMode, MessSetupStep } from "@/types/messSetup";
import { MessSetupChoice } from "./MessSetupChoice";
import { MessSetupForm } from "./MessSetupForm";
import { MessSetupHeader } from "./MessSetupHeader";

const getInitialStep = (mode?: string | string[]): MessSetupStep => {
  const requestedMode = Array.isArray(mode) ? mode[0] : mode;
  return requestedMode === "create" || requestedMode === "join"
    ? requestedMode
    : "choose";
};

export const MessSetupContent = () => {
  const { mode } = useLocalSearchParams<{ mode?: string | string[] }>();
  const [step, setStep] = useState<MessSetupStep>(() => getInitialStep(mode));

  const chooseMode = (selectedMode: MessSetupMode) => {
    setStep(selectedMode);
  };

  return (
    <ScrollView
      contentContainerClassName="flex-grow gap-4 px-6 pb-safe-offset-6 pt-safe-offset-4"
      keyboardShouldPersistTaps="handled"
    >
      <MessSetupHeader />

      {step === "choose" ? (
        <MessSetupChoice onChoose={chooseMode} />
      ) : (
        <MessSetupForm mode={step} onBack={() => setStep("choose")} />
      )}
    </ScrollView>
  );
};
