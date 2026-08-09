import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : '/api';

type ModalType = 'changePassword' | 'updateEmail' | 'transferAdmin' | 'addCoAdmin' | null;

interface EligibleAdmin {
  id: number;
  name: string;
  userId: number;
  isAdmin?: boolean;
}

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role, token, refreshMe, patchUser } = useAuth();
  const colors = useColors();
  const isAdmin = role === 'admin';

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [cpConfirmPassword, setCpConfirmPassword] = useState('');
  const [showCpNew, setShowCpNew] = useState(false);
  const [cpOtp, setCpOtp] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [ueOtp, setUeOtp] = useState('');

  const [eligibleAdmins, setEligibleAdmins] = useState<EligibleAdmin[]>([]);
  const [selectedConsumerId, setSelectedConsumerId] = useState<number | null>(null);
  const [taOtp, setTaOtp] = useState('');
  const [taLoading, setTaLoading] = useState(false);
  const [caOtp, setCaOtp] = useState('');

  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
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

  const apiCall = async <T = unknown>(method: string, path: string, body?: object): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json() as { error?: string } & T;
    if (!res.ok) throw new Error(data.error ?? 'Request failed');
    return data;
  };

  const openModal = async (type: ModalType) => {
    setActiveModal(type);
    setStep(0);
    setError('');
    setCurrentPassword(''); setCpNewPassword(''); setCpConfirmPassword(''); setCpOtp('');
    setNewEmail(''); setUeOtp('');
    setTaOtp(''); setSelectedConsumerId(null); setEligibleAdmins([]);
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(0);

    if (type === 'transferAdmin' || type === 'addCoAdmin') {
      setTaLoading(true);
      try {
        const data = await apiCall<{ consumers: EligibleAdmin[] }>('GET', '/settings/security/eligible-admins');
        setEligibleAdmins(data.consumers);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load members');
      } finally {
        setTaLoading(false);
      }
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setStep(0);
    setError('');
    setCaOtp('');
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(0);
  };

  // ── Change Password ──────────────────────────────────────────────────────
  const handleCpSendCode = async () => {
    if (!currentPassword) { setError('Please enter your current password.'); return; }
    if (cpNewPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (cpNewPassword !== cpConfirmPassword) { setError('Passwords do not match.'); return; }
    setError(''); setLoading(true);
    try {
      await apiCall('POST', '/settings/security/request-otp', { action: 'change_password', currentPassword });
      setStep(1); startTimer();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { setLoading(false); }
  };

  const handleCpVerify = async () => {
    if (cpOtp.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError(''); setLoading(true);
    try {
      await apiCall('POST', '/settings/security/change-password', { otp: cpOtp, newPassword: cpNewPassword });
      setStep(2);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Verification failed'); }
    finally { setLoading(false); }
  };

  const handleCpResend = async () => {
    if (resendTimer > 0) return;
    try { await apiCall('POST', '/settings/security/request-otp', { action: 'change_password', currentPassword }); startTimer(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to resend code'); }
  };

  // ── Update Email ─────────────────────────────────────────────────────────
  const handleUeSendCode = async () => {
    if (!newEmail.trim()) { setError('Please enter a new email address.'); return; }
    setError(''); setLoading(true);
    try {
      await apiCall('POST', '/settings/security/request-otp', { action: 'update_email', payload: newEmail.trim() });
      setStep(1); startTimer();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { setLoading(false); }
  };

  const handleUeVerify = async () => {
    if (ueOtp.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await apiCall<{ newEmail: string }>('POST', '/settings/security/update-email', { otp: ueOtp });
      patchUser({ email: data.newEmail });
      setStep(2);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Verification failed'); }
    finally { setLoading(false); }
  };

  const handleUeResend = async () => {
    if (resendTimer > 0) return;
    try { await apiCall('POST', '/settings/security/request-otp', { action: 'update_email', payload: newEmail.trim() }); startTimer(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to resend code'); }
  };

  // ── Transfer Admin ───────────────────────────────────────────────────────
  const handleTaSendCode = async () => {
    if (!selectedConsumerId) { setError('Please select a member to transfer admin to.'); return; }
    setError(''); setLoading(true);
    try {
      await apiCall('POST', '/settings/security/request-otp', { action: 'add_admin', payload: String(selectedConsumerId) });
      setStep(1); startTimer();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { setLoading(false); }
  };

  const handleTaVerify = async () => {
    if (taOtp.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError(''); setLoading(true);
    try {
      await apiCall('POST', '/settings/security/add-admin', { otp: taOtp });
      setStep(2);
      setTimeout(() => refreshMe(), 600);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Verification failed'); }
    finally { setLoading(false); }
  };

  const handleTaResend = async () => {
    if (resendTimer > 0) return;
    try { await apiCall('POST', '/settings/security/request-otp', { action: 'add_admin', payload: String(selectedConsumerId) }); startTimer(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to resend code'); }
  };

  // ── Add Co-Admin ─────────────────────────────────────────────────────────
  const handleCaSendCode = async () => {
    if (!selectedConsumerId) { setError('Please select a member to grant admin to.'); return; }
    setError(''); setLoading(true);
    try {
      await apiCall('POST', '/settings/security/request-otp', { action: 'add_co_admin', payload: String(selectedConsumerId) });
      setStep(1); startTimer();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { setLoading(false); }
  };

  const handleCaVerify = async () => {
    if (caOtp.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError(''); setLoading(true);
    try {
      await apiCall('POST', '/settings/security/add-co-admin', { otp: caOtp });
      setStep(2);
      setTimeout(() => {}, 600);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Verification failed'); }
    finally { setLoading(false); }
  };

  const handleCaResend = async () => {
    if (resendTimer > 0) return;
    try { await apiCall('POST', '/settings/security/request-otp', { action: 'add_co_admin', payload: String(selectedConsumerId) }); startTimer(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to resend code'); }
  };

  // ── Shared UI pieces ─────────────────────────────────────────────────────
  const ErrorBox = () => error ? (
    <View style={s.errorBox}>
      <Feather name="alert-circle" size={14} color="#DC2626" />
      <Text style={s.errorText}>{error}</Text>
    </View>
  ) : null;

  const OtpField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <TextInput
      style={s.otpInput}
      value={value}
      onChangeText={(v) => { onChange(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
      keyboardType="number-pad"
      maxLength={6}
      placeholder="• • • • • •"
      placeholderTextColor="#CBD5E1"
      autoFocus
    />
  );

  const ResendRow = ({ onResend }: { onResend: () => void }) => (
    <TouchableOpacity onPress={onResend} disabled={resendTimer > 0} style={s.resendRow}>
      <Text style={[s.resendText, resendTimer > 0 && s.resendDisabled]}>
        {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Didn't receive it? Resend code"}
      </Text>
    </TouchableOpacity>
  );

  const SubmitBtn = ({ onPress, disabled, label }: { onPress: () => void; disabled?: boolean; label: string }) => (
    <TouchableOpacity
      style={[s.btn, (loading || disabled) && s.btnDisabled]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{label}</Text>}
    </TouchableOpacity>
  );

  const SuccessCard = ({ icon, iconBg, iconColor, title, body, onClose }: {
    icon: string; iconBg: string; iconColor: string; title: string; body: string; onClose: () => void;
  }) => (
    <View style={s.successBox}>
      <View style={[s.successIconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={40} color={iconColor} />
      </View>
      <Text style={s.successTitle}>{title}</Text>
      <Text style={s.successSub}>{body}</Text>
      <TouchableOpacity style={[s.btn, { marginTop: 24, width: '100%' }]} onPress={onClose}>
        <Text style={s.btnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Modal renderers ──────────────────────────────────────────────────────
  const renderChangePassword = () => {
    if (step === 2) return (
      <SuccessCard
        icon="check-circle" iconBg="#F0FDF4" iconColor="#16A34A"
        title="Password Changed!" body="Your account password has been updated successfully."
        onClose={closeModal}
      />
    );
    if (step === 1) return (
      <>
        <View style={s.iconCircle}><Feather name="mail" size={28} color="#0F766E" /></View>
        <Text style={s.modalTitle}>Check Your Email</Text>
        <Text style={s.modalSub}>A 6-digit verification code was sent to your email address.</Text>
        <Text style={s.fieldLabel}>Verification Code</Text>
        <OtpField value={cpOtp} onChange={setCpOtp} />
        <ErrorBox />
        <SubmitBtn onPress={handleCpVerify} disabled={cpOtp.length !== 6} label="Change Password" />
        <ResendRow onResend={handleCpResend} />
      </>
    );
    return (
      <>
        <View style={s.iconCircle}><Feather name="lock" size={28} color="#0F766E" /></View>
        <Text style={s.modalTitle}>Change Password</Text>
        <Text style={s.modalSub}>First verify your identity, then we'll send a code to your email to confirm.</Text>
        <Text style={s.fieldLabel}>Current Password</Text>
        <TextInput
          style={s.input} placeholder="Enter current password" placeholderTextColor="#9CA3AF"
          secureTextEntry value={currentPassword} onChangeText={setCurrentPassword}
          returnKeyType="next" autoFocus
        />
        <Text style={[s.fieldLabel, { marginTop: 14 }]}>New Password</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[s.input, { flex: 1 }]} placeholder="Min. 6 characters" placeholderTextColor="#9CA3AF"
            secureTextEntry={!showCpNew} value={cpNewPassword} onChangeText={setCpNewPassword}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowCpNew((v) => !v)}>
            <Feather name={showCpNew ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <Text style={[s.fieldLabel, { marginTop: 14 }]}>Confirm New Password</Text>
        <TextInput
          style={s.input} placeholder="Re-enter new password" placeholderTextColor="#9CA3AF"
          secureTextEntry={!showCpNew} value={cpConfirmPassword} onChangeText={setCpConfirmPassword}
          returnKeyType="done" onSubmitEditing={handleCpSendCode}
        />
        <ErrorBox />
        <SubmitBtn onPress={handleCpSendCode} label="Send Verification Code" />
      </>
    );
  };

  const renderUpdateEmail = () => {
    if (step === 2) return (
      <SuccessCard
        icon="check-circle" iconBg="#F0FDF4" iconColor="#16A34A"
        title="Email Updated!"
        body={`Your login email has been changed to\n${newEmail}`}
        onClose={closeModal}
      />
    );
    if (step === 1) return (
      <>
        <View style={[s.iconCircle, { backgroundColor: '#F0FDFA' }]}><Feather name="mail" size={28} color="#0D9488" /></View>
        <Text style={s.modalTitle}>Verify It's You</Text>
        <Text style={s.modalSub}>A 6-digit code was sent to your <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#111827' }}>current</Text> email to confirm the change.</Text>
        <Text style={s.fieldLabel}>Verification Code</Text>
        <OtpField value={ueOtp} onChange={setUeOtp} />
        <ErrorBox />
        <SubmitBtn onPress={handleUeVerify} disabled={ueOtp.length !== 6} label="Verify & Update Email" />
        <ResendRow onResend={handleUeResend} />
      </>
    );
    return (
      <>
        <View style={[s.iconCircle, { backgroundColor: '#F0FDFA' }]}><Feather name="at-sign" size={28} color="#0D9488" /></View>
        <Text style={s.modalTitle}>Update Email</Text>
        <Text style={s.modalSub}>Enter your new email. We'll send a code to your current email to verify the change.</Text>
        <Text style={s.fieldLabel}>New Email Address</Text>
        <TextInput
          style={s.input} placeholder="new@example.com" placeholderTextColor="#9CA3AF"
          keyboardType="email-address" autoCapitalize="none"
          value={newEmail} onChangeText={setNewEmail}
          returnKeyType="done" onSubmitEditing={handleUeSendCode} autoFocus
        />
        <ErrorBox />
        <SubmitBtn onPress={handleUeSendCode} label="Send Verification Code" />
      </>
    );
  };

  const renderTransferAdmin = () => {
    if (step === 2) return (
      <SuccessCard
        icon="shield" iconBg="#FFF7ED" iconColor="#EA580C"
        title="Admin Transferred!"
        body="The selected member is now the admin of this mess. You are now a regular member."
        onClose={closeModal}
      />
    );
    if (step === 1) {
      const selected = eligibleAdmins.find((c) => c.id === selectedConsumerId);
      return (
        <>
          <View style={[s.iconCircle, { backgroundColor: '#FFF7ED' }]}><Feather name="shield" size={28} color="#EA580C" /></View>
          <Text style={s.modalTitle}>Confirm Transfer</Text>
          <Text style={s.modalSub}>
            A code was sent to your email to confirm transferring admin to{' '}
            <Text style={{ fontFamily: 'Inter_700Bold', color: '#111827' }}>{selected?.name}</Text>.
          </Text>
          <View style={s.warningBox}>
            <Feather name="alert-triangle" size={14} color="#92400E" />
            <Text style={s.warningText}>You will lose admin privileges after this action.</Text>
          </View>
          <Text style={[s.fieldLabel, { marginTop: 16 }]}>Verification Code</Text>
          <OtpField value={taOtp} onChange={setTaOtp} />
          <ErrorBox />
          <SubmitBtn onPress={handleTaVerify} disabled={taOtp.length !== 6} label="Confirm Transfer" />
          <ResendRow onResend={handleTaResend} />
        </>
      );
    }
    return (
      <>
        <View style={[s.iconCircle, { backgroundColor: '#FFF7ED' }]}><Feather name="shield" size={28} color="#EA580C" /></View>
        <Text style={s.modalTitle}>Transfer Admin Role</Text>
        <Text style={s.modalSub}>Select a member with a linked account to become the new admin.</Text>
        {taLoading ? (
          <ActivityIndicator color="#0F766E" size="large" style={{ marginVertical: 40 }} />
        ) : eligibleAdmins.length === 0 ? (
          <View style={s.emptyBox}>
            <Feather name="users" size={36} color="#CBD5E1" />
            <Text style={s.emptyTitle}>No eligible members</Text>
            <Text style={s.emptyBody}>Members must have linked accounts to become admin. Add them via the Consumers tab with an email address.</Text>
          </View>
        ) : (
          <>
            <Text style={s.fieldLabel}>Select Member</Text>
            {eligibleAdmins.map((c) => {
              const sel = selectedConsumerId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[s.consumerRow, sel && s.consumerRowSel]}
                  onPress={() => { setSelectedConsumerId(c.id); setError(''); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.consumerAvatar, sel && { backgroundColor: '#0F766E' }]}>
                    <Text style={[s.consumerAvatarText, sel && { color: '#fff' }]}>
                      {c.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[s.consumerName, sel && { color: '#0F766E', fontFamily: 'Inter_600SemiBold' }]}>{c.name}</Text>
                  {sel && <Feather name="check-circle" size={18} color="#0F766E" />}
                </TouchableOpacity>
              );
            })}
          </>
        )}
        <ErrorBox />
        {eligibleAdmins.length > 0 && (
          <SubmitBtn onPress={handleTaSendCode} disabled={!selectedConsumerId} label="Send Verification Code" />
        )}
        <View style={[s.warningBox, { marginTop: 16 }]}>
          <Feather name="alert-triangle" size={14} color="#92400E" />
          <Text style={s.warningText}>This is permanent. You will become a regular member.</Text>
        </View>
      </>
    );
  };

  const renderAddCoAdmin = () => {
    if (step === 2) return (
      <SuccessCard
        icon="user-check" iconBg="#EFF6FF" iconColor="#2563EB"
        title="Admin Added!"
        body="The selected member now has admin privileges. Both of you are admins of this mess."
        onClose={closeModal}
      />
    );
    if (step === 1) {
      const selected = eligibleAdmins.find((c) => c.id === selectedConsumerId);
      return (
        <>
          <View style={[s.iconCircle, { backgroundColor: '#EFF6FF' }]}><Feather name="user-check" size={28} color="#2563EB" /></View>
          <Text style={s.modalTitle}>Confirm New Admin</Text>
          <Text style={s.modalSub}>
            A code was sent to your email to confirm granting admin to{' '}
            <Text style={{ fontFamily: 'Inter_700Bold', color: '#111827' }}>{selected?.name}</Text>.
          </Text>
          <View style={[s.warningBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Feather name="info" size={14} color="#1D4ED8" />
            <Text style={[s.warningText, { color: '#1E40AF' }]}>You will both be admins. Your privileges are not affected.</Text>
          </View>
          <Text style={[s.fieldLabel, { marginTop: 16 }]}>Verification Code</Text>
          <OtpField value={caOtp} onChange={setCaOtp} />
          <ErrorBox />
          <SubmitBtn onPress={handleCaVerify} disabled={caOtp.length !== 6} label="Confirm & Grant Admin" />
          <ResendRow onResend={handleCaResend} />
        </>
      );
    }
    // Step 0 — pick a member (show non-admin members only)
    const nonAdminMembers = eligibleAdmins.filter((c) => !c.isAdmin);
    const alreadyAdmins = eligibleAdmins.filter((c) => c.isAdmin);
    return (
      <>
        <View style={[s.iconCircle, { backgroundColor: '#EFF6FF' }]}><Feather name="user-check" size={28} color="#2563EB" /></View>
        <Text style={s.modalTitle}>Add New Admin</Text>
        <Text style={s.modalSub}>Select a member to grant admin privileges. They will be able to edit data alongside you.</Text>
        {taLoading ? (
          <ActivityIndicator color="#2563EB" size="large" style={{ marginVertical: 40 }} />
        ) : eligibleAdmins.length === 0 ? (
          <View style={s.emptyBox}>
            <Feather name="users" size={36} color="#CBD5E1" />
            <Text style={s.emptyTitle}>No eligible members</Text>
            <Text style={s.emptyBody}>Members must have linked accounts to become admin. Add them via the Consumers tab with an email address.</Text>
          </View>
        ) : (
          <>
            {nonAdminMembers.length > 0 && (
              <>
                <Text style={s.fieldLabel}>Select Member</Text>
                {nonAdminMembers.map((c) => {
                  const sel = selectedConsumerId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.consumerRow, sel && { borderColor: '#2563EB', backgroundColor: '#EFF6FF' }]}
                      onPress={() => { setSelectedConsumerId(c.id); setError(''); }}
                      activeOpacity={0.7}
                    >
                      <View style={[s.consumerAvatar, sel && { backgroundColor: '#2563EB' }]}>
                        <Text style={[s.consumerAvatarText, sel && { color: '#fff' }]}>{c.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[s.consumerName, sel && { color: '#2563EB', fontFamily: 'Inter_600SemiBold' }]}>{c.name}</Text>
                      {sel && <Feather name="check-circle" size={18} color="#2563EB" />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
            {alreadyAdmins.length > 0 && (
              <>
                <Text style={[s.fieldLabel, { marginTop: 14 }]}>Already Admin</Text>
                {alreadyAdmins.map((c) => (
                  <View key={c.id} style={[s.consumerRow, { opacity: 0.5 }]}>
                    <View style={[s.consumerAvatar, { backgroundColor: '#16A34A' }]}>
                      <Text style={[s.consumerAvatarText, { color: '#fff' }]}>{c.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={s.consumerName}>{c.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Feather name="shield" size={12} color="#16A34A" />
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#16A34A' }}>Admin</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
        <ErrorBox />
        {nonAdminMembers.length > 0 && (
          <SubmitBtn onPress={handleCaSendCode} disabled={!selectedConsumerId} label="Send Verification Code" />
        )}
        <View style={[s.warningBox, { marginTop: 16, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <Feather name="info" size={14} color="#1D4ED8" />
          <Text style={[s.warningText, { color: '#1E40AF' }]}>The new admin will have full edit access. You remain admin.</Text>
        </View>
      </>
    );
  };

  const modalContent =
    activeModal === 'changePassword' ? renderChangePassword() :
    activeModal === 'updateEmail' ? renderUpdateEmail() :
    activeModal === 'transferAdmin' ? renderTransferAdmin() :
    activeModal === 'addCoAdmin' ? renderAddCoAdmin() : null;

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 8), backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Security</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT SECURITY</Text>

        <TouchableOpacity
          style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => openModal('changePassword')}
          activeOpacity={0.75}
        >
          <View style={[s.rowIcon, { backgroundColor: '#EFF6FF' }]}>
            <Feather name="lock" size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.rowTitle, { color: colors.foreground }]}>Change Password</Text>
            <Text style={[s.rowSub, { color: colors.mutedForeground }]}>Update your account password</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => openModal('updateEmail')}
          activeOpacity={0.75}
        >
          <View style={[s.rowIcon, { backgroundColor: '#F0FDFA' }]}>
            <Feather name="at-sign" size={18} color="#0D9488" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.rowTitle, { color: colors.foreground }]}>Update Email</Text>
            <Text style={[s.rowSub, { color: colors.mutedForeground }]}>Change your login email address</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {isAdmin && (
          <>
            <TouchableOpacity
              style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openModal('addCoAdmin')}
              activeOpacity={0.75}
            >
              <View style={[s.rowIcon, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="user-check" size={18} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: colors.foreground }]}>Add New Admin</Text>
                <Text style={[s.rowSub, { color: colors.mutedForeground }]}>Grant admin to a member, keep yours</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openModal('transferAdmin')}
              activeOpacity={0.75}
            >
              <View style={[s.rowIcon, { backgroundColor: '#FFF7ED' }]}>
                <Feather name="shield" size={18} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: colors.foreground }]}>Transfer Admin Role</Text>
                <Text style={[s.rowSub, { color: colors.mutedForeground }]}>Make another member the admin</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── Bottom-sheet Modal ── */}
      <Modal transparent visible={activeModal !== null} animationType="slide" onRequestClose={step < 2 ? closeModal : undefined}>
        <View style={s.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={step < 2 ? closeModal : undefined} activeOpacity={1} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
              {step < 2 && (
                <TouchableOpacity style={s.sheetClose} onPress={closeModal}>
                  <Feather name="x" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {modalContent}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  content: { padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14, marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 28, paddingHorizontal: 24, maxHeight: '92%',
  },
  sheetClose: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 4 },

  iconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDFA',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#111827', textAlign: 'center', marginBottom: 6 },
  modalSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151', marginBottom: 6 },
  input: {
    height: 48, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, fontSize: 15, fontFamily: 'Inter_400Regular',
    color: '#111827', backgroundColor: '#F9FAFB',
  },
  eyeBtn: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#F9FAFB',
  },
  otpInput: {
    height: 64, borderWidth: 2, borderColor: '#0F766E', borderRadius: 12,
    fontSize: 28, fontFamily: 'Inter_700Bold', color: '#111827',
    backgroundColor: '#F9FAFB', letterSpacing: 12, textAlign: 'center', marginBottom: 12,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#DC2626' },
  btn: {
    height: 52, backgroundColor: '#0F766E', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  warningText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', color: '#92400E', lineHeight: 18 },
  resendRow: { marginTop: 14, alignItems: 'center' },
  resendText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#0F766E' },
  resendDisabled: { color: '#9CA3AF' },

  consumerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#E5E7EB', marginBottom: 8, backgroundColor: '#F9FAFB',
  },
  consumerRowSel: { borderColor: '#0F766E', backgroundColor: '#F0FDFA' },
  consumerAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  consumerAvatarText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#374151' },
  consumerName: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#111827' },

  successBox: { alignItems: 'center', paddingVertical: 24 },
  successIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 10 },
  successSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6B7280', textAlign: 'center', lineHeight: 22 },

  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#6B7280' },
  emptyBody: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9CA3AF', textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
});
