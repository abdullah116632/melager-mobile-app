import { useId, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";

const cardShadow = {
  shadowColor: "#94A3B8",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.16,
  shadowRadius: 10,
  elevation: 4,
};

export const SummaryCardShell = ({
  icon,
  title,
  subtitle,
  badge,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children: ReactNode;
}) => (
  <View className="mx-4 mb-4 rounded-3xl bg-white" style={cardShadow}>
    <View className="overflow-hidden rounded-3xl border border-slate-300 bg-white">
      <View className="flex-row items-center justify-between gap-2 border-b border-teal-100 bg-teal-50 px-4 py-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl border border-teal-100 bg-white">
            {icon}
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="font-inter-bold text-[15px] tracking-tight text-slate-900"
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text className="font-inter text-[11px] text-slate-500" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>
        {badge}
      </View>
      <View className="px-5 pb-5 pt-3">{children}</View>
    </View>
  </View>
);

type Tone = "rose" | "emerald";

const TONES: Record<Tone, { box: string; dot: string; text: string }> = {
  rose: { box: "border-rose-200 bg-rose-50", dot: "bg-rose-500", text: "text-rose-600" },
  emerald: {
    box: "border-emerald-200 bg-emerald-50",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
};

export const SummaryBadge = ({ label, tone }: { label: string; tone: Tone }) => (
  <View className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 ${TONES[tone].box}`}>
    <View className={`h-1.5 w-1.5 rounded-full ${TONES[tone].dot}`} />
    <Text className={`font-inter-semibold text-[10px] ${TONES[tone].text}`}>{label}</Text>
  </View>
);

export const SummaryPill = ({ label, tone }: { label: string; tone: Tone }) => (
  <View className={`mt-1 rounded-full border px-3 py-0.5 ${TONES[tone].box}`}>
    <Text className={`font-inter-semibold text-[10px] ${TONES[tone].text}`}>{label}</Text>
  </View>
);

const RADIUS = 50;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

export const SummaryRing = ({
  segments,
  label,
  value,
  negative = false,
  pill,
}: {
  segments: { fraction: number; colors: [string, string] }[];
  label: string;
  value: string;
  negative?: boolean;
  pill?: ReactNode;
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  let start = 0;
  const arcs = segments.map((segment, index) => {
    const fraction = clamp(segment.fraction);
    const arc = { ...segment, fraction, start, id: `arc${uid}${index}` };
    start += fraction;
    return arc;
  });

  return (
    <View className="items-center py-2">
      <View className="h-52 w-52 items-center justify-center">
        <Svg viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
          <Defs>
            {arcs.map((arc) => (
              <SvgGradient key={arc.id} id={arc.id} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={arc.colors[0]} />
                <Stop offset="1" stopColor={arc.colors[1]} />
              </SvgGradient>
            ))}
          </Defs>
          <Circle cx={60} cy={60} r={RADIUS} fill="none" stroke="#E2E8F0" strokeWidth={STROKE} />
          {arcs.map((arc) =>
            arc.fraction > 0 ? (
              <Circle
                key={arc.id}
                cx={60}
                cy={60}
                r={RADIUS}
                fill="none"
                stroke={`url(#${arc.id})`}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${arc.fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                transform={`rotate(${-90 + arc.start * 360} 60 60)`}
              />
            ) : null,
          )}
        </Svg>
        <View className="items-center px-3">
          <Text className="font-inter-medium text-[8px] uppercase tracking-wider text-slate-500">
            {label}
          </Text>
          <Text
            className={`max-w-[140px] font-inter-bold text-[20px] tracking-tight ${negative ? "text-rose-600" : "text-slate-900"}`}
            style={{ fontVariant: ["tabular-nums"] }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {value}
          </Text>
          {pill}
        </View>
      </View>
    </View>
  );
};

export const SummaryTile = ({
  label,
  value,
  labelClassName = "text-slate-600",
  valueClassName = "text-slate-900",
  borderClassName = "border-slate-300",
  bgClassName = "bg-white",
  centered = false,
}: {
  label: string;
  value: string;
  labelClassName?: string;
  valueClassName?: string;
  borderClassName?: string;
  bgClassName?: string;
  centered?: boolean;
}) => (
  <View
    className={`min-w-0 flex-1 rounded-2xl border px-3 py-2.5 shadow-sm shadow-slate-400/30 ${bgClassName} ${borderClassName} ${centered ? "items-center" : ""}`}
  >
    <Text className={`font-inter-semibold text-[10px] ${labelClassName}`} numberOfLines={1}>
      {label}
    </Text>
    <Text
      className={`mt-0.5 font-inter-bold text-[14px] ${valueClassName}`}
      style={{ fontVariant: ["tabular-nums"] }}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {value}
    </Text>
  </View>
);
