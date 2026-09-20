/**
 * How many decimal places the app shows and accepts.
 *
 * Every formatter and every numeric field derives its limit from here, so the
 * displayed precision and the typed precision can never drift apart. The server
 * stores whatever it was sent, including older rows written with more decimals
 * than this; those are rounded for display, never rewritten.
 */
export const MAX_DECIMALS = 2;

/** Shared by the formatters so a whole number stays free of trailing zeros. */
export const DECIMAL_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: MAX_DECIMALS,
};

/**
 * Accepts what a half-typed entry looks like — "", "12", "12." and "12.3" are
 * all on the way to a valid amount — so a field can reject a keystroke without
 * blocking the ones before it.
 */
export const DECIMAL_INPUT_PATTERN = new RegExp(
  `^\\d*(?:\\.\\d{0,${MAX_DECIMALS}})?$`,
);

/** The same, for a field that also takes a leading minus. */
export const SIGNED_DECIMAL_INPUT_PATTERN = new RegExp(
  `^-?\\d*(?:\\.\\d{0,${MAX_DECIMALS}})?$`,
);

/** A finished value, for validation on submit: "12." no longer counts. */
export const SIGNED_DECIMAL_VALUE_PATTERN = new RegExp(
  `^-?\\d+(?:\\.\\d{1,${MAX_DECIMALS}})?$`,
);
