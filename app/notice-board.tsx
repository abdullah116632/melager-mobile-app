import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { type ApiNotice } from "@/lib/api";
import {
  useAppDispatch,
  useAppSelector,
  useAuth,
  useNetwork,
} from "@/redux/hooks";
import {
  createNotice as createNoticeAction,
  deleteNotice as deleteNoticeAction,
  loadNotices as loadNoticesAction,
  markNoticesRead,
  reorderNotices as reorderNoticesAction,
  selectNoticesState,
  setNoticeOrder,
  updateNotice as updateNoticeAction,
} from "@/redux/slice/noticesSlice";
import {
  apiActionFailed,
  offlineActionFailed,
} from "@/redux/slice/networkSlice";

const formatNoticeDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getNoticeSurfaceColor = (color: string) =>
  color.toUpperCase() === "#FFFFFF" ? "#F0FDFA" : color;

const getNoticeAccent = (color: string) => {
  const accents: Record<string, { background: string; icon: string }> = {
    "#FEF3C7": { background: "#FBBF24", icon: "#FFFFFF" },
    "#DBEAFE": { background: "#60A5FA", icon: "#FFFFFF" },
    "#DCFCE7": { background: "#65A30D", icon: "#FFFFFF" },
    "#FCE7F3": { background: "#F472B6", icon: "#FFFFFF" },
    "#EDE9FE": { background: "#A855F7", icon: "#FFFFFF" },
    "#FFEDD5": { background: "#FB923C", icon: "#FFFFFF" },
    "#F0FDFA": { background: "#14B8A6", icon: "#FFFFFF" },
  };
  return accents[color.toUpperCase()] ?? accents["#F0FDFA"]!;
};

const NOTICE_COLORS = [
  "#F0FDFA",
  "#FEF3C7",
  "#DBEAFE",
  "#DCFCE7",
  "#FCE7F3",
  "#EDE9FE",
  "#FFEDD5",
];

export default function NoticeBoardRoute() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const source = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const goBack = () =>
    router.replace(
      source === "manager" ? "/(tabs)/manager" : "/(tabs)/dashboard",
    );
  const dispatch = useAppDispatch();
  const { mess, role, token } = useAuth();
  const { isOnline, isCheckingNetwork } = useNetwork();
  const isAdmin = role === "admin";
  const {
    notices,
    loadStatus,
    mutationStatus,
    reorderStatus,
    pendingCount,
    error: noticeError,
  } = useAppSelector(selectNoticesState);
  const loading = loadStatus === "loading" && notices.length === 0;
  const saving = mutationStatus === "loading";
  const reordering = reorderStatus === "loading";
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState(NOTICE_COLORS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToastVisible, setRefreshToastVisible] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredNotices = notices.filter((notice) => {
    return (
      !normalizedSearchQuery ||
      `${notice.title} ${notice.body}`
        .toLowerCase()
        .includes(normalizedSearchQuery)
    );
  });
  useEffect(() => {
    if (!token || !mess) return;
    void dispatch(loadNoticesAction({}))
      .unwrap()
      .catch((error) => {
        if (isCheckingNetwork) return;
        dispatch(
          apiActionFailed(
            isOnline
              ? error instanceof Error
                ? error.message
                : "Could not load notices."
              : "Failed to load notices because you are offline",
          ),
        );
      });
  }, [dispatch, isCheckingNetwork, isOnline, mess?.id, token]);

  useFocusEffect(
    useCallback(() => {
      if (token && mess) void dispatch(markNoticesRead());
      return undefined;
    }, [dispatch, mess?.id, token]),
  );

  const refreshNotices = async () => {
    if (!token || !mess) return;
    setRefreshToastVisible(false);
    setRefreshError(null);
    if (!isOnline) {
      setRefreshError(
        "Refresh failed. Check your internet connection and try again.",
      );
      dispatch(offlineActionFailed("refresh"));
      return;
    }
    setRefreshing(true);
    try {
      const result = await dispatch(
        loadNoticesAction({ force: true }),
      ).unwrap();
      if (result.syncError) {
        setRefreshError(result.syncError);
        return;
      }
      setRefreshError(null);
      setRefreshToastVisible(true);
      setTimeout(() => setRefreshToastVisible(false), 2200);
    } catch (error) {
      setRefreshError(
        error instanceof Error
          ? `Refresh failed. ${error.message}`
          : "Refresh failed. Please try again.",
      );
      dispatch(
        apiActionFailed(
          error instanceof Error ? error.message : "Could not refresh notices.",
        ),
      );
    } finally {
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setColor(NOTICE_COLORS[0]);
    setEditingId(null);
    setFormOpen(false);
  };

  const saveNotice = async () => {
    if (!token || !mess || !title.trim() || !body.trim()) {
      Alert.alert("Incomplete notice", "Please enter a title and notice text.");
      return;
    }
    try {
      if (editingId) {
        await dispatch(
          updateNoticeAction({
            id: editingId,
            title: title.trim(),
            body: body.trim(),
            color,
          }),
        ).unwrap();
      } else {
        await dispatch(
          createNoticeAction({
            title: title.trim(),
            body: body.trim(),
            color,
          }),
        ).unwrap();
      }
      resetForm();
    } catch (error) {
      dispatch(
        apiActionFailed(
          error instanceof Error ? error.message : "Could not save notice.",
        ),
      );
    }
  };

  const editNotice = (notice: ApiNotice) => {
    setEditingId(notice.id);
    setTitle(notice.title);
    setBody(notice.body);
    setColor(notice.color || NOTICE_COLORS[0]);
    setFormOpen(true);
  };

  const removeNotice = (notice: ApiNotice) => {
    Alert.alert("Delete notice", `Delete notice #${notice.serialNo}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!token || !mess) return;
          try {
            await dispatch(deleteNoticeAction(notice.id)).unwrap();
          } catch (error) {
            dispatch(
              apiActionFailed(
                error instanceof Error
                  ? error.message
                  : "Could not delete notice.",
              ),
            );
          }
        },
      },
    ]);
  };

  const persistNoticeOrder = async (
    next: ApiNotice[],
    previous: ApiNotice[],
  ) => {
    if (!token || !mess) return;
    try {
      await dispatch(reorderNoticesAction(next)).unwrap();
    } catch (error) {
      dispatch(setNoticeOrder(previous));
      dispatch(
        apiActionFailed(
          error instanceof Error ? error.message : "Could not reorder notices.",
        ),
      );
    }
  };

  return (
    <View className="pt-safe flex-1 bg-[#F6F8FB]">
      <StatusBar style="light" backgroundColor="#075E59" />
      <View className="overflow-hidden bg-[#075E59] px-4 pb-7 pt-2">
        <View className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/5" />
        <View className="absolute -bottom-16 left-16 h-32 w-32 rounded-full bg-teal-300/10" />
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10"
            onPress={goBack}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Feather name="arrow-left" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text className="font-inter-bold text-[20px] text-white">
                Notice Board
              </Text>
              {notices.length > 0 ? (
                <View className="ml-2 rounded-full bg-white/15 px-2 py-0.5">
                  <Text className="font-inter-semibold text-[10px] text-teal-50">
                    {notices.length}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-0.5 font-inter text-[11px] text-teal-100/90">
              Updates and announcements from your mess
            </Text>
          </View>
          {isAdmin ? (
            <TouchableOpacity
              className="h-11 flex-row items-center rounded-2xl bg-white px-3.5 shadow-sm"
              onPress={() => setFormOpen(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create notice"
            >
              <Feather name="plus" size={17} color="#0F766E" />
              <Text className="ml-1.5 font-inter-bold text-xs text-teal-700">
                New
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {refreshError ? (
        <View
          className="flex-row items-center border-b border-red-200 bg-red-50 px-4 py-2"
          accessibilityRole="alert"
        >
          <Feather name="alert-circle" size={14} color="#DC2626" />
          <Text className="ml-2 min-w-0 flex-1 font-inter-medium text-[11px] text-red-700">
            {refreshError}
          </Text>
          <TouchableOpacity
            className="ml-2 h-6 w-6 items-center justify-center rounded-full"
            onPress={() => setRefreshError(null)}
            accessibilityLabel="Dismiss refresh error"
          >
            <Feather name="x" size={14} color="#B91C1C" />
          </TouchableOpacity>
        </View>
      ) : null}
      {!refreshError && noticeError ? (
        <View className="flex-row items-center border-b border-amber-200 bg-amber-50 px-4 py-2">
          <Feather name="info" size={14} color="#B45309" />
          <Text className="ml-2 min-w-0 flex-1 font-inter-medium text-[11px] text-amber-800">
            {noticeError}
          </Text>
        </View>
      ) : null}
      {!refreshError && !noticeError && pendingCount > 0 ? (
        <View className="border-b border-sky-200 bg-sky-50 px-4 py-2">
          <Text className="font-inter-medium text-[11px] text-sky-800">
            Saved locally · {pendingCount} change
            {pendingCount === 1 ? "" : "s"} waiting to sync.
          </Text>
        </View>
      ) : null}

      <View
        className={`${refreshError || noticeError || pendingCount > 0 ? "pt-3" : "-mt-3"} flex-1 px-4`}
      >
        {isAdmin && formOpen ? (
          <Modal
            visible={formOpen}
            transparent
            animationType="fade"
            onRequestClose={resetForm}
          >
            <Pressable
              className="flex-1 items-center justify-center bg-slate-950/50 px-5"
              onPress={resetForm}
            >
              <Pressable
                className="w-full max-w-[400px] rounded-[28px] bg-white p-5 shadow-lg shadow-slate-950/20"
                onPress={(event) => event.stopPropagation()}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 flex-row items-center">
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-teal-50">
                      {editingId ? (
                        <Feather name="edit-3" size={19} color="#0F766E" />
                      ) : (
                        <MaterialCommunityIcons
                          name="bullhorn-outline"
                          size={21}
                          color="#0F766E"
                        />
                      )}
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="font-inter-bold text-lg text-slate-900">
                        {editingId ? "Edit notice" : "Create a notice"}
                      </Text>
                      <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
                        {editingId
                          ? "Update the announcement details"
                          : "Share an update with every member"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100"
                    onPress={resetForm}
                    accessibilityLabel="Close notice form"
                  >
                    <Feather name="x" size={18} color="#475569" />
                  </TouchableOpacity>
                </View>
                <Text className="mb-1.5 mt-5 font-inter-semibold text-xs text-slate-700">
                  Title
                </Text>
                <TextInput
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-inter text-sm text-slate-900"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What is this announcement about?"
                  placeholderTextColor="#94A3B8"
                  maxLength={160}
                />
                <View className="mb-1.5 mt-3 flex-row items-center justify-between">
                  <Text className="font-inter-semibold text-xs text-slate-700">
                    Message
                  </Text>
                  <Text className="font-inter text-[10px] text-slate-400">
                    {body.length}/5000
                  </Text>
                </View>
                <TextInput
                  className="min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-inter text-sm leading-5 text-slate-900"
                  value={body}
                  onChangeText={setBody}
                  placeholder="Write your notice..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                  maxLength={5000}
                />
                <Text className="mt-4 font-inter-semibold text-xs text-slate-700">
                  Card color
                </Text>
                <View className="mt-2.5 flex-row flex-wrap gap-2.5">
                  {NOTICE_COLORS.map((noticeColor) => (
                    <TouchableOpacity
                      key={noticeColor}
                      className={`h-9 w-9 items-center justify-center rounded-xl border-2 ${color === noticeColor ? "border-teal-700" : "border-slate-100"}`}
                      style={{ backgroundColor: noticeColor }}
                      onPress={() => setColor(noticeColor)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: color === noticeColor }}
                      accessibilityLabel={`Select notice color ${noticeColor}`}
                    >
                      {color === noticeColor ? (
                        <Feather name="check" size={16} color="#334155" />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
                <View className="mt-5 flex-row gap-2.5">
                  <TouchableOpacity
                    className="h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white"
                    onPress={resetForm}
                    disabled={saving}
                  >
                    <Text className="font-inter-semibold text-sm text-slate-600">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="h-12 flex-[1.25] flex-row items-center justify-center rounded-2xl bg-teal-700"
                    onPress={() => void saveNotice()}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather
                          name={editingId ? "check" : "send"}
                          size={15}
                          color="#FFFFFF"
                        />
                        <Text className="ml-2 font-inter-semibold text-sm text-white">
                          {editingId ? "Save changes" : "Publish"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}

        <DraggableFlatList
          containerStyle={{ flex: 1 }}
          style={{ flex: 1 }}
          alwaysBounceVertical
          data={loading ? [] : filteredNotices}
          keyExtractor={(notice) => String(notice.id)}
          onDragEnd={({ data }) => {
            if (searchQuery.trim()) return;
            const previous = notices;
            dispatch(setNoticeOrder(data));
            void persistNoticeOrder(data, previous);
          }}
          activationDistance={8}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshNotices()}
              tintColor="#0e7871"
              colors={["#0e7871"]}
            />
          }
          ListHeaderComponent={
            <>
              <View className="mb-4 rounded-[20px] border border-slate-100 bg-white p-1.5 shadow-sm shadow-slate-300/30">
                <View className="h-12 flex-row items-center rounded-2xl bg-slate-50 px-3.5">
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-white">
                    <Feather name="search" size={17} color="#64748B" />
                  </View>
                  <TextInput
                    className="ml-2.5 min-w-0 flex-1 font-inter text-[14px] text-slate-700"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search notices..."
                    placeholderTextColor="#64748B"
                    returnKeyType="search"
                  />
                  {searchQuery ? (
                    <TouchableOpacity
                      className="h-8 w-8 items-center justify-center rounded-full bg-slate-200/70"
                      onPress={() => setSearchQuery("")}
                      accessibilityLabel="Clear notice search"
                    >
                      <Feather name="x" size={15} color="#64748B" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              {!loading && notices.length > 0 ? (
                <View className="mb-3 flex-row items-center justify-between px-1">
                  <Text className="font-inter-bold text-sm text-slate-800">
                    {normalizedSearchQuery
                      ? "Search results"
                      : "Latest notices"}
                  </Text>
                  <Text className="font-inter text-[11px] text-slate-500">
                    {filteredNotices.length}{" "}
                    {filteredNotices.length === 1 ? "notice" : "notices"}
                  </Text>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            loading ? (
              <View className="items-center py-20">
                <ActivityIndicator size="large" color="#0F766E" />
                <Text className="mt-3 font-inter text-xs text-slate-500">
                  Loading announcements...
                </Text>
              </View>
            ) : (
              <View className="items-center rounded-[24px] border border-slate-100 bg-white px-7 py-14 shadow-sm shadow-slate-200/40">
                <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-amber-50">
                  {notices.length === 0 ? (
                    <MaterialCommunityIcons
                      name="bullhorn-outline"
                      size={30}
                      color="#B45309"
                    />
                  ) : (
                    <Feather name="search" size={28} color="#B45309" />
                  )}
                </View>
                <Text className="mt-4 font-inter-bold text-lg text-slate-900">
                  {notices.length === 0
                    ? "No notices yet"
                    : "No matching notices"}
                </Text>
                <Text className="mt-1.5 max-w-[260px] text-center font-inter text-[13px] leading-5 text-slate-500">
                  {notices.length === 0 && isAdmin
                    ? "Create the first notice for your mess."
                    : notices.length === 0
                      ? "New mess announcements will appear here."
                      : "Try a different search term."}
                </Text>
                {notices.length === 0 && isAdmin ? (
                  <TouchableOpacity
                    className="mt-5 flex-row items-center rounded-2xl bg-teal-700 px-5 py-3"
                    onPress={() => setFormOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={16} color="#FFFFFF" />
                    <Text className="ml-2 font-inter-semibold text-sm text-white">
                      Create first notice
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )
          }
          renderItem={({
            item: notice,
            drag,
            isActive,
          }: RenderItemParams<ApiNotice>) => (
            <View
              className={`mb-3.5 overflow-hidden rounded-[18px] border ${isActive ? "opacity-90" : ""}`}
              style={{
                backgroundColor: getNoticeSurfaceColor(
                  notice.color || NOTICE_COLORS[0],
                ),
                borderColor: isActive
                  ? "#0F766E"
                  : getNoticeAccent(notice.color || NOTICE_COLORS[0])
                      .background,
                shadowColor: "#94A3B8",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: isActive ? 6 : 3,
              }}
            >
              <View className="flex-row items-center gap-2 px-4 py-3">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/80">
                  <MaterialCommunityIcons
                    name="bullhorn-outline"
                    size={19}
                    color={
                      getNoticeAccent(notice.color || NOTICE_COLORS[0])
                        .background
                    }
                  />
                </View>
                <Text className="min-w-0 flex-1 font-inter-semibold text-sm text-slate-800">
                  Notice #{String(notice.serialNo).padStart(2, "0")}
                </Text>
                <View className="flex-row items-center">
                  <Feather name="calendar" size={12} color="#64748B" />
                  <Text className="ml-1.5 font-inter text-[11px] text-slate-500">
                    {formatNoticeDate(notice.createdAt)}
                  </Text>
                </View>
              </View>

              <View className="px-2 pb-2">
                <View className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <Text className="font-inter-bold text-[15px] leading-5 text-slate-900">
                    {notice.title}
                  </Text>
                  <View className="my-2.5 h-px bg-slate-200/80" />
                  <Text className="font-inter text-[13px] leading-5 text-slate-600">
                    {notice.body}
                  </Text>
                </View>
              </View>

              {isAdmin ? (
                <View className="flex-row items-center px-2 pb-2">
                  <TouchableOpacity
                    className="h-9 flex-1 flex-row items-center justify-center rounded-xl bg-white/70 px-2.5"
                    onPress={(event) => {
                      event.stopPropagation();
                      editNotice(notice);
                    }}
                    disabled={reordering}
                    accessibilityLabel="Edit notice"
                  >
                    <Feather name="edit-2" size={14} color="#475569" />
                    <Text className="ml-1.5 font-inter-semibold text-[11px] text-slate-600">
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="ml-2 h-9 flex-1 flex-row items-center justify-center rounded-xl bg-white/70 px-2.5"
                    onPress={(event) => {
                      event.stopPropagation();
                      removeNotice(notice);
                    }}
                    disabled={reordering}
                    accessibilityLabel="Delete notice"
                  >
                    <Feather name="trash-2" size={14} color="#DC2626" />
                    <Text className="ml-1.5 font-inter-semibold text-[11px] text-red-600">
                      Delete
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="ml-2 h-9 flex-1 flex-row items-center justify-center rounded-xl bg-white/70 px-2.5"
                    onLongPress={(event) => {
                      event.stopPropagation();
                      drag();
                    }}
                    delayLongPress={150}
                    disabled={reordering || Boolean(normalizedSearchQuery)}
                    accessibilityLabel="Drag to reorder notice"
                  >
                    <Feather
                      name="move"
                      size={15}
                      color={normalizedSearchQuery ? "#CBD5E1" : "#0F766E"}
                    />
                    <Text
                      className={`ml-1.5 font-inter-semibold text-[11px] ${normalizedSearchQuery ? "text-slate-300" : "text-teal-700"}`}
                    >
                      Move
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        />
      </View>
      {refreshToastVisible ? (
        <View
          pointerEvents="none"
          className="absolute bottom-8 left-0 right-0 z-50 items-center"
        >
          <View className="flex-row items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 shadow-md shadow-emerald-900/15">
            <Feather name="check-circle" size={15} color="#059669" />
            <Text className="font-inter-semibold text-xs text-emerald-700">
              Refresh successful
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
