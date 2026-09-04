import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { ApiMessage } from "@/lib/api";
import {
  enterMessageConversation,
  leaveMessageConversation,
} from "@/lib/realtime";
import {
  useAppDispatch,
  useAppSelector,
  useAuth,
  useNetwork,
} from "@/redux/hooks";
import {
  apiActionFailed,
  offlineActionFailed,
} from "@/redux/slice/networkSlice";
import {
  loadMessages,
  markMessagesRead,
  selectMessagesState,
  sendMessage,
} from "@/redux/slice/messagesSlice";

const formatMessageTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const avatarThemes = [
  { background: "bg-violet-500", border: "border-violet-300" },
  { background: "bg-sky-500", border: "border-sky-300" },
  { background: "bg-amber-500", border: "border-amber-300" },
  { background: "bg-rose-500", border: "border-rose-300" },
  { background: "bg-indigo-500", border: "border-indigo-300" },
  { background: "bg-emerald-500", border: "border-emerald-300" },
] as const;

const MessageAvatar = ({ userId }: { userId: number }) => {
  const theme = avatarThemes[Math.abs(userId) % avatarThemes.length];
  return (
    <View
      className={`h-8 w-8 items-center justify-center rounded-xl border ${theme.background} ${theme.border}`}
    >
      <Feather name="user" size={15} color="#FFFFFF" />
    </View>
  );
};

const MessageBubble = ({
  message,
  own,
}: {
  message: ApiMessage;
  own: boolean;
}) => {
  const time = formatMessageTime(message.createdAt);

  return (
    <View
      className={`mb-3 flex-row items-end ${own ? "justify-end" : "justify-start"}`}
    >
      {!own ? (
        <View className="mr-2">
          <MessageAvatar userId={message.senderUserId} />
        </View>
      ) : null}
      <View
        className={`max-w-[76%] rounded-[22px] px-4 py-3 shadow-sm ${
          own
            ? "rounded-br-md border border-teal-500 bg-teal-600 shadow-teal-950/40"
            : "rounded-bl-md border border-slate-700 bg-slate-800 shadow-black/30"
        }`}
      >
        {!own ? (
          <View className="mb-1.5 flex-row items-center">
            <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <Text className="font-inter-semibold text-[11px] text-cyan-300">
              {message.senderName}
            </Text>
          </View>
        ) : null}
        <Text className="font-inter text-[14px] leading-5 text-white">
          {message.body}
        </Text>
        <View className="mt-1.5 flex-row items-center justify-end">
          <Feather
            name={own ? "check" : "clock"}
            size={11}
            color={own ? "#CCFBF1" : "#94A3B8"}
          />
          <Text
            className={`ml-1 font-inter text-[10px] ${
              own ? "text-teal-100" : "text-slate-400"
            }`}
          >
            {time}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function MessagesRoute() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { mess, token, user } = useAuth();
  const { isOnline } = useNetwork();
  const {
    messages,
    nextCursor,
    hasMore,
    loadStatus,
    loadMoreStatus,
    sendStatus,
  } = useAppSelector(selectMessagesState);
  const [draft, setDraft] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [canLoadOlder, setCanLoadOlder] = useState(false);

  useEffect(() => {
    if (token && mess) void dispatch(loadMessages(undefined));
  }, [dispatch, mess?.id, token]);

  useEffect(() => {
    setCanLoadOlder(false);
  }, [mess?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!mess) return undefined;
      enterMessageConversation(mess.id);
      if (token && isOnline) void dispatch(markMessagesRead());
      return () => leaveMessageConversation(mess.id);
    }, [dispatch, isOnline, mess?.id, token]),
  );

  const refreshMessages = useCallback(async () => {
    if (!token || !mess) return;
    if (!isOnline) {
      dispatch(offlineActionFailed("refresh"));
      return;
    }
    setRefreshing(true);
    try {
      await dispatch(loadMessages(undefined)).unwrap();
    } catch (error) {
      dispatch(
        apiActionFailed(
          error instanceof Error
            ? error.message
            : "Could not refresh messages.",
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, isOnline, mess, token]);

  const loadOlderMessages = () => {
    if (
      !canLoadOlder ||
      !hasMore ||
      loadMoreStatus === "loading" ||
      !nextCursor
    )
      return;
    setCanLoadOlder(false);
    void dispatch(
      loadMessages({
        beforeCreatedAt: nextCursor.createdAt,
        beforeId: nextCursor.id,
      }),
    );
  };

  const submitMessage = async () => {
    const body = draft.trim();
    if (!body || sendStatus === "loading") return;
    if (!isOnline) {
      dispatch(offlineActionFailed("entry"));
      return;
    }
    setDraft("");
    try {
      await dispatch(sendMessage(body)).unwrap();
    } catch (error) {
      setDraft(body);
      dispatch(
        apiActionFailed(
          error instanceof Error ? error.message : "Could not send message.",
        ),
      );
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0B1220]"
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View className="pt-safe flex-1 bg-[#0B1220]">
        <StatusBar style="light" backgroundColor="#0F172A" />
        <View className="flex-row items-center border-b border-slate-700 bg-[#0F172A] px-4 pb-4 pt-2">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-xl border border-slate-600 bg-slate-800"
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <Feather name="arrow-left" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="ml-3 flex-1">
            <Text className="font-inter-bold text-[18px] text-white">
              Messages
            </Text>
            <Text className="mt-0.5 font-inter text-[11px] text-slate-400">
              {mess?.name ?? "Mess group chat"} · Group conversation
            </Text>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
            <Feather name="users" size={17} color="#67E8F9" />
          </View>
        </View>
        {loadStatus === "loading" && messages.length === 0 ? (
          <View className="flex-1 items-center justify-center bg-[#0B1220]">
            <ActivityIndicator size="large" color="#2DD4BF" />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            className="flex-1"
            contentContainerClassName="px-4 py-5"
            keyExtractor={(message) => String(message.id)}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                own={item.senderUserId === user?.id}
              />
            )}
            onEndReached={loadOlderMessages}
            onEndReachedThreshold={0.25}
            onScrollBeginDrag={() => setCanLoadOlder(true)}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            ListFooterComponent={
              loadMoreStatus === "loading" ? (
                <View className="items-center py-3">
                  <ActivityIndicator size="small" color="#2DD4BF" />
                  <Text className="mt-1 font-inter text-[10px] text-slate-500">
                    Loading earlier messages...
                  </Text>
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refreshMessages()}
                tintColor="#2DD4BF"
              />
            }
            ListEmptyComponent={
              <View className="items-center px-8 py-24">
                <View className="h-16 w-16 items-center justify-center rounded-3xl border border-slate-700 bg-slate-800">
                  <Feather name="message-circle" size={29} color="#67E8F9" />
                </View>
                <Text className="mt-4 font-inter-bold text-lg text-white">
                  Start the conversation
                </Text>
                <Text className="mt-1 text-center font-inter text-sm text-slate-400">
                  Send a message to everyone in your mess.
                </Text>
              </View>
            }
          />
        )}
        <View className="pb-safe-offset-2 border-t border-slate-700 bg-[#0F172A] px-3 pt-2">
          <View className="flex-row items-end rounded-2xl border border-slate-600 bg-slate-800 px-3 py-1.5">
            <TextInput
              className="max-h-24 min-h-10 flex-1 px-1 py-2 font-inter text-[14px] text-white"
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message..."
              placeholderTextColor="#64748B"
              multiline
              blurOnSubmit={false}
              maxLength={2000}
            />
            <TouchableOpacity
              className="ml-2 h-10 w-10 items-center justify-center rounded-xl bg-teal-500"
              onPress={() => void submitMessage()}
              disabled={!draft.trim() || sendStatus === "loading"}
              accessibilityLabel="Send message"
            >
              {sendStatus === "loading" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="send" size={17} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
