import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Platform,
  ToastAndroid,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { api, ApiConsumer } from '@/lib/api';

const COL_NAME = 160;
const COL_EMAIL = 210;
const COL_PHONE = 140;
const COL_DEL = 56;
const ROW_H = 52;

function showCopied(label: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(`${label} copied`, ToastAndroid.SHORT);
  } else if (Platform.OS === 'ios') {
    Alert.alert('Copied', `${label} copied to clipboard`);
  }
}

async function copyToClipboard(value: string, label: string) {
  await Clipboard.setStringAsync(value);
  showCopied(label);
}

export default function ConsumersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, activeMess, role } = useAuth();

  const [consumers, setConsumers] = useState<ApiConsumer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiConsumer | null>(null);

  const isAdmin = role === 'admin';
  const topPad = Platform.OS === 'web' ? 0 : insets.top;

  const fetchConsumers = useCallback(async () => {
    if (!token || !activeMess) return;
    setLoading(true);
    try {
      const { consumers: list } = await api.getConsumers(token, activeMess.id);
      setConsumers(list);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [token, activeMess?.id]);

  useEffect(() => { fetchConsumers(); }, [fetchConsumers]);

  const handleCopy = async (value: string, key: string, label: string) => {
    await copyToClipboard(value, label);
    setCopiedId(key);
    setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1500);
  };

  const confirmDelete = (consumer: ApiConsumer) => {
    if (Platform.OS === 'web') {
      setPendingDelete(consumer);
      return;
    }
    Alert.alert(
      'Delete Consumer',
      `All meals, expenses, and deposits for "${consumer.name}" will be permanently deleted.\n\nAre you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(consumer.id),
        },
      ],
    );
  };

  const handleDelete = async (consumerId: number) => {
    if (!token || !activeMess) return;
    setDeletingId(consumerId);
    try {
      await api.deleteConsumer(consumerId, token, activeMess.id);
      setConsumers((prev) => prev.filter((c) => c.id !== consumerId));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete consumer.');
    } finally {
      setDeletingId(null);
    }
  };

  const query = search.trim().toLowerCase();
  const filtered = consumers.filter((c) => {
    if (!query) return true;
    return (
      (c.email?.toLowerCase().includes(query) ?? false) ||
      (c.mobileNumber?.toLowerCase().includes(query) ?? false) ||
      c.name.toLowerCase().includes(query)
    );
  });

  const linked = filtered.filter((c) => c.userId != null);
  const manual = filtered.filter((c) => c.userId == null);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Consumers</Text>
          {!loading && (
            <Text style={styles.headerSub}>{consumers.length} total</Text>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchConsumers} activeOpacity={0.7}>
          <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name, email or phone…"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS !== 'ios' && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : consumers.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="users" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No consumers yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Add consumers from the Meals tab.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Try a different name, email or phone.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {linked.length > 0 && (
            <TableSection
              label="REGISTERED MEMBERS"
              consumers={linked}
              colors={colors}
              copiedId={copiedId}
              onCopy={handleCopy}
              isAdmin={isAdmin}
              onDelete={confirmDelete}
              deletingId={deletingId}
            />
          )}
          {manual.length > 0 && (
            <TableSection
              label="MANUALLY ADDED"
              consumers={manual}
              colors={colors}
              copiedId={copiedId}
              onCopy={handleCopy}
              topMargin={linked.length > 0}
              isAdmin={isAdmin}
              onDelete={confirmDelete}
              deletingId={deletingId}
            />
          )}
        </ScrollView>
      )}

      {/* Web-safe delete confirmation modal */}
      <Modal
        visible={pendingDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="trash-2" size={22} color="#DC2626" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Delete Consumer?</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              All meals, expenses, and deposits for{' '}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                {pendingDelete?.name}
              </Text>{' '}
              will be permanently deleted.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => setPendingDelete(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnCancelText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnDelete}
                onPress={() => {
                  if (pendingDelete) handleDelete(pendingDelete.id);
                  setPendingDelete(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface TableSectionProps {
  label: string;
  consumers: ApiConsumer[];
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
  copiedId: string | null;
  onCopy: (value: string, key: string, label: string) => void;
  topMargin?: boolean;
  isAdmin: boolean;
  onDelete: (consumer: ApiConsumer) => void;
  deletingId: number | null;
}

function TableSection({ label, consumers, colors, copiedId, onCopy, topMargin, isAdmin, onDelete, deletingId }: TableSectionProps) {
  return (
    <View style={[styles.section, topMargin && { marginTop: 16 }]}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>

      {/* Table card */}
      <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
          <View>
            {/* Column headers */}
            <View style={[styles.theadRow, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
              <View style={[styles.thCell, { width: COL_NAME }]}>
                <Text style={[styles.th, { color: colors.mutedForeground }]}>NAME</Text>
              </View>
              <View style={[styles.thCell, { width: COL_EMAIL, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
                <Text style={[styles.th, { color: colors.mutedForeground }]}>EMAIL</Text>
              </View>
              <View style={[styles.thCell, { width: COL_PHONE, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
                <Text style={[styles.th, { color: colors.mutedForeground }]}>PHONE</Text>
              </View>
              {isAdmin && (
                <View style={[styles.thCell, { width: COL_DEL, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border, alignItems: 'center' }]}>
                  <Text style={[styles.th, { color: colors.mutedForeground }]}></Text>
                </View>
              )}
            </View>

            {/* Rows */}
            {consumers.map((c, idx) => (
              <View
                key={c.id}
                style={[
                  styles.tRow,
                  { borderTopColor: colors.border },
                  idx === 0 && { borderTopWidth: 0 },
                ]}
              >
                {/* Name */}
                <View style={[styles.tdCell, { width: COL_NAME }]}>
                  <Text style={[styles.tdName, { color: colors.foreground }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  {c.userId ? (
                    <Text style={[styles.tdBadge, { color: colors.primary }]}>● Registered</Text>
                  ) : (
                    <Text style={[styles.tdBadge, { color: '#94A3B8' }]}>● Manual</Text>
                  )}
                </View>

                {/* Email */}
                <View style={[styles.tdCell, { width: COL_EMAIL, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
                  {c.email ? (
                    <View style={styles.copyRow}>
                      <Text style={[styles.tdText, { color: colors.foreground }]} numberOfLines={1}>
                        {c.email}
                      </Text>
                      <TouchableOpacity
                        style={[styles.copyBtn, { backgroundColor: colors.secondary }]}
                        onPress={() => onCopy(c.email!, `email-${c.id}`, 'Email')}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Feather
                          name={copiedId === `email-${c.id}` ? 'check' : 'copy'}
                          size={13}
                          color={copiedId === `email-${c.id}` ? '#16A34A' : colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={[styles.tdEmpty, { color: colors.mutedForeground }]}>—</Text>
                  )}
                </View>

                {/* Phone */}
                <View style={[styles.tdCell, { width: COL_PHONE, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
                  {c.mobileNumber ? (
                    <View style={styles.copyRow}>
                      <Text style={[styles.tdText, { color: colors.foreground }]} numberOfLines={1}>
                        {c.mobileNumber}
                      </Text>
                      <TouchableOpacity
                        style={[styles.copyBtn, { backgroundColor: colors.secondary }]}
                        onPress={() => onCopy(c.mobileNumber!, `phone-${c.id}`, 'Phone')}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Feather
                          name={copiedId === `phone-${c.id}` ? 'check' : 'copy'}
                          size={13}
                          color={copiedId === `phone-${c.id}` ? '#16A34A' : colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={[styles.tdEmpty, { color: colors.mutedForeground }]}>—</Text>
                  )}
                </View>

                {/* Delete */}
                {isAdmin && (
                  <View style={[styles.tdCell, { width: COL_DEL, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                    {deletingId === c.id ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : c.isAdmin ? (
                      <Feather name="shield" size={15} color={colors.mutedForeground} />
                    ) : (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => onDelete(c)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="trash-2" size={15} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  refreshBtn: { padding: 6 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 0,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginTop: 4 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 2,
  },

  tableCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },

  theadRow: {
    flexDirection: 'row',
    height: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thCell: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  th: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
  },

  tRow: {
    flexDirection: 'row',
    minHeight: ROW_H,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tdCell: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tdName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  tdBadge: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  tdText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  tdEmpty: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  modalBtnDelete: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalBtnDeleteText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
});
