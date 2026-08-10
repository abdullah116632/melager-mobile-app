import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { MessSetupMode } from "@/types/messSetup";
import { messSetupStyles as styles } from "./messSetupStyles";

interface MessSetupFormProps {
  mode: MessSetupMode;
  value: string;
  error: string;
  loading: boolean;
  onChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export const MessSetupForm = ({
  mode,
  value,
  error,
  loading,
  onChange,
  onBack,
  onSubmit,
}: MessSetupFormProps) => {
  const isCreate = mode === "create";

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.stepBackButton} onPress={onBack}>
        <Feather name="arrow-left" size={18} color="#0F766E" />
        <Text style={styles.stepBackText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.cardTitle}>
        {isCreate ? "Create a Mess" : "Join a Mess"}
      </Text>
      <Text style={styles.cardDescription}>
        {isCreate
          ? "Give your mess a name. You'll receive a unique key to share with members."
          : "Enter the 8-character mess key. Your request will be sent to the admin for approval."}
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>{isCreate ? "Mess Name" : "Mess Key"}</Text>
        <TextInput
          style={[styles.input, !isCreate && styles.keyInput]}
          placeholder={isCreate ? "e.g. Sunrise Mess" : "e.g. A3F92B1C"}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={(nextValue) =>
            onChange(isCreate ? nextValue : nextValue.toUpperCase())
          }
          autoCapitalize={isCreate ? "words" : "characters"}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          autoFocus
          maxLength={isCreate ? undefined : 8}
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.submitButton,
          !isCreate && styles.joinButton,
          loading && styles.buttonDisabled,
        ]}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather
              name={isCreate ? "plus-circle" : "send"}
              size={18}
              color="#fff"
            />
            <Text style={styles.submitButtonText}>
              {isCreate ? "Create Mess" : "Send Join Request"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
