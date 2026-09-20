import { useId, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import type { TrendPoint } from "@/utils/managerStats";

const CHART_HEIGHT = 108;
const TOP_PAD = 10;
const BOTTOM_PAD = 10;
const PLOT_HEIGHT = CHART_HEIGHT - TOP_PAD - BOTTOM_PAD;
const BASELINE = CHART_HEIGHT - BOTTOM_PAD;
/** Left strip the y-axis labels are written into, outside the plotted area. */
const AXIS_GUTTER = 44;
/** Keeps the last day's dot and its label clear of the right edge. */
const RIGHT_PAD = 10;
/** Band under the baseline holding the day labels. */
const X_AXIS_BAND = 18;
const SVG_HEIGHT = BASELINE + X_AXIS_BAND;
/** Day labels land on every fifth day of the month. */
const DAY_LABEL_STEP = 5;
/** A label nearer than this to the first or last one would collide with it. */
const DAY_LABEL_MIN_GAP = 22;

export type TrendChartVariant = "line" | "bar";

interface ManagerTrendChartProps {
  points: TrendPoint[];
  min: number;
  max: number;
  color: string;
  variant: TrendChartVariant;
  formatValue: (value: number) => string;
}

/** SVG rejects a coordinate that is not a real number, so nothing else may pass. */
const safe = (value: number): number => (Number.isFinite(value) ? value : 0);

/**
 * One month of a figure, drawn either as a filled line or as one bar per day.
 *
 * The running meal rate is a line, because its value carries from one day to
 * the next. The daily figures are bars: each stands on its own, and a day with
 * nothing recorded should read as an empty slot rather than as a line dropping
 * to the floor and climbing back.
 *
 * That difference decides the scale too. Bars are measured from zero, since a
 * bar's height is its value and a cropped axis would lie about it. The line is
 * measured across a padded band around its own range instead, because a rate
 * moving between ৳58 and ৳62 is a real swing for a mess that a zero-based axis
 * would flatten into a straight line.
 *
 * The fill's gradient id carries the colour, so switching tabs defines a new
 * gradient rather than repainting the stops of an existing one — Android does
 * not reliably redraw a fill whose gradient changed underneath it.
 */
export const ManagerTrendChart = ({
  points,
  min,
  max,
  color,
  variant,
  formatValue,
}: ManagerTrendChartProps) => {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (Number.isFinite(next) && next > 0) setWidth(next);
  };

  // The wrapper is always rendered so the measured width survives a tab change.
  const drawable = points.length >= 2 && width > AXIS_GUTTER + RIGHT_PAD;

  return (
    <View onLayout={onLayout}>
      {drawable ? (
        <Chart
          points={points}
          min={min}
          max={max}
          color={color}
          variant={variant}
          width={width}
          formatValue={formatValue}
        />
      ) : (
        <View style={{ height: SVG_HEIGHT }} />
      )}
    </View>
  );
};

const Chart = ({
  points,
  min,
  max,
  color,
  variant,
  width,
  formatValue,
}: ManagerTrendChartProps & { width: number }) => {
  const isBar = variant === "bar";
  const plotWidth = Math.max(width - AXIS_GUTTER - RIGHT_PAD, 1);
  const slotWidth = plotWidth / points.length;

  const span = max - min;
  const padding = span > 0 ? span * 0.25 : Math.max(Math.abs(max) * 0.1, 1);
  const bottom = isBar ? 0 : Math.min(min - padding, max + padding - 1);
  const top = isBar ? (max > 0 ? max * 1.08 : 1) : max + padding;
  const range = top - bottom;
  const scale = Number.isFinite(range) && range > 0 ? range : 1;

  // Bars own a slot each and sit at its centre; the line's points are spread so
  // the first and last land on the edges of the plot.
  const xAt = (index: number) =>
    safe(
      isBar
        ? AXIS_GUTTER + (index + 0.5) * slotWidth
        : AXIS_GUTTER + (index / Math.max(points.length - 1, 1)) * plotWidth,
    );
  const y = (value: number) =>
    safe(TOP_PAD + (1 - (safe(value) - bottom) / scale) * PLOT_HEIGHT);

  const coords = points.map((point, index) => ({
    day: point.day,
    value: safe(point.value),
    x: xAt(index),
    y: y(point.value),
  }));

  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const areaId = `area${uid}${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const linePath = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x} ${coord.y}`)
    .join(" ");
  const areaPath = `${linePath} L${last.x} ${BASELINE} L${first.x} ${BASELINE} Z`;

  // The rules sit on real readings rather than on the padded edges of the band,
  // so every label is a figure the mess actually recorded. Bars are read off a
  // zero baseline, so theirs run from the tallest bar down to nothing.
  const levels = isBar
    ? max > 0
      ? [max, max / 2, 0]
      : [0]
    : span > 0
      ? [max, min + span / 2, min]
      : [max];

  // The ends are always named, and every fifth day in between is numbered —
  // unless it falls close enough to an end to collide with it.
  const dayLabels = coords.filter(
    (coord, index) =>
      index > 0 &&
      index < coords.length - 1 &&
      coord.day % DAY_LABEL_STEP === 0 &&
      coord.x - AXIS_GUTTER > DAY_LABEL_MIN_GAP &&
      AXIS_GUTTER + plotWidth - coord.x > DAY_LABEL_MIN_GAP,
  );
  const labelledDays = new Set(dayLabels.map((coord) => coord.day));
  const barWidth = Math.max(Math.min(slotWidth * 0.62, 9), 2);

  return (
    <Svg width={width} height={SVG_HEIGHT}>
      <Defs>
        <SvgGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.3} />
          <Stop offset="0.55" stopColor={color} stopOpacity={0.1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>

      {/* Bars mark the days by themselves; the line needs rules behind it. */}
      {!isBar
        ? coords.map((coord) => (
            <Line
              key={`day-${coord.day}`}
              x1={coord.x}
              y1={TOP_PAD}
              x2={coord.x}
              y2={BASELINE}
              stroke="#CBD5E1"
              strokeWidth={1}
              // A numbered day is drawn a little stronger so the label below it
              // clearly belongs to that rule.
              opacity={labelledDays.has(coord.day) ? 0.6 : 0.3}
            />
          ))
        : null}

      {levels.map((level, index) => {
        const lineY = y(level);
        return (
          <Line
            key={`level-${index}`}
            x1={AXIS_GUTTER}
            y1={lineY}
            x2={width}
            y2={lineY}
            stroke="#CBD5E1"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.85}
          />
        );
      })}

      {isBar ? (
        coords.map((coord) => {
          if (coord.value <= 0) return null;
          const height = Math.max(BASELINE - y(coord.value), 1.5);
          return (
            <Rect
              key={`bar-${coord.day}`}
              x={coord.x - barWidth / 2}
              y={BASELINE - height}
              width={barWidth}
              height={height}
              rx={Math.min(barWidth / 2, 2)}
              fill={color}
              fillOpacity={0.85}
            />
          );
        })
      ) : (
        <>
          <Path d={areaPath} fill={`url(#${areaId})`} />
          <Path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle
            cx={last.x}
            cy={last.y}
            r={6}
            fill={color}
            fillOpacity={0.2}
          />
          <Circle
            cx={last.x}
            cy={last.y}
            r={3.5}
            fill="#FFFFFF"
            stroke={color}
            strokeWidth={2.5}
          />
        </>
      )}

      {levels.map((level, index) => (
        <SvgText
          key={`label-${index}`}
          x={AXIS_GUTTER - 6}
          // SVG places text on its baseline, so nudge it down to sit centred.
          y={y(level) + 3}
          textAnchor="end"
          fontSize={9}
          fontFamily="Inter_400Regular"
          fill="#94A3B8"
        >
          {formatValue(level)}
        </SvgText>
      ))}

      {/* The end labels sit on the edges of the plot, not on their data point.
          A bar sits at the centre of its slot, so anchoring the last label to it
          would pull "Day 30" half a slot in from the edge.

          One interpolated string per label: separate children become separate
          text runs that each re-anchor at the element's x, which drops part of
          the label off the edge. */}
      <SvgText
        x={AXIS_GUTTER}
        y={BASELINE + 13}
        textAnchor="start"
        fontSize={9}
        fontFamily="Inter_400Regular"
        fill="#94A3B8"
      >
        {`Day ${first.day}`}
      </SvgText>
      {dayLabels.map((coord) => (
        <SvgText
          key={`dayLabel-${coord.day}`}
          x={coord.x}
          y={BASELINE + 13}
          textAnchor="middle"
          fontSize={9}
          fontFamily="Inter_400Regular"
          fill="#94A3B8"
        >
          {`${coord.day}`}
        </SvgText>
      ))}
      <SvgText
        x={AXIS_GUTTER + plotWidth}
        y={BASELINE + 13}
        textAnchor="end"
        fontSize={9}
        fontFamily="Inter_400Regular"
        fill="#94A3B8"
      >
        {`Day ${last.day}`}
      </SvgText>
    </Svg>
  );
};
