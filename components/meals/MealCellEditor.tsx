import Feather from "@expo/vector-icons/Feather";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface MealCellEditorHandle {
  commitNow: () => number;
}

interface MealCellEditorProps {
  consumerName: string;
  day: number;
  initialValue: number;
  onSave: (value: number) => void;
  onDone: () => void;
}

const parseMealValue = (value: string): number => {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export const MealCellEditor = forwardRef<
  MealCellEditorHandle,
  MealCellEditorProps
>(({ consumerName, day, initialValue, onSave, onDone }, ref) => {
  const [value, setValue] = useState(
    initialValue > 0 ? initialValue.toString() : "",
  );
  const [status, setStatus] = useState<"selected" | "saving" | "saved">(
    "selected",
  );
  const inputRef = useRef<TextInput | null>(null);
  const valueRef = useRef(value);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const commit = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const parsed = parseMealValue(valueRef.current);
    if (dirtyRef.current) {
      onSaveRef.current(parsed);
      dirtyRef.current = false;
    }
    setStatus("saved");
    return parsed;
  };

  useImperativeHandle(ref, () => ({ commitNow: commit }));

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => {
      clearTimeout(timer);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (dirtyRef.current) onSaveRef.current(parseMealValue(valueRef.current));
    };
  }, []);

  const handleChange = (nextValue: string) => {
    if (!/^\d*(?:\.\d{0,3})?$/.test(nextValue)) return;
    setValue(nextValue);
    valueRef.current = nextValue;
    dirtyRef.current = true;
    setStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSaveRef.current(parseMealValue(valueRef.current));
      dirtyRef.current = false;
      saveTimerRef.current = null;
      setStatus("saved");
    }, 350);
  };

  const handleDone = () => {
    commit();
    Keyboard.dismiss();
    onDone();
  };

  return (
    <View className="mx-3 mb-2 rounded-2xl border border-teal-100 bg-white px-3.5 py-2.5 shadow-sm shadow-slate-300/30">
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-teal-50">
            <Feather name="edit-3" size={14} color="#0F766E" />
          </View>
          <View>
            <Text
              className="max-w-[210px] font-inter-semibold text-[12px] text-slate-900"
              numberOfLines={1}
            >
              {consumerName} · Day {day}
            </Text>
            <Text className="font-inter text-[10px] text-slate-500">
              Enter meal value · maximum 3 decimals
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Text
            className={`font-inter-semibold text-[11px] ${
              status === "saved"
                ? "text-emerald-600"
                : status === "saving"
                  ? "text-amber-600"
                  : "text-slate-500"
            }`}
          >
            {status === "saved"
              ? "Saved"
              : status === "saving"
                ? "Saving..."
                : "Selected"}
          </Text>
          <TouchableOpacity
            className="h-8 w-8 items-center justify-center rounded-full bg-emerald-600"
            onPress={handleDone}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Finish meal entry"
          >
            <Feather name="check" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="decimal-pad"
        maxLength={12}
        selectTextOnFocus
        placeholder="0"
        placeholderTextColor="#94A3B8"
        className="h-12 rounded-xl border border-teal-200 bg-teal-50/40 px-3 py-0 text-center font-inter-bold text-lg leading-6 text-teal-800"
        textAlignVertical="center"
        returnKeyType={Platform.OS === "ios" ? "done" : "next"}
        onSubmitEditing={handleDone}
      />
    </View>
  );
});

MealCellEditor.displayName = "MealCellEditor";
