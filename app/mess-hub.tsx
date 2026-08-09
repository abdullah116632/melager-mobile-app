import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { ApiMessWithRole, ApiMyRequest } from '@/lib/api';

function roleBadgeColors(role: 'admin' | 'member') {
  return role === 'admin'
    ? { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
    : { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
}

function MessCard({
  mess,
  onEnter,
}: {
  mess: ApiMessWithRole;
  onEnter: (m: ApiMessWithRole) => void;
}) {
  const badge = roleBadgeColors(mess.role);
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.messIconCircle}>
          <Feather name="home" size={20} color="#0F766E" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.messName} numberOfLines={1}>{mess.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {mess.role === 'admin' ? 'Admin' : 'Member'}
              </Text>
            </View>
            {mess.role === 'admin' && (
              <Text style={styles.messKey}>
                <Feather name="key" size={10} color="#9CA3AF" />{' '}
                {mess.messKey}
              </Text>
            )}
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.enterBtn} onPress={() => onEnter(mess)} activeOpacity={0.8}>
        <Text style={styles.enterBtnText}>Enter</Text>
        <Feather name="arrow-right" size={15} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function RequestCard({
  request,
  onRetry,
  retrying,
}: {
  request: ApiMyRequest;
  onRetry: (r: ApiMyRequest) => void;
  retrying: boolean;
}) {
  const isPending = request.status === 'pending';
  return (
    <View style={[styles.card, styles.requestCard]}>
      <View style={styles.cardLeft}>
        <View style={[styles.messIconCircle, { backgroundColor: isPending ? '#FFFBEB' : '#FEF2F2' }]}>
          <Feather
            name={isPending ? 'clock' : 'x-circle'}
            size={20}
            color={isPending ? '#D97706' : '#DC2626'}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.messName} numberOfLines={1}>{request.messName}</Text>
          <View style={[styles.badge, {
            backgroundColor: isPending ? '#FFFBEB' : '#FEF2F2',
            borderColor: isPending ? '#FDE68A' : '#FECACA',
          }]}>
            <Text style={[styles.badgeText, { color: isPending ? '#92400E' : '#991B1B' }]}>
              {isPending ? 'Pending approval' : 'Request rejected'}
            </Text>
          </View>
        </View>
      </View>
      {!isPending && (
        <TouchableOpacity
          style={[styles.retryBtn, retrying && { opacity: 0.6 }]}
          onPress={() => onRetry(request)}
          disabled={retrying}
          activeOpacity={0.8}
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#7C3AED" />
          ) : (
            <>
              <Feather name="refresh-cw" size={13} color="#7C3AED" />
              <Text style={styles.retryBtnText}>Request Again</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function MessHubScreen() {
  const { user, messes, requests, selectMess, retryJoin, refreshMe, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [retryError, setRetryError] = useState<string>('');

  useEffect(() => {
    refreshMe().finally(() => setInitialLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMe();
    setRefreshing(false);
  }, [refreshMe]);

  const handleEnter = (mess: ApiMessWithRole) => {
    selectMess(mess);
  };

  const handleRetry = async (request: ApiMyRequest) => {
    setRetryingId(request.id);
    setRetryError('');
    try {
      await retryJoin(request.id);
    } catch (e: unknown) {
      setRetryError(e instanceof Error ? e.message : 'Failed to send request again');
    } finally {
      setRetryingId(null);
    }
  };

  const hasNoActivity = messes.length === 0 && requests.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View pointerEvents="none" style={styles.headerDeco1} />
        <View pointerEvents="none" style={styles.headerDeco2} />
        <View style={styles.headerRow}>
          <View style={styles.logoCircle}>
            <Feather name="coffee" size={22} color="#0F766E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.appTitle}>Mess Manager</Text>
            <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] ?? 'there'}! 👋</Text>
          </View>
          {initialLoading ? (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={{ padding: 8 }} />
          ) : (
            <TouchableOpacity style={styles.logoutIconBtn} onPress={logout} activeOpacity={0.7}>
              <Feather name="log-out" size={18} color="rgba(255,255,255,0.75)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0F766E"
          />
        }
      >
        {retryError ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.errorBannerText}>{retryError}</Text>
          </View>
        ) : null}

        {messes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MY MESSES</Text>
            {messes.map((m) => (
              <MessCard key={m.id} mess={m} onEnter={handleEnter} />
            ))}
          </View>
        )}

        {requests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>JOIN REQUESTS</Text>
            {requests.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                onRetry={handleRetry}
                retrying={retryingId === r.id}
              />
            ))}
          </View>
        )}

        {hasNoActivity && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="home" size={36} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No messes yet</Text>
            <Text style={styles.emptyDesc}>
              Create a new mess or join an existing one using a mess key.
            </Text>
          </View>
        )}

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>ADD A MESS</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/mess-setup?mode=create')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="plus-circle" size={24} color="#0F766E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Create a New Mess</Text>
              <Text style={styles.actionDesc}>Start a mess and become its admin</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/mess-setup?mode=join')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="log-in" size={24} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Join a Mess</Text>
              <Text style={styles.actionDesc}>Enter a mess key to request access</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0B5E57',
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  headerDeco1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -50,
  },
  headerDeco2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  appTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  greeting: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', marginTop: 1 },
  logoutIconBtn: { padding: 8 },

  scrollContent: { padding: 16, gap: 8 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 4,
  },
  errorBannerText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#DC2626' },
  section: { marginBottom: 8, gap: 10 },
  sectionTitle: {
    fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6B7280',
    letterSpacing: 0.8, marginBottom: 4, paddingHorizontal: 2,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  requestCard: { borderLeftWidth: 3, borderLeftColor: '#E5E7EB' },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  messIconCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 5 },
  messName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' },
  messKey: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9CA3AF', letterSpacing: 1 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  enterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0F766E', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  enterBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F3E8FF', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: '#DDD6FE',
    minWidth: 116,
    justifyContent: 'center',
  },
  retryBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#7C3AED' },
  emptyState: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#374151', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6B7280',
    textAlign: 'center', lineHeight: 21,
  },

  actionsSection: { marginTop: 8, gap: 10 },
  actionCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 2 },
  actionDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6B7280' },
});
