import { Text, View } from "react-native";

/**
 * The quoted message shown inside a reply bubble and above the composer. The
 * server resolves the quote, so it survives even when the original message is
 * far outside the pages this device has loaded.
 */
export const MessageQuoteBlock = ({
  senderUserId,
  senderName,
  body,
  myUserId,
  tone = "dark",
}: {
  senderUserId?: number | null;
  senderName?: string | null;
  body?: string | null;
  myUserId?: number;
  /** "own" sits on the teal bubble, "dark" on a slate one or the composer. */
  tone?: "own" | "dark";
}) => {
  const name =
    senderUserId != null && senderUserId === myUserId
      ? "You"
      : (senderName ?? "Unknown");
  return (
    <View
      className={`mb-1.5 flex-row overflow-hidden rounded-xl ${
        tone === "own" ? "bg-teal-700/60" : "bg-slate-900/70"
      }`}
    >
      <View
        className={`w-1 ${tone === "own" ? "bg-teal-200" : "bg-cyan-400"}`}
      />
      <View className="flex-1 px-2.5 py-1.5">
        <Text
          className={`font-inter-semibold text-[11px] ${
            tone === "own" ? "text-teal-100" : "text-cyan-300"
          }`}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          className={`mt-0.5 font-inter text-[12px] ${
            tone === "own" ? "text-teal-50" : "text-slate-300"
          }`}
          numberOfLines={2}
        >
          {body ?? "Message unavailable"}
        </Text>
      </View>
    </View>
  );
};
