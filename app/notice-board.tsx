import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { type ApiNotice } from "@/lib/api";
import { useAppDispatch, useAppSelector, useAuth } from "@/redux/hooks";
import {
  createNotice as createNoticeAction,
  deleteNotice as deleteNoticeAction,
  loadNotices as loadNoticesAction,
  reorderNotices as reorderNoticesAction,
  selectNoticesState,
  setNoticeOrder,
  updateNotice as updateNoticeAction,
} from "@/redux/slice/noticesSlice";

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
  return accents[color.toUpperCase()] ?? accents["#F0FDF"]!;
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
  const dispatch = useAppDispatch();
  const { mess, role, token } = useAuth();
  const isAdmin = role === "admin";
  const { notices, loadStatus, mutationStatus, reorderStatus } =
    useAppSelector(selectNoticesState);
  const loading = loadStatus === "loading";
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
  const filteredNotices = notices.filter((notice) => {
    const query = searchQuery.trim().toLowerCase();
    return !query || `${notice.title} ${notice.body}`.toLowerCase().includes(query);
  });
  useEffect(() => {
    if (token && mess) void dispatch(loadNoticesAction());
  }, [dispatch, mess?.id, token]);

  const refreshNotices = async () => {
    if (!token || !mess) return;
    setRefreshing(true);
    try {
      await dispatch(loadNoticesAction()).unwrap();
      setRefreshToastVisible(true);
      setTimeout(() => setRefreshToastVisible(false), 2200);
    } catch (error) {
      Alert.alert(
        "Could not refresh notices",
        error instanceof Error ? error.message : "Please try again.",
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
      Alert.alert(
        "Could not save notice",
        error instanceof Error ? error.message : "Please try again.",
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
            Alert.alert(
              "Could not delete notice",
              error instanceof Error ? error.message : "Please try again.",
            );
          }
        },
      },
    ]);
  };

  const persistNoticeOrder = async (next: ApiNotice[], previous: ApiNotice[]) => {
    if (!token || !mess) return;
    try {
      await dispatch(
        reorderNoticesAction(next.map((notice) => notice.id)),
      ).unwrap();
    } catch (error) {
      dispatch(setNoticeOrder(previous));
      Alert.alert(
        "Could not reorder notices",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  return (
    <View className="pt-safe flex-1 bg-[#F4F8FC]">
      <StatusBar style="light" backgroundColor="#075F5B" />
      <View className="flex-row items-center bg-[#075F5B] px-4 pb-4 pt-2">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/15"
          onPress={() => router.back()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-[18px] text-white">
            Notice Board
          </Text>
          <Text className="mt-0.5 font-inter text-[11px] text-teal-100">
            Mess announcements
          </Text>
        </View>
        {isAdmin ? (
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-xl bg-white/15"
            onPress={() => {
              if (formOpen) resetForm();
              else setFormOpen(true);
            }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={formOpen ? "Close notice form" : "Create notice"}
          >
            <Feather name={formOpen ? "x" : "plus"} size={21} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="flex-1 px-4 pt-4">
        {isAdmin && formOpen ? (
          <Modal visible={formOpen} transparent animationType="fade" onRequestClose={resetForm}>
            <Pressable className="flex-1 items-center justify-center bg-slate-900/35 px-6" onPress={resetForm}>
              <Pressable className="w-full max-w-[380px] rounded-2xl border border-teal-200 bg-white p-4 shadow-sm shadow-slate-400/15" onPress={(event) => event.stopPropagation()}>
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="font-inter-bold text-base text-slate-900">
                    {editingId ? "Edit Notice" : "Create Notice"}
                  </Text>
                  <TouchableOpacity onPress={resetForm} accessibilityLabel="Close notice form">
                    <Feather name="x" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
            <TextInput
              className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-sm text-slate-900"
              value={title}
              onChangeText={setTitle}
              placeholder="Notice title"
              placeholderTextColor="#94A3B8"
              maxLength={160}
            />
            <TextInput
              className="mt-2 min-h-[110px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-sm text-slate-900"
              value={body}
              onChangeText={setBody}
              placeholder="Write your notice..."
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
            <Text className="mt-3 font-inter-semibold text-xs text-slate-600">
              Notice color
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {NOTICE_COLORS.map((noticeColor) => (
                <TouchableOpacity
                  key={noticeColor}
                  className={`h-9 w-9 items-center justify-center rounded-full border-2 ${color === noticeColor ? "border-slate-700" : "border-transparent"}`}
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
            <View className="mt-3 flex-row justify-end gap-2">
              <TouchableOpacity
                className="rounded-xl border border-slate-200 px-4 py-2.5"
                onPress={resetForm}
                disabled={saving}
              >
                <Text className="font-inter-semibold text-sm text-slate-600">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-xl bg-teal-700 px-4 py-2.5"
                onPress={() => void saveNotice()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="font-inter-semibold text-sm text-white">
                    {editingId ? "Update" : "Publish"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}

        <View className="mb-4">
          <View className="h-14 flex-row items-center rounded-2xl border border-slate-100 bg-white px-4 shadow-sm shadow-slate-300/20">
            <Feather name="search" size={22} color="#64748B" />
            <TextInput
              className="ml-3 min-w-0 flex-1 font-inter text-[15px] text-slate-700"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search notices..."
              placeholderTextColor="#64748B"
              returnKeyType="search"
            />
            {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery("")} accessibilityLabel="Clear notice search"><Feather name="x" size={18} color="#64748B" /></TouchableOpacity> : null}
          </View>
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#0F766E" />
          </View>
        ) : filteredNotices.length === 0 ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-white px-6 py-16">
            <Feather name="clipboard" size={30} color="#B45309" />
            <Text className="mt-3 font-inter-bold text-base text-slate-900">
              {notices.length === 0 ? "No notices yet" : "No matching notices"}
            </Text>
            <Text className="mt-1 text-center font-inter text-sm text-slate-500">
              {notices.length === 0 && isAdmin
                ? "Create the first notice for your mess."
                : notices.length === 0
                  ? "New mess announcements will appear here."
                  : "Try a different search term."}
            </Text>
          </View>
        ) : (
          <DraggableFlatList
            data={filteredNotices}
            keyExtractor={(notice) => String(notice.id)}
            onDragEnd={({ data }) => {
              if (searchQuery.trim()) return;
              const previous = notices;
              dispatch(setNoticeOrder(data));
              void persistNoticeOrder(data, previous);
            }}
            activationDistance={8}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32, gap: 12 }}
            refreshing={refreshing}
            onRefresh={() => void refreshNotices()}
            renderItem={({ item: notice, drag, isActive }: RenderItemParams<ApiNotice>) => (
              <Pressable
                className={`overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-300/25 ${isActive ? "border-teal-400 opacity-80" : ""}`}
                onPress={() => {
                  if (isAdmin) editNotice(notice);
                }}
                disabled={!isAdmin}
                accessibilityLabel={`Edit notice ${notice.title}`}
                style={{
                  borderColor: isActive ? "#2DD4BF" : "#E2E8F0",
                  position: "relative",
                }}
              >
                <View className="flex-row items-center">
                  <View className="mr-3 h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: getNoticeAccent(notice.color || NOTICE_COLORS[0]).background }}>
                    <Feather name="bell" size={20} color={getNoticeAccent(notice.color || NOTICE_COLORS[0]).icon} />
                  </View>
                  <View className="mr-3 h-9 min-w-10 items-center justify-center rounded-xl px-2" style={{ backgroundColor: getNoticeSurfaceColor(notice.color || NOTICE_COLORS[0]) }}>
                    <Text className="font-inter-bold text-xs text-amber-700">
                      #{notice.serialNo}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-inter-bold text-base text-slate-900">
                      #{notice.serialNo} {notice.title}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Feather name="calendar" size={12} color="#64748B" />
                      <Text className="font-inter text-[11px] text-slate-400">
                        {formatNoticeDate(notice.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
                {isAdmin ? (
                  <View
                    className="absolute right-2 top-2 flex-row items-center gap-1"
                    pointerEvents="box-none"
                  >
                    <TouchableOpacity
                      className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100"
                      onPress={(event) => {
                        event.stopPropagation();
                        editNotice(notice);
                      }}
                      disabled={reordering}
                      accessibilityLabel="Edit notice"
                    >
                      <Feather name="edit-2" size={14} color="#475569" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="h-8 w-8 items-center justify-center rounded-lg bg-red-50"
                      onPress={(event) => {
                        event.stopPropagation();
                        removeNotice(notice);
                      }}
                      disabled={reordering}
                      accessibilityLabel="Delete notice"
                    >
                      <Feather name="trash-2" size={14} color="#DC2626" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="h-8 w-8 items-center justify-center rounded-lg bg-teal-50"
                      onLongPress={(event) => {
                        event.stopPropagation();
                        drag();
                      }}
                      delayLongPress={150}
                      disabled={reordering}
                      accessibilityLabel="Drag to reorder notice"
                    >
                      <Feather name="move" size={18} color="#475569" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <Text className="mt-3 font-inter text-[15px] leading-6 text-slate-700">
                  {notice.body}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
      {refreshToastVisible ? (
        <View pointerEvents="none" className="absolute bottom-8 left-0 right-0 z-50 items-center">
          <View className="flex-row items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 shadow-md shadow-emerald-900/15">
            <Feather name="check-circle" size={15} color="#059669" />
            <Text className="font-inter-semibold text-xs text-emerald-700">
              Notices refreshed successfully
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
