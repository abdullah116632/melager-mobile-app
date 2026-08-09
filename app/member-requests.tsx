import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { api, ApiPendingMemberRequest } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function avatarColor(name: string): string {
  const palette = ['#0D9488', '#0284C7', '#7C3AED', '#DB2777', '#EA580C', '#059669'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function MemberRequestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, refreshMe, activeMess } = useAuth();
  const { refreshCount } = useNotifications();

  const [requests, setRequests] = useState<ApiPendingMemberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const topPad = Platform.OS === 'web' ? 0 : insets.top;

  const fetchRequests = useCallback(async () => {
    if (!token || !activeMess) return;
    setLoading(true);
    try {
      const { requests: reqs } = await api.getMemberRequests(token, activeMess.id);
      setRequests(reqs);
      await refreshCount();
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [token, activeMess?.id, refreshCount]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAccept = async (id: number) => {
    if (!token) return;
    setActingOn(id);
    try {
      await api.acceptMemberRequest(id, token);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      await refreshMe();
      await refreshCount();
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // silently ignore
    } finally {
      setActingOn(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!token) return;
    setActingOn(id);
    try {
      await api.rejectMemberRequest(id, token);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      await refreshCount();
    } catch {
      // silently ignore
    } finally {
      setActingOn(null);
    }
  };

  const query = search.trim().toLowerCase();
  const filtered = requests.filter((r) => {
    if (!query) return true;
    return (
      r.name.toLowerCase().includes(query) ||
      (r.email?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Requests</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchRequests} activeOpacity={0.7}>
          <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name or email…"
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
      ) : requests.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="check-circle" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up!</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            No pending join requests right now.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Try a different name or email.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>
            {filtered.length} {filtered.length === 1 ? 'request' : 'requests'}
            {query ? ` matching "${search.trim()}"` : ' pending'}
          </Text>

          {filtered.map((req) => (
            <View
              key={req.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Avatar + name */}
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: avatarColor(req.name) }]}>
                  <Text style={styles.avatarText}>{initials(req.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                    {req.name}
                  </Text>
                  {req.email ? (
                    <Text style={[styles.email, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {req.email}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleReject(req.id)}
                  disabled={actingOn === req.id}
                  activeOpacity={0.8}
                >
                  {actingOn === req.id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <Feather name="x" size={15} color="#DC2626" />
                      <Text style={styles.rejectText}>Reject</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.acceptBtn]}
                  onPress={() => handleAccept(req.id)}
                  disabled={actingOn === req.id}
                  activeOpacity={0.8}
                >
                  {actingOn === req.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="check" size={15} color="#fff" />
                      <Text style={styles.acceptText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  refreshBtn: { padding: 4 },

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
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  list: {
    padding: 16,
    gap: 12,
  },
  countLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
    letterSpacing: 0.3,
  },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  email: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#DC2626',
  },
  acceptBtn: {
    backgroundColor: '#0F766E',
  },
  acceptText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
});
