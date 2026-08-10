import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { authStyles as styles } from "./authStyles";
import { ErrorBox } from "./AuthFeedback";

type LoginSignupCardProps = {
  mode: "login" | "signup";
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  error: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onMobileNumberChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
  onForgotPassword: () => void;
  onGoogleSignIn: () => void;
  onToggleMode: () => void;
};

export const LoginSignupCard = ({
  mode,
  name,
  email,
  mobileNumber,
  password,
  showPassword,
  loading,
  error,
  onNameChange,
  onEmailChange,
  onMobileNumberChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onForgotPassword,
  onGoogleSignIn,
  onToggleMode,
}: LoginSignupCardProps) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>
      {mode === "signup" ? "Create your account" : "Welcome back"}
    </Text>

    {mode === "signup" && (
      <View style={styles.field}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Rahul"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={onNameChange}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>
    )}

    <View style={styles.field}>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={onEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="next"
      />
    </View>

    {mode === "signup" && (
      <View style={styles.field}>
        <Text style={styles.label}>
          Mobile Number <Text style={styles.optionalLabel}>(Optional)</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="11-digit number"
          placeholderTextColor="#9CA3AF"
          value={mobileNumber}
          onChangeText={onMobileNumberChange}
          keyboardType="phone-pad"
          returnKeyType="next"
        />
      </View>
    )}

    <View style={styles.field}>
      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.flexibleInput]}
          placeholder="Min. 6 characters"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry={!showPassword}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={onTogglePassword}>
          <Feather
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
    </View>

    {mode === "login" && (
      <TouchableOpacity style={styles.forgotRow} onPress={onForgotPassword}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>
    )}

    <ErrorBox error={error} />

    <TouchableOpacity
      style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
      onPress={onSubmit}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.submitBtnText}>
          {mode === "signup" ? "Sign Up" : "Log In"}
        </Text>
      )}
    </TouchableOpacity>

    <View style={styles.orRow}>
      <View style={styles.orLine} />
      <Text style={styles.orText}>OR</Text>
      <View style={styles.orLine} />
    </View>

    <TouchableOpacity
      style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
      onPress={onGoogleSignIn}
      disabled={loading}
      activeOpacity={0.8}
    >
      <Feather name="chrome" size={20} color="#4285F4" />
      <Text style={styles.googleBtnText}>Continue with Google</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.toggleRow} onPress={onToggleMode}>
      <Text style={styles.toggleText}>
        {mode === "signup"
          ? "Already have an account? "
          : "Don't have an account? "}
        <Text style={styles.toggleLink}>
          {mode === "signup" ? "Log In" : "Sign Up"}
        </Text>
      </Text>
    </TouchableOpacity>
  </View>
);
