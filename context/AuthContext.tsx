import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  api,
  clearApiCache,
  ApiError,
  ApiUser,
  ApiMess,
  ApiMessWithRole,
  ApiMyRequest,
} from "@/lib/api";
import { clearOfflineQueue } from "@/lib/offlineQueue";

const TOKEN_KEY = "@mess_auth_token";
const AUTH_CACHE_KEY = "@mess_auth_profile";
const ACTIVE_MESS_KEY = "@mess_active_mess_id";

export interface AuthState {
  user: ApiUser | null;
  messes: ApiMessWithRole[];
  requests: ApiMyRequest[];
  activeMess: ApiMessWithRole | null;
  token: string | null;
  authLoading: boolean;
}

interface MeCache {
  user: ApiUser;
  messes: ApiMessWithRole[];
  requests: ApiMyRequest[];
}

interface AuthContextType extends AuthState {
  mess: ApiMess | null;
  role: "admin" | "member" | null;
  consumerId: null;
  pendingRequest: null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  signup: (
    email: string,
    name: string,
    password: string,
    mobileNumber: string,
  ) => Promise<{ pendingEmail: string }>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  requestAccountDeletionOtp: () => Promise<void>;
  deleteAccountWithOtp: (otp: string) => Promise<void>;
  createMess: (name: string) => Promise<void>;
  joinMess: (messKey: string) => Promise<void>;
  retryJoin: (requestId: number) => Promise<void>;
  refreshMe: () => Promise<void>;
  selectMess: (mess: ApiMessWithRole) => void;
  exitMess: () => void;
  patchUser: (update: Partial<ApiUser>) => void;
  patchActiveMess: (update: Partial<ApiMessWithRole>) => void;
  patchMess: (update: Partial<ApiMess>) => void;
  updateProfileName: (name: string) => Promise<void>;
  updatePhone: (phone: string | null) => Promise<void>;
  updateMessName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    messes: [],
    requests: [],
    activeMess: null,
    token: null,
    authLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const values = await AsyncStorage.multiGet([
        TOKEN_KEY,
        AUTH_CACHE_KEY,
        ACTIVE_MESS_KEY,
      ]);
      const token = values[0]?.[1] ?? null;
      const cachedRaw = values[1]?.[1] ?? null;
      const activeMessId = Number(values[2]?.[1] ?? 0) || null;

      if (!token) {
        if (!cancelled) setState((prev) => ({ ...prev, authLoading: false }));
        return;
      }

      let cached: MeCache | null = null;
      if (cachedRaw) {
        try {
          cached = JSON.parse(cachedRaw) as MeCache;
        } catch {}
      }

      // Restore the last known session immediately, then refresh it in the
      // background. This removes a remote-database round trip from startup.
      if (cached?.user && Array.isArray(cached.messes)) {
        const cachedActiveMess =
          cached.messes.find((m) => m.id === activeMessId) ?? null;
        if (!cancelled) {
          setState({
            user: cached.user,
            messes: cached.messes,
            requests: cached.requests ?? [],
            activeMess: cachedActiveMess,
            token,
            authLoading: false,
          });
        }
      }

      try {
        const me = await api.me(token);
        if (cancelled) return;
        const refreshedActiveMess =
          me.messes.find((m) => m.id === activeMessId) ?? null;
        setState({
          user: me.user,
          messes: me.messes,
          requests: me.requests,
          activeMess: refreshedActiveMess,
          token,
          authLoading: false,
        });
        void AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(me));
      } catch (error) {
        // Keep a cached session usable during temporary network/database
        // outages, but immediately discard an explicitly rejected token.
        const tokenRejected =
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403);
        if ((!cached || tokenRejected) && !cancelled) {
          await AsyncStorage.multiRemove([
            TOKEN_KEY,
            AUTH_CACHE_KEY,
            ACTIVE_MESS_KEY,
          ]);
          setState({
            user: null,
            messes: [],
            requests: [],
            activeMess: null,
            token: null,
            authLoading: false,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const applyTokenResponse = async (token: string) => {
    const me = await api.me(token);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [AUTH_CACHE_KEY, JSON.stringify(me)],
    ]);
    setState({
      user: me.user,
      messes: me.messes,
      requests: me.requests,
      activeMess: null,
      token,
      authLoading: false,
    });
  };

  const login = async (email: string, password: string) => {
    const { token } = await api.login(email, password);
    await applyTokenResponse(token);
  };

  const loginWithGoogle = async (idToken: string) => {
    const { token } = await api.googleLogin(idToken);
    await applyTokenResponse(token);
  };

  const signup = async (
    email: string,
    name: string,
    password: string,
    mobileNumber: string,
  ): Promise<{ pendingEmail: string }> => {
    const { pendingEmail } = await api.signup(
      email,
      name,
      password,
      mobileNumber,
    );
    return { pendingEmail };
  };

  const verifyOtp = async (email: string, otp: string) => {
    const { token } = await api.verifyOtp(email, otp);
    await applyTokenResponse(token);
  };

  const resendOtp = async (email: string) => {
    await api.resendOtp(email);
  };

  const logout = async () => {
    clearApiCache();
    // Clearing the native Google session makes the next Google sign-in show
    // the account picker instead of automatically reusing the last account.
    try {
      await GoogleSignin.signOut();
    } catch {
      // The user may have signed in with email/password or have no Google
      // session; either way, local app logout must still complete.
    }
    await AsyncStorage.multiRemove([
      TOKEN_KEY,
      AUTH_CACHE_KEY,
      ACTIVE_MESS_KEY,
    ]);
    setState({
      user: null,
      messes: [],
      requests: [],
      activeMess: null,
      token: null,
      authLoading: false,
    });
  };

  const deleteAccount = async (password: string) => {
    if (!state.token) throw new Error("Not authenticated");
    await api.deleteAccount(password, state.token);
    await clearOfflineQueue();
    await logout();
  };

  const requestAccountDeletionOtp = async () => {
    if (!state.user) throw new Error("Not authenticated");
    await api.requestAccountDeletionOtp(state.user.email);
  };

  const deleteAccountWithOtp = async (otp: string) => {
    if (!state.user) throw new Error("Not authenticated");
    await api.confirmAccountDeletionOtp(state.user.email, otp);
    await clearOfflineQueue();
    await logout();
  };

  const createMess = async (name: string) => {
    if (!state.token) throw new Error("Not authenticated");
    const { mess: newMess } = await api.createMess(name, state.token);
    const me = await api.me(state.token);
    const fullMess = me.messes.find((m) => m.id === newMess.id) ?? null;
    setState((prev) => ({
      ...prev,
      messes: me.messes,
      requests: me.requests,
      activeMess: fullMess,
    }));
  };

  const joinMess = async (messKey: string) => {
    if (!state.token) throw new Error("Not authenticated");
    const { pendingRequest } = await api.joinMess(messKey, state.token);
    setState((prev) => ({
      ...prev,
      requests: [
        ...prev.requests.filter((r) => r.messId !== pendingRequest.messId),
        pendingRequest,
      ],
    }));
  };

  const retryJoin = async (requestId: number) => {
    if (!state.token) throw new Error("Not authenticated");
    const { request } = await api.retryJoin(requestId, state.token);
    setState((prev) => ({
      ...prev,
      requests: prev.requests.map((r) => (r.id === requestId ? request : r)),
    }));
  };

  const refreshMe = async () => {
    if (!state.token) return;
    const me = await api.me(state.token);
    setState((prev) => ({
      ...prev,
      user: me.user,
      messes: me.messes,
      requests: me.requests,
      activeMess: prev.activeMess
        ? (me.messes.find((m) => m.id === prev.activeMess!.id) ?? null)
        : null,
    }));
    void AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(me));
  };

  const selectMess = (mess: ApiMessWithRole) => {
    setState((prev) => ({ ...prev, activeMess: mess }));
    void AsyncStorage.setItem(ACTIVE_MESS_KEY, mess.id.toString());
  };

  const exitMess = () => {
    setState((prev) => ({ ...prev, activeMess: null }));
    void AsyncStorage.removeItem(ACTIVE_MESS_KEY);
  };

  const patchUser = (update: Partial<ApiUser>) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...update } : null,
    }));
  };

  const patchActiveMess = (update: Partial<ApiMessWithRole>) => {
    setState((prev) => {
      if (!prev.activeMess) return prev;
      const updated = { ...prev.activeMess, ...update };
      return {
        ...prev,
        activeMess: updated,
        messes: prev.messes.map((m) => (m.id === updated.id ? updated : m)),
      };
    });
  };

  const patchMess = (update: Partial<ApiMess>) => {
    patchActiveMess(update as Partial<ApiMessWithRole>);
  };

  const updateProfileName = async (name: string) => {
    if (!state.token) throw new Error("Not authenticated");
    const { name: newName } = await api.updateProfile(name, state.token);
    patchUser({ name: newName });
  };

  const updatePhone = async (phone: string | null) => {
    if (!state.token) throw new Error("Not authenticated");
    const { mobileNumber } = await api.updatePhone(phone, state.token);
    patchUser({ mobileNumber });
  };

  const updateMessName = async (name: string) => {
    if (!state.token || !state.activeMess) throw new Error("No active mess");
    const { name: newName } = await api.updateMessName(
      name,
      state.token,
      state.activeMess.id,
    );
    patchActiveMess({ name: newName });
  };

  const mess: ApiMess | null = state.activeMess
    ? {
        id: state.activeMess.id,
        name: state.activeMess.name,
        messKey: state.activeMess.messKey,
      }
    : null;
  const role: "admin" | "member" | null = state.activeMess?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        mess,
        role,
        consumerId: null,
        pendingRequest: null,
        login,
        loginWithGoogle,
        signup,
        verifyOtp,
        resendOtp,
        logout,
        deleteAccount,
        requestAccountDeletionOtp,
        deleteAccountWithOtp,
        createMess,
        joinMess,
        retryJoin,
        refreshMe,
        selectMess,
        exitMess,
        patchUser,
        patchActiveMess,
        patchMess,
        updateProfileName,
        updatePhone,
        updateMessName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
