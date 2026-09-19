import Feather from "@expo/vector-icons/Feather";
import { useState, type ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Operator = "+" | "−" | "×" | "÷";

const OPERATORS: readonly string[] = ["+", "−", "×", "÷"];
const MAX_DIGITS = 15;
const MAX_LENGTH = 60;

type Token =
  | { type: "number"; value: number; percent: boolean }
  | { type: "operator"; operator: Operator };

const isOperator = (char: string | undefined): char is Operator =>
  char !== undefined && OPERATORS.includes(char);

const tokenize = (expression: string): Token[] | null => {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (isOperator(char)) {
      tokens.push({ type: "operator", operator: char });
      index += 1;
      continue;
    }
    // A negative result carried over from "=" starts with an ASCII minus.
    let end = index === 0 && char === "-" ? 1 : index;
    while (end < expression.length && /[0-9.]/.test(expression[end])) end += 1;
    if (end === index) return null;
    const value = parseFloat(expression.slice(index, end));
    if (Number.isNaN(value)) return null;
    const percent = expression[end] === "%";
    tokens.push({ type: "number", value, percent });
    index = percent ? end + 1 : end;
  }
  return tokens;
};

// × and ÷ bind tighter than + and −. "200+10%" is 10% of what precedes the
// "+" (220), like phone calculators; a lone or multiplied "10%" is 0.1.
const evaluate = (expression: string): number | null => {
  const trimmed = expression.replace(/[+−×÷]$/, "");
  const tokens = trimmed ? tokenize(trimmed) : null;
  if (!tokens || tokens[0]?.type !== "number") return null;

  let total = 0;
  let sign = 1;
  let term: number | null = null;
  let multiply: "×" | "÷" | null = null;
  let hasPreviousTerm = false;

  for (const token of tokens) {
    if (token.type === "number") {
      let value = token.value;
      if (token.percent) {
        value =
          term === null && hasPreviousTerm
            ? (total * value) / 100
            : value / 100;
      }
      if (term === null) term = value;
      else if (multiply === "×") term *= value;
      else if (multiply === "÷") {
        if (value === 0) return Number.NaN;
        term /= value;
      }
    } else if (token.operator === "+" || token.operator === "−") {
      total += sign * (term ?? 0);
      hasPreviousTerm = true;
      sign = token.operator === "+" ? 1 : -1;
      term = null;
      multiply = null;
    } else {
      multiply = token.operator;
    }
  }
  return total + sign * (term ?? 0);
};

// toPrecision trims float noise such as 0.1 + 0.2 = 0.30000000000000004.
const format = (value: number) => String(parseFloat(value.toPrecision(12)));

const currentNumber = (expression: string) =>
  expression.split(/[+−×÷]/).pop() ?? "";

interface CalculatorState {
  expression: string;
  // After "=" the result becomes the main line until the user types again.
  finished: boolean;
  result: string;
  error: boolean;
}

const INITIAL: CalculatorState = {
  expression: "",
  finished: false,
  result: "",
  error: false,
};

// A finished result becomes the start of the next expression. Exponent
// notation ("1e+21") would read as an operator, so such results start over.
const continueFrom = (state: CalculatorState) =>
  state.error || state.result.includes("e") ? "0" : state.result;

const withAppend = (state: CalculatorState, expression: string) =>
  expression.length > MAX_LENGTH ? state : { ...INITIAL, expression };

const pressDigit = (state: CalculatorState, digit: string): CalculatorState => {
  if (state.finished) return { ...INITIAL, expression: digit };
  const number = currentNumber(state.expression);
  if (number.endsWith("%")) return state;
  if (number.replace(".", "").length >= MAX_DIGITS) return state;
  if (number === "0") {
    return withAppend(state, state.expression.slice(0, -1) + digit);
  }
  return withAppend(state, state.expression + digit);
};

const pressDecimal = (state: CalculatorState): CalculatorState => {
  if (state.finished) return { ...INITIAL, expression: "0." };
  const number = currentNumber(state.expression);
  if (number.endsWith("%") || number.includes(".")) return state;
  return withAppend(state, state.expression + (number === "" ? "0." : "."));
};

const pressOperator = (
  state: CalculatorState,
  operator: Operator,
): CalculatorState => {
  if (state.finished) return { ...INITIAL, expression: continueFrom(state) + operator };
  const { expression } = state;
  if (expression === "") return { ...INITIAL, expression: `0${operator}` };
  if (isOperator(expression.at(-1))) {
    return { ...state, expression: expression.slice(0, -1) + operator };
  }
  return withAppend(state, expression + operator);
};

const pressPercent = (state: CalculatorState): CalculatorState => {
  if (state.finished) return { ...INITIAL, expression: `${continueFrom(state)}%` };
  const last = state.expression.at(-1);
  if (!last || !/[0-9.]/.test(last)) return state;
  return withAppend(state, `${state.expression}%`);
};

const pressBackspace = (state: CalculatorState): CalculatorState =>
  state.finished
    ? { ...INITIAL, expression: state.expression }
    : { ...state, expression: state.expression.slice(0, -1) };

const pressEquals = (state: CalculatorState): CalculatorState => {
  if (state.finished) return state;
  const value = evaluate(state.expression);
  if (value === null) return state;
  const expression = state.expression.replace(/[+−×÷]$/, "");
  if (!Number.isFinite(value)) {
    return { expression, finished: true, result: "Error", error: true };
  }
  return { expression, finished: true, result: format(value), error: false };
};

type KeyVariant = "digit" | "operator" | "clear" | "equals";

const KEY_STYLES: Record<KeyVariant, { box: string; text: string }> = {
  digit: { box: "bg-slate-100", text: "text-slate-900" },
  operator: { box: "bg-teal-50", text: "text-teal-700" },
  clear: { box: "bg-rose-50", text: "text-rose-600" },
  equals: { box: "bg-teal-700", text: "text-white" },
};

const Key = ({
  label,
  variant = "digit",
  wide = false,
  onPress,
  accessibilityLabel,
  children,
}: {
  label?: string;
  variant?: KeyVariant;
  wide?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  children?: ReactNode;
}) => (
  <TouchableOpacity
    className={`h-16 items-center justify-center rounded-2xl ${wide ? "flex-[2]" : "flex-1"} ${KEY_STYLES[variant].box}`}
    onPress={onPress}
    activeOpacity={0.65}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
  >
    {children ?? (
      <Text
        className={`font-inter-semibold text-[22px] ${KEY_STYLES[variant].text}`}
      >
        {label}
      </Text>
    )}
  </TouchableOpacity>
);

export const Calculator = () => {
  const [state, setState] = useState<CalculatorState>(INITIAL);
  const digit = (value: string) => () => setState((s) => pressDigit(s, value));
  const operator = (value: Operator) => () =>
    setState((s) => pressOperator(s, value));

  const hasCalculation = /[+−×÷%]/.test(
    state.expression.replace(/[+−×÷]$/, ""),
  );
  const live = hasCalculation ? evaluate(state.expression) : null;
  const liveResult =
    live !== null && Number.isFinite(live) ? format(live) : "";

  return (
    <View className="flex-1">
      <View className="flex-1 justify-end rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-400/20">
        <Text
          className={`text-right ${
            state.finished
              ? "font-inter text-[20px] text-slate-400"
              : "font-inter-semibold text-[40px] text-slate-900"
          }`}
          style={{ fontVariant: ["tabular-nums"] }}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {state.expression || "0"}
        </Text>
        <Text
          className={`mt-1 min-h-[28px] text-right ${
            state.finished
              ? `font-inter-bold text-[44px] ${state.error ? "text-rose-600" : "text-slate-900"}`
              : "font-inter text-[22px] text-slate-400"
          }`}
          style={{ fontVariant: ["tabular-nums"] }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {state.finished ? state.result : liveResult}
        </Text>
      </View>

      <View className="mt-4 gap-2.5">
        <View className="flex-row gap-2.5">
          <Key
            label="C"
            variant="clear"
            accessibilityLabel="Clear"
            onPress={() => setState(INITIAL)}
          />
          <Key
            variant="operator"
            accessibilityLabel="Backspace"
            onPress={() => setState(pressBackspace)}
          >
            <Feather name="delete" size={20} color="#0F766E" />
          </Key>
          <Key
            label="%"
            variant="operator"
            accessibilityLabel="Percent"
            onPress={() => setState(pressPercent)}
          />
          <Key
            label="÷"
            variant="operator"
            accessibilityLabel="Divide"
            onPress={operator("÷")}
          />
        </View>
        <View className="flex-row gap-2.5">
          <Key label="7" onPress={digit("7")} />
          <Key label="8" onPress={digit("8")} />
          <Key label="9" onPress={digit("9")} />
          <Key
            label="×"
            variant="operator"
            accessibilityLabel="Multiply"
            onPress={operator("×")}
          />
        </View>
        <View className="flex-row gap-2.5">
          <Key label="4" onPress={digit("4")} />
          <Key label="5" onPress={digit("5")} />
          <Key label="6" onPress={digit("6")} />
          <Key
            label="−"
            variant="operator"
            accessibilityLabel="Subtract"
            onPress={operator("−")}
          />
        </View>
        <View className="flex-row gap-2.5">
          <Key label="1" onPress={digit("1")} />
          <Key label="2" onPress={digit("2")} />
          <Key label="3" onPress={digit("3")} />
          <Key
            label="+"
            variant="operator"
            accessibilityLabel="Add"
            onPress={operator("+")}
          />
        </View>
        <View className="flex-row gap-2.5">
          <Key label="0" wide onPress={digit("0")} />
          <Key
            label="."
            accessibilityLabel="Decimal point"
            onPress={() => setState(pressDecimal)}
          />
          <Key
            label="="
            variant="equals"
            accessibilityLabel="Equals"
            onPress={() => setState(pressEquals)}
          />
        </View>
      </View>
    </View>
  );
};
