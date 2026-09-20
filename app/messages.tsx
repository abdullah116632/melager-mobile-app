import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { MessageReactionKind } from "@/lib/api";
import type {
  MessageItem,
  MessageQuote,
} from "@/offline/features/messages/MessageRepository";
import { MessageAvatar } from "@/components/messages/MessageAvatar";
import { MessageQuoteBlock } from "@/components/messages/MessageQuoteBlock";
import { MessageReactionDetails } from "@/components/messages/MessageReactionDetails";
import {
  MessageReactionPicker,
  REACTION_CHOICES,
  reactionEmoji,
} from "@/components/messages/MessageReactionPicker";
import { SwipeToReply } from "@/components/messages/SwipeToReply";
import {
  enterMessageConversation,
  leaveMessageConversation,
} from "@/lib/realtime";
import {
  useAppDispatch,
  useAppSelector,
  useAuth,
  useMess,
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

const MessageBubble = ({
  message,
  own,
  isOnline,
  myUserId,
  highlighted,
  onOpenReactions,
  onShowReactionDetails,
  onReply,
  onJumpToQuoted,
}: {
  message: MessageItem;
  own: boolean;
  isOnline: boolean;
  myUserId?: number;
  highlighted: boolean;
  onOpenReactions: (message: MessageItem) => void;
  onShowReactionDetails: (message: MessageItem) => void;
  onReply: (message: MessageItem) => void;
  onJumpToQuoted: (messageServerId: number) => void;
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
  // Reactions and quotes are both keyed by the server id, so a message still
  // in the outbox can carry neither yet.
  const canReact = message.serverId !== null;
  // One pill for the whole message, like WhatsApp: the distinct reactions
  // side by side, most used first, with the total beside them.
  const distinctReactions = REACTION_CHOICES.map((choice) => ({
    ...choice,
    count: message.reactions.filter((entry) => entry.reaction === choice.kind)
      .length,
  }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);
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
      <SwipeToReply
        enabled={canReact}
        onReply={() => onReply(message)}
        className="max-w-[76%]"
      >
        <View>
          <Pressable
            onLongPress={() => canReact && onOpenReactions(message)}
            delayLongPress={250}
          >
            <View
              className={`rounded-[22px] border px-4 py-3 shadow-sm ${
                own
                  ? "rounded-br-md bg-teal-600 shadow-teal-950/40"
                  : "rounded-bl-md bg-slate-800 shadow-black/30"
              } ${
                highlighted
                  ? "border-cyan-300"
                  : own
                    ? "border-teal-500"
                    : "border-slate-700"
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
              {message.replyToMessageId ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => onJumpToQuoted(message.replyToMessageId!)}
                  accessibilityRole="button"
                  accessibilityLabel="Go to the quoted message"
                >
                  <MessageQuoteBlock
                    senderUserId={message.replyToSenderUserId}
                    senderName={message.replyToSenderName}
                    body={message.replyToBody}
                    myUserId={myUserId}
                    tone={own ? "own" : "dark"}
                  />
                </TouchableOpacity>
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
          {distinctReactions.length > 0 ? (
            <View
              className={`-mt-1.5 flex-row ${
                own ? "justify-end pr-2" : "justify-start pl-2"
              }`}
            >
              <TouchableOpacity
                className={`flex-row items-center rounded-full border px-1.5 py-0.5 ${
                  mine
                    ? "border-teal-400 bg-teal-900/70"
                    : "border-slate-700 bg-slate-800"
                }`}
                onPress={() => onShowReactionDetails(message)}
                accessibilityRole="button"
                accessibilityLabel={`See who reacted, ${message.reactions.length} in total`}
              >
                {/* WhatsApp caps the row at three faces and lets the total
                  speak for the rest. */}
                {distinctReactions.slice(0, 3).map((entry) => (
                  <Text key={entry.kind} className="mx-px text-[12px]">
                    {entry.emoji}
                  </Text>
                ))}
                {message.reactions.length > 1 ? (
                  <Text className="ml-1 mr-0.5 font-inter-semibold text-[10px] text-slate-300">
                    {message.reactions.length}
                  </Text>
                ) : null}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </SwipeToReply>
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
  const { consumers } = useMess();
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
  const [detailsTargetId, setDetailsTargetId] = useState<number | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageQuote | null>(null);
  const [highlightedServerId, setHighlightedServerId] = useState<number | null>(
    null,
  );
  const listRef = useRef<FlatList<MessageItem>>(null);
  // Read from the live thread rather than a snapshot so the picker still marks
  // the right choice if the reaction changed while it was open.
  const reactionTarget =
    reactionTargetId === null
      ? undefined
      : messages.find((message) => message.serverId === reactionTargetId);
  const myReactionOnTarget = reactionTarget?.reactions.find(
    (entry) => entry.userId === user?.id,
  )?.reaction;
  // Same reason for the who-reacted sheet: it follows the thread, so a
  // reaction arriving over realtime shows up while the sheet is open.
  const detailsTarget =
    detailsTargetId === null
      ? null
      : (messages.find((message) => message.serverId === detailsTargetId) ??
        null);

  const openReactions = (message: MessageItem) => {
    if (message.serverId !== null) setReactionTargetId(message.serverId);
  };

  const showReactionDetails = (message: MessageItem) => {
    if (message.serverId !== null) setDetailsTargetId(message.serverId);
  };

  const startReply = (message: MessageItem) => {
    if (message.serverId === null) return;
    // The sender's own name is stored as typed; whether it reads as "You" is
    // decided when the quote is drawn, so it cannot go stale.
    setReplyTarget({
      replyToMessageId: message.serverId,
      replyToSenderUserId: message.senderUserId,
      replyToSenderName: message.senderName,
      replyToBody: message.body,
    });
  };

  /**
   * Scrolls to the quoted message and flashes it. Nothing happens when it sits
   * outside the pages loaded so far, which is the older end of the thread.
   */
  const jumpToQuoted = (messageServerId: number) => {
    const index = messages.findIndex(
      (message) => message.serverId === messageServerId,
    );
    if (index < 0) return;
    listRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5,
    });
    setHighlightedServerId(messageServerId);
  };

  useEffect(() => {
    if (highlightedServerId === null) return undefined;
    const timer = setTimeout(() => setHighlightedServerId(null), 1400);
    return () => clearTimeout(timer);
  }, [highlightedServerId]);

  // Nothing left to list once the last reaction goes, including the caller's
  // own removal from inside the sheet. A message that left the thread
  // entirely, say on a mess switch, closes it too.
  useEffect(() => {
    if (detailsTargetId === null) return;
    if (!detailsTarget || detailsTarget.reactions.length === 0)
      setDetailsTargetId(null);
  }, [detailsTarget, detailsTargetId]);

  // Mess members carry the display names; reactions travel as user ids only.
  const resolveReactorName = (userId: number) =>
    consumers.find((consumer) => consumer.userId === userId)?.name;

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

  const removeMyReaction = () => {
    if (detailsTargetId === null) return;
    void dispatch(
      reactToMessage({ messageServerId: detailsTargetId, reaction: null }),
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
    const replyTo = replyTarget;
    setDraft("");
    setReplyTarget(null);
    try {
      await dispatch(
        sendMessage({ body, senderUserId: user.id, replyTo }),
      ).unwrap();
    } catch (error) {
      setDraft(body);
      setReplyTarget(replyTo);
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
            ref={listRef}
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
                highlighted={
                  item.serverId !== null &&
                  item.serverId === highlightedServerId
                }
                onOpenReactions={openReactions}
                onShowReactionDetails={showReactionDetails}
                onReply={startReply}
                onJumpToQuoted={jumpToQuoted}
              />
            )}
            // Rows are not a fixed height, so a jump to a message that is
            // mounted but not measured yet needs a second, settled attempt.
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              listRef.current?.scrollToOffset({
                offset: index * averageItemLength,
                animated: true,
              });
              setTimeout(
                () =>
                  listRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0.5,
                  }),
                220,
              );
            }}
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
          {replyTarget ? (
            <View className="mb-2 flex-row items-center rounded-2xl border border-slate-700 bg-slate-800/70 p-1.5">
              <View className="flex-1">
                <MessageQuoteBlock
                  senderUserId={replyTarget.replyToSenderUserId}
                  senderName={replyTarget.replyToSenderName}
                  body={replyTarget.replyToBody}
                  myUserId={user?.id}
                />
              </View>
              <TouchableOpacity
                className="mb-1.5 ml-1 h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800"
                onPress={() => setReplyTarget(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancel reply"
              >
                <Feather name="x" size={15} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ) : null}
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

      <MessageReactionPicker
        visible={reactionTargetId !== null}
        selected={myReactionOnTarget}
        onSelect={applyReaction}
        onClose={() => setReactionTargetId(null)}
      />

      <MessageReactionDetails
        message={detailsTarget}
        myUserId={user?.id}
        resolveName={resolveReactorName}
        onRemoveMine={removeMyReaction}
        onClose={() => setDetailsTargetId(null)}
      />
    </KeyboardAvoidingView>
  );
}
