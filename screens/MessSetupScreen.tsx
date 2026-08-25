import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { JoinRequestSuccess } from "@/components/mess-setup/JoinRequestSuccess";
import { MessSetupChoice } from "@/components/mess-setup/MessSetupChoice";
import { MessSetupForm } from "@/components/mess-setup/MessSetupForm";
import { MessSetupHeader } from "@/components/mess-setup/MessSetupHeader";
import { useAuth } from "@/redux/hooks";
import type { MessSetupMode, MessSetupStep } from "@/types/messSetup";

interface MessSetupScreenProps {
  initialMode?: MessSetupMode;
  onBack: () => void;
  onBackToHub: () => void;
}

export const MessSetupScreen = ({
  initialMode,
  onBack,
  onBackToHub,
}: MessSetupScreenProps) => {
  const { user, createMess, joinMess } = useAuth();
  const [step, setStep] = useState<MessSetupStep>(initialMode ?? "choose");
  const [messName, setMessName] = useState("");
  const [messKey, setMessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState(false);

  const handleCreate = async () => {
    if (!messName.trim()) {
      setError("Enter a mess name.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await createMess(messName.trim());
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create mess",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!messKey.trim()) {
      setError("Enter the mess key.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await joinMess(messKey.trim().toUpperCase());
      setJoinSuccess(true);
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : "Failed to send request",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStepBack = () => {
    setStep("choose");
    setError("");
  };

  const handleChoose = (mode: MessSetupMode) => {
    setStep(mode);
  };

  const firstName = user?.name?.split(" ")[0];

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0B5E57]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        pointerEvents="none"
        className="absolute right-[-70px] top-[-80px] h-[300px] w-[300px] rounded-full bg-white/[0.07]"
      />
      <View
        pointerEvents="none"
        className="absolute bottom-[60px] left-[-40px] h-40 w-40 rounded-full bg-white/[0.05]"
      />
      <ScrollView
        contentContainerClassName="flex-grow gap-4 px-6 pb-safe-offset-6 pt-safe-offset-4"
        keyboardShouldPersistTaps="handled"
      >
        <MessSetupHeader firstName={firstName} onBack={onBack} />

        {joinSuccess ? (
          <JoinRequestSuccess onBack={onBackToHub} />
        ) : step === "choose" ? (
          <MessSetupChoice onChoose={handleChoose} />
        ) : (
          <MessSetupForm
            mode={step}
            value={step === "create" ? messName : messKey}
            error={error}
            loading={loading}
            onChange={step === "create" ? setMessName : setMessKey}
            onBack={handleStepBack}
            onSubmit={() =>
              void (step === "create" ? handleCreate() : handleJoin())
            }
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
