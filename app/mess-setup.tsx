import React, { useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

type Step = 'choose' | 'create' | 'join';

export default function MessSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { user, createMess, joinMess } = useAuth();

  const initialStep: Step = mode === 'create' ? 'create' : mode === 'join' ? 'join' : 'choose';
  const [step, setStep] = useState<Step>(initialStep);
  const [messName, setMessName] = useState('');
  const [messKey, setMessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  const handleCreate = async () => {
    if (!messName.trim()) { setError('Enter a mess name.'); return; }
    setError('');
    setLoading(true);
    try {
      await createMess(messName.trim());
      // activeMess is now set → AuthGate routes to tabs automatically
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create mess');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!messKey.trim()) { setError('Enter the mess key.'); return; }
    setError('');
    setLoading(true);
    try {
      await joinMess(messKey.trim().toUpperCase());
      setJoinSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/mess-hub');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0B5E57' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View pointerEvents="none" style={styles.deco1} />
      <View pointerEvents="none" style={styles.deco2} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.85)" />
          <Text style={styles.backText}>Back to Hub</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Feather name="coffee" size={30} color="#0F766E" />
          </View>
          <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] ?? 'there'}!</Text>
          <Text style={styles.subtitle}>Add another mess</Text>
        </View>

        {/* Join success state */}
        {joinSuccess && (
          <View style={styles.card}>
            <View style={[styles.pendingIconCircle]}>
              <Feather name="check-circle" size={32} color="#059669" />
            </View>
            <Text style={styles.cardTitle}>Request Sent!</Text>
            <Text style={styles.cardDesc}>
              Your request has been sent to the admin for approval.{'\n'}
              You can check the status in the Hub.
            </Text>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#0F766E', marginTop: 8 }]}
              onPress={() => router.replace('/mess-hub')}
            >
              <Feather name="home" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Back to Hub</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Choose Step */}
        {!joinSuccess && step === 'choose' && (
          <View style={styles.chooseGrid}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setStep('create')}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="plus-circle" size={28} color="#0F766E" />
              </View>
              <Text style={styles.optionTitle}>Create a Mess</Text>
              <Text style={styles.optionDesc}>
                Start a new mess. You'll be the admin and get a shareable key.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setStep('join')}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="log-in" size={28} color="#3B82F6" />
              </View>
              <Text style={styles.optionTitle}>Join a Mess</Text>
              <Text style={styles.optionDesc}>
                Enter the mess key shared by your admin to request to join.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Create Step */}
        {!joinSuccess && step === 'create' && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.stepBackBtn} onPress={() => { setStep('choose'); setError(''); }}>
              <Feather name="arrow-left" size={18} color="#0F766E" />
              <Text style={styles.stepBackText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.cardTitle}>Create a Mess</Text>
            <Text style={styles.cardDesc}>
              Give your mess a name. You'll receive a unique key to share with members.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Mess Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sunrise Mess"
                placeholderTextColor="#9CA3AF"
                value={messName}
                onChangeText={setMessName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleCreate}
                autoFocus
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="plus-circle" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Create Mess</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Join Step */}
        {!joinSuccess && step === 'join' && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.stepBackBtn} onPress={() => { setStep('choose'); setError(''); }}>
              <Feather name="arrow-left" size={18} color="#0F766E" />
              <Text style={styles.stepBackText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.cardTitle}>Join a Mess</Text>
            <Text style={styles.cardDesc}>
              Enter the 8-character mess key. Your request will be sent to the admin for approval.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Mess Key</Text>
              <TextInput
                style={[styles.input, styles.keyInput]}
                placeholder="e.g. A3F92B1C"
                placeholderTextColor="#9CA3AF"
                value={messKey}
                onChangeText={(t) => setMessKey(t.toUpperCase())}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleJoin}
                autoFocus
                maxLength={8}
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.joinBtn, loading && styles.btnDisabled]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Send Join Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  deco1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -70,
  },
  deco2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 60, left: -40,
  },
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  backText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  header: { alignItems: 'center', marginBottom: 8, marginTop: 8 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 10,
  },
  greeting: { fontSize: 26, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 5, letterSpacing: 0.2 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.72)' },
  chooseGrid: { gap: 14 },
  optionCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 14, elevation: 6,
  },
  optionIcon: {
    width: 58, height: 58, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  optionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 6 },
  optionDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6B7280', lineHeight: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14, shadowRadius: 20, elevation: 10,
    alignItems: 'center',
  },
  pendingIconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: '#A7F3D0',
  },
  stepBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18, alignSelf: 'flex-start' },
  stepBackText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#0F766E' },
  cardTitle: { fontSize: 21, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 6, textAlign: 'center' },
  cardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6B7280', marginBottom: 22, lineHeight: 20, textAlign: 'center' },
  field: { marginBottom: 18, width: '100%' },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151', marginBottom: 7 },
  input: {
    height: 50, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 15, fontSize: 15, fontFamily: 'Inter_400Regular',
    color: '#111827', backgroundColor: '#FAFCFF', width: '100%',
  },
  keyInput: { fontFamily: 'Inter_700Bold', letterSpacing: 4, fontSize: 20, textAlign: 'center' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2',
    borderRadius: 10, borderWidth: 1, borderColor: '#FECACA',
    paddingHorizontal: 13, paddingVertical: 11, marginBottom: 14, width: '100%',
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#DC2626', lineHeight: 18 },
  submitBtn: {
    height: 54, backgroundColor: '#0F766E', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6, width: '100%',
  },
  joinBtn: {
    height: 54, backgroundColor: '#3B82F6', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%',
  },
  btnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});
