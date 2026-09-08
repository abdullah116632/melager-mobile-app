import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { MessageReactionKind } from "@/lib/api";
import type { MessageItem } from "@/offline/features/messages/MessageRepository";
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
import { apiActionFailed } from "@/redux/slice/networkSlice";
import {
  loadMessages,
  markMessagesRead,
  reactToMessage,
  selectMessagesState,
  sendMessage,
} from "@/redux/slice/messagesSlice";

const startOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

const formatMessageStamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const now = new Date();
  const dayGap = Math.round(
    (startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000),
  );
  if (dayGap === 0) return `Today ${time}`;
  if (dayGap === 1) return `Yesterday ${time}`;
  const day = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
  return `${day} ${time}`;
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

const REACTION_CHOICES: { kind: MessageReactionKind; emoji: string }[] = [
  { kind: "like", emoji: "👍" },
  { kind: "love", emoji: "❤️" },
  { kind: "haha", emoji: "😂" },
  { kind: "sad", emoji: "😢" },
  { kind: "angry", emoji: "😠" },
  { kind: "dislike", emoji: "👎" },
];

const reactionEmoji = (kind: MessageReactionKind) =>
  REACTION_CHOICES.find((choice) => choice.kind === kind)?.emoji ?? "";

const MessageBubble = ({
  message,
  own,
  isOnline,
  myUserId,
  onOpenReactions,
}: {
  message: MessageItem;
  own: boolean;
  isOnline: boolean;
  myUserId?: number;
  onOpenReactions: (message: MessageItem) => void;
}) => {
  const stamp = formatMessageStamp(message.createdAt);
  // A server id is proof the message landed, so it decides delivery rather
  // than the status flag, which depends on an acknowledgement event that a
  // scope guard or a missed listener can drop. Until then it is still queued
  // in the outbox, so it is pending rather than failed.
  const undelivered = own && message.serverId === null;
  // Offline it is queued for later; online it is on its way out right now.
  const deliveryLabel = undelivered
    ? isOnline
      ? "Sending"
      : "Pending"
    : stamp;
  // Reactions are keyed by the server id, so a message still in the outbox
  // cannot carry one yet.
  const canReact = message.serverId !== null;
  const counts = REACTION_CHOICES.map((choice) => ({
    ...choice,
    count: message.reactions.filter(
      (entry) => entry.reaction === choice.kind,
    ).length,
  })).filter((entry) => entry.count > 0);
  const mine = message.reactions.find((entry) => entry.userId === myUserId);

  const reactionButton = canReact ? (
    <TouchableOpacity
      className="mx-1 h-7 w-7 items-center justify-center rounded-full bg-slate-800/70"
      onPress={() => onOpenReactions(message)}
      accessibilityRole="button"
      accessibilityLabel="React to message"
    >
      {mine ? (
        <Text className="text-[13px]">{reactionEmoji(mine.reaction)}</Text>
      ) : (
        <MaterialCommunityIcons
          name="emoticon-happy-outline"
          size={15}
          color="#94A3B8"
        />
      )}
    </TouchableOpacity>
  ) : null;

  return (
    <View
      className={`mb-3 flex-row items-end ${own ? "justify-end" : "justify-start"}`}
    >
      {!own ? (
        <View className="mr-2">
          <MessageAvatar userId={message.senderUserId} />
        </View>
      ) : null}
      {own ? reactionButton : null}
      <View className="max-w-[76%]">
        <Pressable
          onLongPress={() => canReact && onOpenReactions(message)}
          delayLongPress={250}
        >
          <View
            className={`rounded-[22px] px-4 py-3 shadow-sm ${
              own
                ? "rounded-br-md border border-teal-500 bg-teal-600 shadow-teal-950/40"
                : "rounded-bl-md border border-slate-700 bg-slate-800 shadow-black/30"
            }`}
          >
        {!own ? (
          <View className="mb-1.5 flex-row items-center">
            <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <Text className="font-inter-semibold text-[9px] text-cyan-300">
              {message.senderName}
            </Text>
          </View>
        ) : null}
        <Text className="font-inter text-[14px] leading-5 text-white">
          {message.body}
        </Text>
        <View className="mt-1.5 flex-row items-center justify-end">
          {own && !undelivered ? (
            <MaterialCommunityIcons
              name="check-all"
              size={14}
              color="#CCFBF1"
            />
          ) : (
            <Feather
              name="clock"
              size={11}
              color={own ? "#CCFBF1" : "#94A3B8"}
            />
          )}
          <Text
            className={`ml-1 font-inter text-[10px] ${
              own ? "text-teal-100" : "text-slate-400"
            }`}
          >
            {deliveryLabel}
          </Text>
            </View>
          </View>
        </Pressable>
        {counts.length > 0 ? (
          <View
            className={`mt-1 flex-row flex-wrap items-center gap-1 ${
              own ? "justify-end" : "justify-start"
            }`}
          >
            {counts.map((entry) => (
              <View
                key={entry.kind}
                className={`flex-row items-center rounded-full border px-2 py-0.5 ${
                  mine?.reaction === entry.kind
                    ? "border-teal-400 bg-teal-900/60"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                <Text className="text-[11px]">{entry.emoji}</Text>
                <Text className="ml-1 font-inter-semibold text-[10px] text-slate-300">
                  {entry.count}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {!own ? reactionButton : null}
    </View>
  );
};

export default function MessagesRoute() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const source = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const goBack = () =>
    router.replace(
      source === "manager" ? "/(tabs)/manager" : "/(tabs)/dashboard",
    );
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
  const [reactionTargetId, setReactionTargetId] = useState<number | null>(null);
  // Read from the live thread rather than a snapshot so the picker still marks
  // the right choice if the reaction changed while it was open.
  const myReactionOnTarget =
    reactionTargetId === null
      ? undefined
      : messages
          .find((message) => message.serverId === reactionTargetId)
          ?.reactions.find((entry) => entry.userId === user?.id)?.reaction;

  const openReactions = (message: MessageItem) => {
    if (message.serverId !== null) setReactionTargetId(message.serverId);
  };

  const applyReaction = (kind: MessageReactionKind) => {
    const messageServerId = reactionTargetId;
    setReactionTargetId(null);
    if (messageServerId === null) return;
    void dispatch(
      reactToMessage({
        messageServerId,
        // Choosing the reaction that is already set removes it.
        reaction: myReactionOnTarget === kind ? null : kind,
      }),
    );
  };

  useEffect(() => {
    if (token && mess) void dispatch(loadMessages(undefined));
  }, [dispatch, isOnline, mess?.id, token]);

  useEffect(() => {
    setCanLoadOlder(false);
  }, [mess?.id]);

  const focusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!mess) return undefined;
      focusedRef.current = true;
      enterMessageConversation(mess.id);
      if (token) void dispatch(markMessagesRead());
      return () => {
        focusedRef.current = false;
        leaveMessageConversation(mess.id);
      };
    }, [dispatch, mess?.id, token]),
  );

  // The read watermark is the newest message this device knows about, and the
  // thread is still loading when the screen is focused. Mark read again once
  // newer messages land, otherwise they stay unread on the server and the
  // badge comes back on the next unread-count refresh.
  const newestServerId = messages.reduce(
    (newest, message) => Math.max(newest, message.serverId ?? 0),
    0,
  );
  useEffect(() => {
    if (!token || !mess || !focusedRef.current || newestServerId === 0) return;
    void dispatch(markMessagesRead());
  }, [dispatch, mess?.id, newestServerId, token]);

  const refreshMessages = useCallback(async () => {
    if (!token || !mess) return;
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
  }, [dispatch, mess, token]);

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
    if (!body || !user || sendStatus === "loading") return;
    setDraft("");
    try {
      await dispatch(sendMessage({ body, senderUserId: user.id })).unwrap();
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
            onPress={goBack}
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
                isOnline={isOnline}
                myUserId={user?.id}
                onOpenReactions={openReactions}
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

      <Modal
        visible={reactionTargetId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionTargetId(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-slate-950/60 px-6"
          onPress={() => setReactionTargetId(null)}
        >
          <Pressable
            className="flex-row items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-2 shadow-lg shadow-black/40"
            onPress={(event) => event.stopPropagation()}
          >
            {REACTION_CHOICES.map((choice) => {
              const selected = myReactionOnTarget === choice.kind;
              return (
                <TouchableOpacity
                  key={choice.kind}
                  className={`h-12 w-12 items-center justify-center rounded-full ${
                    selected ? "border-2 border-teal-400 bg-teal-900/70" : ""
                  }`}
                  onPress={() => applyReaction(choice.kind)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={
                    selected ? `Remove ${choice.kind}` : `React ${choice.kind}`
                  }
                >
                  <Text className="text-[26px]">{choice.emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
