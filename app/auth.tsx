import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

type Mode = 'login' | 'signup' | 'otp' | 'forgot' | 'reset-otp' | 'reset';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

// ── Sub-components defined OUTSIDE AuthScreen so their identity is stable ──────
// If they were defined inside, every parent re-render (e.g. the 1-second timer
// tick) would create a new function reference → React unmounts + remounts the
// TextInput → keyboard flickers on/off.

function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return (
    <View style={styles.errorBox}>
      <Feather name="alert-circle" size={14} color="#DC2626" />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
}

function BackRow({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <TouchableOpacity style={styles.backRow} onPress={onPress}>
      <Feather name="arrow-left" size={16} color="#0F766E" />
      <Text style={styles.backText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ResendRow({ onResend, resendTimer }: { onResend: () => void; resendTimer: number }) {
  return (
    <TouchableOpacity style={styles.resendRow} onPress={onResend} disabled={resendTimer > 0}>
      <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
        {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Didn't receive it? Resend code"}
      </Text>
    </TouchableOpacity>
  );
}

function OtpField({
  label,
  otp,
  onChangeText,
}: {
  label: string;
  otp: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.otpInput}
        value={otp}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="• • • • • •"
        placeholderTextColor="#CBD5E1"
        textAlign="center"
        autoFocus
      />
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle, signup, verifyOtp, resendOtp } = useAuth();

  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const googleClientId = Platform.select({
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    default: undefined,
  });
  const googleConfigured = Boolean(googleClientId);
  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      // A placeholder keeps the hook order stable before the administrator
      // adds the real public client ID. The button stays unavailable then.
      clientId: googleClientId ?? 'google-client-id-not-configured',
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'mobile' }),
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ['openid', 'profile', 'email'],
      prompt: AuthSession.Prompt.SelectAccount,
      usePKCE: false,
    },
    GOOGLE_DISCOVERY,
  );

  const startResendTimer = () => {
    setResendTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Stable callback so OtpField's onChangeText prop identity doesn't change
  const handleOtpChange = useCallback((v: string) => {
    setOtp(v.replace(/\D/g, '').slice(0, 6));
    setError('');
  }, []);

  const completeGoogleSignIn = useCallback(async (idToken: string) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle]);

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === 'success') {
      const idToken = googleResponse.params?.id_token;
      if (idToken) {
        void completeGoogleSignIn(idToken);
      } else {
        setError('Google did not return a sign-in token. Please try again.');
      }
    } else if (googleResponse.type === 'error') {
      setError('Google sign-in was not completed. Please try again.');
    }
  }, [googleResponse, completeGoogleSignIn]);

  const handleGoogleSignIn = async () => {
    if (!googleConfigured || !googleRequest) {
      setError('Google sign-in is not configured yet. Please contact the app administrator.');
      return;
    }
    setError('');
    try {
      await promptGoogleAsync();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not open Google sign-in');
    }
  };

  // ── Signup ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Your name is required.'); return; }
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (mobileNumber.trim() && mobileNumber.trim().length !== 11) {
          setError('Mobile number must be exactly 11 digits.'); setLoading(false); return;
        }
        const { pendingEmail: pe } = await signup(email.trim(), name.trim(), password, mobileNumber.trim());
        setPendingEmail(pe); setOtp(''); setMode('otp'); startResendTimer();
      } else {
        await login(email.trim(), password);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  // ── OTP verify (signup) ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError(''); setLoading(true);
    try { await verifyOtp(pendingEmail, otp); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Verification failed'); }
    finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    try { await resendOtp(pendingEmail); startResendTimer(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to resend code'); }
  };

  // ── Forgot password ────────────────────────────────────────────────────────
  const handleForgotSubmit = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await api.forgotPassword(email.trim());
      setPendingEmail(data.pendingEmail); setOtp(''); setNewPassword(''); setConfirmPassword('');
      setMode('reset-otp'); startResendTimer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  const handleResendResetOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    try {
      await api.resendResetOtp(pendingEmail);
      startResendTimer();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to resend code'); }
  };

  // ── Verify reset OTP (step 1) ──────────────────────────────────────────────
  const handleVerifyResetOtp = () => {
    if (otp.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError('');
    setMode('reset');
  };

  // ── Reset password (step 2) ────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!newPassword.trim()) { setError('Please enter a new password.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setError(''); setLoading(true);
    try {
      await api.resetPassword(pendingEmail, otp, newPassword);
      setMode('login'); setOtp(''); setNewPassword(''); setConfirmPassword('');
      setEmail(pendingEmail); setPassword('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally { setLoading(false); }
  };

  const goBack = (to: Mode) => {
    setMode(to); setError(''); setOtp('');
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(0);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0B5E57' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View pointerEvents="none" style={styles.deco1} />
      <View pointerEvents="none" style={styles.deco2} />
      <View pointerEvents="none" style={styles.deco3} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Feather name="coffee" size={38} color="#0F766E" />
          </View>
          <Text style={styles.appName}>Mess Manager</Text>
          <Text style={styles.tagline}>Track meals, expenses & deposits</Text>
        </View>

        {/* ── OTP verify (signup) ── */}
        {mode === 'otp' && (
          <View style={styles.card}>
            <BackRow onPress={() => goBack('signup')} label="Back" />
            <View style={styles.iconCircle}><Feather name="mail" size={28} color="#0F766E" /></View>
            <Text style={styles.cardTitle}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}<Text style={styles.highlightEmail}>{pendingEmail}</Text>
            </Text>
            <OtpField label="Verification Code" otp={otp} onChangeText={handleOtpChange} />
            <ErrorBox error={error} />
            <TouchableOpacity
              style={[styles.submitBtn, (loading || otp.length !== 6) && styles.submitBtnDisabled]}
              onPress={handleVerifyOtp} disabled={loading || otp.length !== 6}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Verify & Create Account</Text>}
            </TouchableOpacity>
            <ResendRow onResend={handleResendOtp} resendTimer={resendTimer} />
          </View>
        )}

        {/* ── Forgot password (enter email) ── */}
        {mode === 'forgot' && (
          <View style={styles.card}>
            <BackRow onPress={() => goBack('login')} label="Back to Login" />
            <View style={styles.iconCircle}><Feather name="lock" size={28} color="#0F766E" /></View>
            <Text style={styles.cardTitle}>Forgot Password?</Text>
            <Text style={styles.subtitle}>Enter your registered email and we'll send you a reset code.</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleForgotSubmit}
              />
            </View>
            <ErrorBox error={error} />
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleForgotSubmit} disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Send Reset Code</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Reset OTP verify (step 1) ── */}
        {mode === 'reset-otp' && (
          <View style={styles.card}>
            <BackRow onPress={() => goBack('forgot')} label="Back" />
            <View style={[styles.iconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Feather name="mail" size={28} color="#EA580C" />
            </View>
            <Text style={styles.cardTitle}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit reset code to{'\n'}<Text style={styles.highlightEmail}>{pendingEmail}</Text>
            </Text>
            <OtpField label="Reset Code" otp={otp} onChangeText={handleOtpChange} />
            <ErrorBox error={error} />
            <TouchableOpacity
              style={[styles.submitBtn, otp.length !== 6 && styles.submitBtnDisabled]}
              onPress={handleVerifyResetOtp} disabled={otp.length !== 6}
            >
              <Text style={styles.submitBtnText}>Verify Code</Text>
            </TouchableOpacity>
            <ResendRow onResend={handleResendResetOtp} resendTimer={resendTimer} />
          </View>
        )}

        {/* ── New password (step 2) ── */}
        {mode === 'reset' && (
          <View style={styles.card}>
            <BackRow onPress={() => goBack('reset-otp')} label="Back" />
            <View style={[styles.iconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Feather name="key" size={28} color="#EA580C" />
            </View>
            <Text style={styles.cardTitle}>Set New Password</Text>
            <Text style={styles.subtitle}>Choose a new password for your account.</Text>
            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="#9CA3AF"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  returnKeyType="next"
                  autoFocus
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNewPassword((v) => !v)}>
                  <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showNewPassword}
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />
            </View>
            <ErrorBox error={error} />
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleResetPassword} disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Reset Password</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Login / Signup ── */}
        {(mode === 'login' || mode === 'signup') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </Text>

            {mode === 'signup' && (
              <View style={styles.field}>
                <Text style={styles.label}>Your Name</Text>
                <TextInput
                  style={styles.input} placeholder="e.g. Rahul" placeholderTextColor="#9CA3AF"
                  value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="next"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input} placeholder="you@example.com" placeholderTextColor="#9CA3AF"
                value={email} onChangeText={setEmail} autoCapitalize="none"
                keyboardType="email-address" returnKeyType="next"
              />
            </View>

            {mode === 'signup' && (
              <View style={styles.field}>
                <Text style={styles.label}>Mobile Number <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(Optional)</Text></Text>
                <TextInput
                  style={styles.input} placeholder="11-digit number" placeholderTextColor="#9CA3AF"
                  value={mobileNumber} onChangeText={(t) => setMobileNumber(t.replace(/\D/g, '').slice(0, 11))}
                  keyboardType="phone-pad" returnKeyType="next"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]} placeholder="Min. 6 characters"
                  placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword}
                  secureTextEntry={!showPassword} returnKeyType="done" onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotRow} onPress={() => { setError(''); setMode('forgot'); }}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <ErrorBox error={error} />

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit} disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> :
                <Text style={styles.submitBtnText}>{mode === 'signup' ? 'Sign Up' : 'Log In'}</Text>}
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Feather name="chrome" size={20} color="#4285F4" />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleRow} onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
              <Text style={styles.toggleText}>
                {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.toggleLink}>{mode === 'signup' ? 'Log In' : 'Sign Up'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  deco1: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -110, right: -90,
  },
  deco2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 80, left: -60,
  },
  deco3: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)', top: 140, left: -20,
  },
  container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  logoSection: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 10,
  },
  appName: { fontSize: 30, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 6, letterSpacing: 0.3 },
  tagline: { fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.72)', letterSpacing: 0.1 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 26,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 14,
  },
  cardTitle: { fontSize: 21, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  highlightEmail: { fontFamily: 'Inter_600SemiBold', color: '#111827' },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151', marginBottom: 7 },
  input: {
    height: 50, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 15, fontSize: 15, fontFamily: 'Inter_400Regular',
    color: '#111827', backgroundColor: '#FAFCFF',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: {
    width: 50, height: 50, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FAFCFF',
  },
  forgotRow: { alignItems: 'flex-end', marginTop: -6, marginBottom: 10 },
  forgotText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#0F766E' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, borderWidth: 1, borderColor: '#FECACA',
    paddingHorizontal: 13, paddingVertical: 11, marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#DC2626', lineHeight: 18 },
  submitBtn: {
    height: 54, backgroundColor: '#0F766E', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
    shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.2 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 14 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' },
  orText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9CA3AF', letterSpacing: 0.8 },
  googleBtn: {
    height: 52, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff',
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#374151' },
  toggleRow: { marginTop: 18, alignItems: 'center' },
  toggleText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6B7280' },
  toggleLink: { fontFamily: 'Inter_700Bold', color: '#0F766E' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 22 },
  backText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#0F766E' },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#F0FDFA',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18,
    borderWidth: 1.5, borderColor: '#CCFBF1',
  },
  otpInput: {
    height: 68, borderWidth: 2, borderColor: '#0F766E', borderRadius: 14,
    fontSize: 30, fontFamily: 'Inter_700Bold', color: '#111827',
    backgroundColor: '#F0FDFA', letterSpacing: 12, textAlign: 'center',
  },
  resendRow: { marginTop: 18, alignItems: 'center' },
  resendText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#0F766E' },
  resendTextDisabled: { color: '#9CA3AF' },
});
