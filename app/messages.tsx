import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { ApiMessage } from "@/lib/api";
import { useAppDispatch, useAppSelector, useAuth } from "@/redux/hooks";
import { loadMessages, selectMessagesState, sendMessage } from "@/redux/slice/messagesSlice";

const formatMessageTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const MessageBubble = ({ message, own }: { message: ApiMessage; own: boolean }) => (
  <View className={`mb-3 flex-row ${own ? "justify-end" : "justify-start"}`}>
    <View className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${own ? "rounded-br-md bg-teal-700" : "rounded-bl-md border border-slate-200 bg-white"}`}>
      {!own ? <Text className="mb-1 font-inter-semibold text-[11px] text-teal-700">{message.senderName}</Text> : null}
      <Text className={`font-inter text-[14px] leading-5 ${own ? "text-white" : "text-slate-800"}`}>{message.body}</Text>
      <Text className={`mt-1 text-right font-inter text-[10px] ${own ? "text-teal-100" : "text-slate-400"}`}>{formatMessageTime(message.createdAt)}</Text>
    </View>
  </View>
);

export default function MessagesRoute() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { mess, token, user } = useAuth();
  const { messages, nextCursor, hasMore, loadStatus, loadMoreStatus, sendStatus } = useAppSelector(selectMessagesState);
  const [draft, setDraft] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (token && mess) void dispatch(loadMessages(undefined));
  }, [dispatch, mess?.id, token]);

  const refreshMessages = useCallback(async () => {
    if (!token || !mess) return;
    setRefreshing(true);
    try {
      await dispatch(loadMessages(undefined)).unwrap();
    } catch (error) {
      Alert.alert("Could not refresh messages", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, mess, token]);

  const loadOlderMessages = () => {
    if (!hasMore || loadMoreStatus === "loading" || !nextCursor) return;
    void dispatch(loadMessages({ beforeCreatedAt: nextCursor.createdAt, beforeId: nextCursor.id }));
  };

  const submitMessage = async () => {
    const body = draft.trim();
    if (!body || sendStatus === "loading") return;
    setDraft("");
    try {
      await dispatch(sendMessage(body)).unwrap();
    } catch (error) {
      setDraft(body);
      Alert.alert("Could not send message", error instanceof Error ? error.message : "Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#F4F8FC]" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="pt-safe flex-1">
        <StatusBar style="light" backgroundColor="#075F5B" />
        <View className="flex-row items-center bg-[#075F5B] px-4 pb-4 pt-2">
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/15" onPress={() => router.back()} accessibilityLabel="Back"><Feather name="arrow-left" size={21} color="#FFFFFF" /></TouchableOpacity>
          <View className="ml-3 flex-1"><Text className="font-inter-bold text-[18px] text-white">Messages</Text><Text className="mt-0.5 font-inter text-[11px] text-teal-100">{mess?.name ?? "Mess group chat"}</Text></View>
          <Feather name="users" size={19} color="#FFFFFF" />
        </View>
        {loadStatus === "loading" && messages.length === 0 ? <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#0F766E" /></View> : <FlatList data={messages} inverted className="flex-1" contentContainerClassName="px-4 py-4" keyExtractor={(message) => String(message.id)} renderItem={({ item }) => <MessageBubble message={item} own={item.senderUserId === user?.id} />} onEndReached={loadOlderMessages} onEndReachedThreshold={0.25} showsVerticalScrollIndicator={false} ListHeaderComponent={loadMoreStatus === "loading" ? <ActivityIndicator size="small" color="#0F766E" /> : null} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshMessages()} tintColor="#0F766E" />} ListEmptyComponent={<View className="items-center px-8 py-24"><Feather name="message-circle" size={36} color="#0369A1" /><Text className="mt-4 font-inter-bold text-lg text-slate-900">Start the conversation</Text><Text className="mt-1 text-center font-inter text-sm text-slate-500">Send a message to everyone in your mess.</Text></View>} />}
        <View className="border-t border-slate-200 bg-white px-3 py-2 pb-safe-offset-2"><View className="flex-row items-end rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5"><TextInput className="max-h-24 min-h-10 flex-1 px-1 py-2 font-inter text-[14px] text-slate-800" value={draft} onChangeText={setDraft} placeholder="Write a message..." placeholderTextColor="#94A3B8" multiline maxLength={2000} editable={sendStatus !== "loading"} /><TouchableOpacity className="ml-2 h-10 w-10 items-center justify-center rounded-xl bg-teal-700" onPress={() => void submitMessage()} disabled={!draft.trim() || sendStatus === "loading"} accessibilityLabel="Send message">{sendStatus === "loading" ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="send" size={17} color="#FFFFFF" />}</TouchableOpacity></View></View>
      </View>
    </KeyboardAvoidingView>
  );
}
