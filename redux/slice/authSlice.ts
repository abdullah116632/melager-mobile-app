import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createAction,
  createAsyncThunk,
  createSlice,
  isFulfilled,
  isPending,
  isRejected,
  type ThunkAction,
  type UnknownAction,
} from "@reduxjs/toolkit";

import {
  api,
  clearApiCache,
  ApiError,
  type ApiMess,
  type ApiMessWithRole,
  type ApiMyRequest,
  type ApiUser,
  type MeAuthResponse,
} from "@/lib/api";
import { clearOfflineQueue } from "@/lib/offlineQueue";
import { loadGoogleSignInModule } from "@/services/googleSignInService";

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
  initializationStarted: boolean;
  requestStatus: "idle" | "loading" | "succeeded" | "failed";
  requestError: string | null;
}

interface MeCache {
  user: ApiUser;
  messes: ApiMessWithRole[];
  requests: ApiMyRequest[];
}

interface AuthSessionPayload {
  me: MeAuthResponse;
  token: string;
  activeMess: ApiMessWithRole | null;
}

type AuthRootState = { auth: AuthState };
type AuthThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  AuthRootState,
  unknown,
  UnknownAction
>;

const initialState: AuthState = {
  user: null,
  messes: [],
  requests: [],
  activeMess: null,
  token: null,
  authLoading: true,
  initializationStarted: false,
  requestStatus: "idle",
  requestError: null,
};

const createSignedOutState = (): AuthState => ({
  ...initialState,
  authLoading: false,
  initializationStarted: true,
});

const createAuthenticatedState = ({
  me,
  token,
  activeMess,
}: AuthSessionPayload): AuthState => ({
  user: me.user,
  messes: me.messes,
  requests: me.requests,
  activeMess,
  token,
  authLoading: false,
  initializationStarted: true,
  requestStatus: "succeeded",
  requestError: null,
});

const restoreAuthState = createAction<AuthState>("auth/restoreState");
const setActiveMess = createAction<ApiMessWithRole | null>(
  "auth/setActiveMess",
);
export const patchUser = createAction<Partial<ApiUser>>("auth/patchUser");
export const patchActiveMess = createAction<Partial<ApiMessWithRole>>(
  "auth/patchActiveMess",
);

const createAuthAsyncThunk = createAsyncThunk.withTypes<{
  state: AuthRootState;
}>();

const loadSession = async (
  token: string,
  activeMess: ApiMessWithRole | null = null,
): Promise<AuthSessionPayload> => {
  const me = await api.me(token);
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [AUTH_CACHE_KEY, JSON.stringify(me)],
  ]);
  return { me, token, activeMess };
};

const clearLocalSession = async () => {
  clearApiCache();
  try {
    const googleSignInModule = await loadGoogleSignInModule();
    await googleSignInModule?.GoogleSignin.signOut();
  } catch {
    // Local app logout must still finish without a Google/native session.
  }
  await AsyncStorage.multiRemove([
    TOKEN_KEY,
    AUTH_CACHE_KEY,
    ACTIVE_MESS_KEY,
  ]);
};

export const initializeAuth = createAuthAsyncThunk<
  AuthState | null,
  void
>(
  "auth/initialize",
  async (_arg, { dispatch }) => {
    const values = await AsyncStorage.multiGet([
      TOKEN_KEY,
      AUTH_CACHE_KEY,
      ACTIVE_MESS_KEY,
    ]);
    const token = values[0]?.[1] ?? null;
    const cachedRaw = values[1]?.[1] ?? null;
    const activeMessId = Number(values[2]?.[1] ?? 0) || null;

    if (!token) return createSignedOutState();

    let cached: MeCache | null = null;
    if (cachedRaw) {
      try {
        cached = JSON.parse(cachedRaw) as MeCache;
      } catch {}
    }

    if (cached?.user && Array.isArray(cached.messes)) {
      const cachedActiveMess =
        cached.messes.find((mess) => mess.id === activeMessId) ?? null;
      dispatch(
        restoreAuthState(
          createAuthenticatedState({
            me: {
              user: cached.user,
              messes: cached.messes,
              requests: cached.requests ?? [],
            },
            token,
            activeMess: cachedActiveMess,
          }),
        ),
      );
    }

    try {
      const me = await api.me(token);
      const activeMess =
        me.messes.find((mess) => mess.id === activeMessId) ?? null;
      void AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(me));
      return createAuthenticatedState({ me, token, activeMess });
    } catch (error) {
      const tokenRejected =
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403);
      if (!cached || tokenRejected) {
        await AsyncStorage.multiRemove([
          TOKEN_KEY,
          AUTH_CACHE_KEY,
          ACTIVE_MESS_KEY,
        ]);
        return createSignedOutState();
      }
      return null;
    }
  },
  {
    condition: (_arg, { getState }) =>
      !getState().auth.initializationStarted,
  },
);

export const login = createAuthAsyncThunk<
  AuthSessionPayload,
  { email: string; password: string }
>("auth/login", async ({ email, password }) => {
  const { token } = await api.login(email, password);
  return loadSession(token);
});

export const loginWithGoogle = createAuthAsyncThunk<
  AuthSessionPayload,
  string
>("auth/loginWithGoogle", async (idToken) => {
  const { token } = await api.googleLogin(idToken);
  return loadSession(token);
});

export const signup = createAuthAsyncThunk<
  { pendingEmail: string },
  {
    email: string;
    name: string;
    password: string;
    mobileNumber: string;
  }
>("auth/signup", async ({ email, name, password, mobileNumber }) => {
  const { pendingEmail } = await api.signup(
    email,
    name,
    password,
    mobileNumber,
  );
  return { pendingEmail };
});

export const verifyOtp = createAuthAsyncThunk<
  AuthSessionPayload,
  { email: string; otp: string }
>("auth/verifyOtp", async ({ email, otp }) => {
  const { token } = await api.verifyOtp(email, otp);
  return loadSession(token);
});

export const resendOtp = createAuthAsyncThunk<void, string>(
  "auth/resendOtp",
  async (email) => {
    await api.resendOtp(email);
  },
);

export const logout = createAuthAsyncThunk<void, void>(
  "auth/logout",
  clearLocalSession,
);

export const deleteAccount = createAuthAsyncThunk<void, string>(
  "auth/deleteAccount",
  async (password, { getState }) => {
    const { token } = getState().auth;
    if (!token) throw new Error("Not authenticated");
    await api.deleteAccount(password, token);
    await clearOfflineQueue();
    await clearLocalSession();
  },
);

export const requestAccountDeletionOtp = createAuthAsyncThunk<void, void>(
  "auth/requestAccountDeletionOtp",
  async (_arg, { getState }) => {
    const { user } = getState().auth;
    if (!user) throw new Error("Not authenticated");
    await api.requestAccountDeletionOtp(user.email);
  },
);

export const deleteAccountWithOtp = createAuthAsyncThunk<void, string>(
  "auth/deleteAccountWithOtp",
  async (otp, { getState }) => {
    const { user } = getState().auth;
    if (!user) throw new Error("Not authenticated");
    await api.confirmAccountDeletionOtp(user.email, otp);
    await clearOfflineQueue();
    await clearLocalSession();
  },
);

export const createMess = createAuthAsyncThunk<
  {
    messes: ApiMessWithRole[];
    requests: ApiMyRequest[];
    activeMess: ApiMessWithRole | null;
  },
  string
>("auth/createMess", async (name, { getState }) => {
  const { token } = getState().auth;
  if (!token) throw new Error("Not authenticated");
  const { mess: newMess } = await api.createMess(name, token);
  const me = await api.me(token);
  return {
    messes: me.messes,
    requests: me.requests,
    activeMess: me.messes.find((mess) => mess.id === newMess.id) ?? null,
  };
});

export const joinMess = createAuthAsyncThunk<ApiMyRequest, string>(
  "auth/joinMess",
  async (messKey, { getState }) => {
    const { token } = getState().auth;
    if (!token) throw new Error("Not authenticated");
    const { pendingRequest } = await api.joinMess(messKey, token);
    return pendingRequest;
  },
);

export const retryJoin = createAuthAsyncThunk<ApiMyRequest, number>(
  "auth/retryJoin",
  async (requestId, { getState }) => {
    const { token } = getState().auth;
    if (!token) throw new Error("Not authenticated");
    const { request } = await api.retryJoin(requestId, token);
    return request;
  },
);

export const refreshMe = createAuthAsyncThunk<
  { me: MeAuthResponse; activeMess: ApiMessWithRole | null } | null,
  void
>("auth/refreshMe", async (_arg, { getState }) => {
  const { token, activeMess } = getState().auth;
  if (!token) return null;
  const me = await api.me(token);
  const refreshedActiveMess = activeMess
    ? (me.messes.find((mess) => mess.id === activeMess.id) ?? null)
    : null;
  void AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(me));
  return { me, activeMess: refreshedActiveMess };
});

export const updateProfileName = createAuthAsyncThunk<string, string>(
  "auth/updateProfileName",
  async (name, { getState }) => {
    const { token } = getState().auth;
    if (!token) throw new Error("Not authenticated");
    const result = await api.updateProfile(name, token);
    return result.name;
  },
);

export const updatePhone = createAuthAsyncThunk<
  string | null,
  string | null
>("auth/updatePhone", async (phone, { getState }) => {
  const { token } = getState().auth;
  if (!token) throw new Error("Not authenticated");
  const result = await api.updatePhone(phone, token);
  return result.mobileNumber;
});

export const updateMessName = createAuthAsyncThunk<string, string>(
  "auth/updateMessName",
  async (name, { getState }) => {
    const { token, activeMess } = getState().auth;
    if (!token || !activeMess) throw new Error("No active mess");
    const result = await api.updateMessName(name, token, activeMess.id);
    return result.name;
  },
);

const authAsyncThunks = [
  initializeAuth,
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
  updateProfileName,
  updatePhone,
  updateMessName,
] as const;

const applySession = (state: AuthState, payload: AuthSessionPayload) => {
  Object.assign(state, createAuthenticatedState(payload));
};

const clearAuth = (state: AuthState) => {
  Object.assign(state, createSignedOutState());
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(restoreAuthState, (_state, action) => action.payload)
      .addCase(setActiveMess, (state, action) => {
        state.activeMess = action.payload;
      })
      .addCase(patchUser, (state, action) => {
        if (state.user) Object.assign(state.user, action.payload);
      })
      .addCase(patchActiveMess, (state, action) => {
        if (!state.activeMess) return;
        Object.assign(state.activeMess, action.payload);
        const mess = state.messes.find(
          (candidate) => candidate.id === state.activeMess?.id,
        );
        if (mess) Object.assign(mess, action.payload);
      })
      .addCase(initializeAuth.pending, (state) => {
        state.initializationStarted = true;
        state.authLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) Object.assign(state, action.payload);
        state.authLoading = false;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.authLoading = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        applySession(state, action.payload);
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        applySession(state, action.payload);
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        applySession(state, action.payload);
      })
      .addCase(logout.fulfilled, clearAuth)
      .addCase(deleteAccount.fulfilled, clearAuth)
      .addCase(deleteAccountWithOtp.fulfilled, clearAuth)
      .addCase(createMess.fulfilled, (state, action) => {
        state.messes = action.payload.messes;
        state.requests = action.payload.requests;
        state.activeMess = action.payload.activeMess;
      })
      .addCase(joinMess.fulfilled, (state, action) => {
        state.requests = [
          ...state.requests.filter(
            (request) => request.messId !== action.payload.messId,
          ),
          action.payload,
        ];
      })
      .addCase(retryJoin.fulfilled, (state, action) => {
        state.requests = state.requests.map((request) =>
          request.id === action.payload.id ? action.payload : request,
        );
      })
      .addCase(refreshMe.fulfilled, (state, action) => {
        if (!action.payload) return;
        state.user = action.payload.me.user;
        state.messes = action.payload.me.messes;
        state.requests = action.payload.me.requests;
        state.activeMess = action.payload.activeMess;
      })
      .addCase(updateProfileName.fulfilled, (state, action) => {
        if (state.user) state.user.name = action.payload;
      })
      .addCase(updatePhone.fulfilled, (state, action) => {
        if (state.user) state.user.mobileNumber = action.payload;
      })
      .addCase(updateMessName.fulfilled, (state, action) => {
        if (!state.activeMess) return;
        state.activeMess.name = action.payload;
        const mess = state.messes.find(
          (candidate) => candidate.id === state.activeMess?.id,
        );
        if (mess) mess.name = action.payload;
      })
      .addMatcher(isPending(...authAsyncThunks), (state) => {
        state.requestStatus = "loading";
        state.requestError = null;
      })
      .addMatcher(isFulfilled(...authAsyncThunks), (state) => {
        state.requestStatus = "succeeded";
        state.requestError = null;
      })
      .addMatcher(isRejected(...authAsyncThunks), (state, action) => {
        state.requestStatus = "failed";
        state.requestError = action.error.message ?? "Request failed";
      });
  },
});

export const selectMess = (mess: ApiMessWithRole): AuthThunk => (dispatch) => {
  dispatch(setActiveMess(mess));
  void AsyncStorage.setItem(ACTIVE_MESS_KEY, mess.id.toString());
};

export const exitMess = (): AuthThunk => (dispatch) => {
  dispatch(setActiveMess(null));
  void AsyncStorage.removeItem(ACTIVE_MESS_KEY);
};

export const patchMess = (update: Partial<ApiMess>): AuthThunk => (dispatch) => {
  dispatch(patchActiveMess(update));
};

export const selectAuthState = (state: AuthRootState) => state.auth;
export const selectAuthUser = (state: AuthRootState) => state.auth.user;
export const selectAuthToken = (state: AuthRootState) => state.auth.token;
export const selectActiveMess = (state: AuthRootState) => state.auth.activeMess;
export const selectAuthLoading = (state: AuthRootState) =>
  state.auth.authLoading;
export const selectAuthRole = (state: AuthRootState) =>
  state.auth.activeMess?.role ?? null;
export const selectCurrentMess = (state: AuthRootState): ApiMess | null => {
  const mess = state.auth.activeMess;
  return mess
    ? { id: mess.id, name: mess.name, messKey: mess.messKey }
    : null;
};

export default authSlice.reducer;
