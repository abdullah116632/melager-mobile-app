import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { JoinRequestSuccess } from "@/components/mess-setup/JoinRequestSuccess";
import { MessSetupChoice } from "@/components/mess-setup/MessSetupChoice";
import { MessSetupForm } from "@/components/mess-setup/MessSetupForm";
import { MessSetupHeader } from "@/components/mess-setup/MessSetupHeader";
import { messSetupStyles as styles } from "@/components/mess-setup/messSetupStyles";
import { useAuth } from "@/context/AuthContext";
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
  const insets = useSafeAreaInsets();
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
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View pointerEvents="none" style={styles.decorationLarge} />
      <View pointerEvents="none" style={styles.decorationSmall} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
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
