import appConfig from "@/app.json";

// App identity shared by the drawer, About and Help & FAQ screens. Everything
// here is derived from app.json, so a rename, version bump or package change
// is made once and every screen follows.
export const APP_NAME = appConfig.expo.name;
export const APP_VERSION = appConfig.expo.version;

// Built from the same package id the app ships under, so the link cannot drift
// away from the real listing if that id is ever changed.
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${appConfig.expo.android.package}`;

// Android's share sheet ignores Share.share's `url` field, so the link has to
// live in the message itself. A blank line keeps it on its own row, which is
// what most apps need to turn it into a tappable link.
export const SHARE_MESSAGE = `Check out ${APP_NAME} — the easiest way to track meals, deposits, and shared expenses with your mess!\n\n${PLAY_STORE_URL}`;
