#!/usr/bin/env bash
# Builds a release APK or Play Store AAB on this machine, signed with the same
# upload keystore EAS uses, so it carries the exact SHA-1/SHA-256 of EAS builds
# (Google Sign-In keeps working, an APK installs over an EAS build without
# uninstalling, and Play Console accepts the AAB as coming from the same key).
#
# Nothing here touches app.json or eas.json, so EAS builds are unaffected:
#   - signing reaches Gradle as injected properties, never written into
#     android/app/build.gradle, so `expo prebuild --clean` cannot wipe it;
#   - passwords come from a file outside the repo, or are asked for.
#
# Usage (from mobile/):
#   FORMAT=aab VERSION_CODE=7 ./scripts/build-android-local.sh  # Play Store bundle
#   INSTALL=1 ./scripts/build-android-local.sh     # APK, then install on the device
#   ARCHS=x86_64 ./scripts/build-android-local.sh  # faster, emulator-only APK
#
# The server and Google client ID come from mobile/.env, the same file
# `npm run dev` uses. Set EXPO_PUBLIC_API_URL there to the server this APK
# should talk to before building. The log says whether that is the production
# server, and each verified APK is copied to ~/mealager-apks/ with the server's
# host in its file name, so a test build is never mistaken for production.
set -euo pipefail

cd "$(dirname "$0")/.."

die() { printf '\n✗ %s\n' "$*" >&2; exit 1; }
step() { printf '\n▸ %s\n' "$*"; }

ENV_FILE=".env"
# The server a real release must talk to. Any other host is flagged in the log.
PRODUCTION_HOST="melager.olivosoft.com"
KEYSTORE="${MELAGER_KEYSTORE:-$PWD/@musa116632__mobile.jks}"
SIGNING_ENV="${MELAGER_SIGNING_ENV:-$HOME/.config/melager/android-signing.env}"
VERSION_CODE="${VERSION_CODE:-7}"
# apk = installable test build, aab = the bundle Play Console takes.
FORMAT="${FORMAT:-apk}"
[[ "$FORMAT" == "apk" || "$FORMAT" == "aab" ]] || die "FORMAT must be apk or aab (got '$FORMAT')"
[[ "$FORMAT" == "aab" && "${INSTALL:-0}" == "1" ]] &&
  die "INSTALL=1 needs an APK; adb cannot install an AAB."
[[ "$FORMAT" == "aab" && -n "${ARCHS:-}" ]] &&
  die "ARCHS is for test APKs; a Play Store AAB must contain every architecture."
# Fingerprint of the EAS upload key. The build fails if the APK does not match.
EXPECTED_SHA256="a9eda669b3b18b434f05c7e328e08f5ebd14e6fc1b2a3ed56279f80ad7c0bec9"

# ---------------------------------------------------------------- toolchain --
step "Checking toolchain"
if [[ -z "${JAVA_HOME:-}" ]]; then
  for candidate in "$HOME"/.local/share/jdks/jdk-17* /usr/lib/jvm/java-17-openjdk; do
    if [[ -x "$candidate/bin/java" ]]; then JAVA_HOME="$candidate"; break; fi
  done
fi
[[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]] ||
  die "JDK 17 not found. Install it (sudo pacman -S jdk17-openjdk) or set JAVA_HOME."
JAVA_MAJOR=$("$JAVA_HOME/bin/java" -XshowSettings:properties -version 2>&1 |
  awk -F'= ' '/java.specification.version/ {print $2}')
# React Native 0.81 builds with Gradle 8.x, which cannot run on newer JDKs.
[[ "$JAVA_MAJOR" == "17" ]] || die "JDK 17 is required, found Java $JAVA_MAJOR at $JAVA_HOME"
export JAVA_HOME PATH="$JAVA_HOME/bin:$PATH"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
[[ -d "$ANDROID_HOME/platform-tools" ]] || die "Android SDK not found at $ANDROID_HOME"
BUILD_TOOLS=$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)
APKSIGNER="$BUILD_TOOLS/apksigner"
ADB="$ANDROID_HOME/platform-tools/adb"
echo "  Java $JAVA_MAJOR · SDK $ANDROID_HOME · build-tools $(basename "$BUILD_TOOLS")"

# ------------------------------------------------------------------ signing --
step "Checking signing key"
[[ -f "$KEYSTORE" ]] || die "Keystore not found: $KEYSTORE"
if [[ -f "$SIGNING_ENV" ]]; then
  set -a; # shellcheck disable=SC1090
  source "$SIGNING_ENV"; set +a
fi
MELAGER_KEY_ALIAS="${MELAGER_KEY_ALIAS:-be7943ccd3ca30292a76a447a67dbea1}"
if [[ -z "${MELAGER_STORE_PASSWORD:-}" ]]; then
  [[ -t 0 ]] || die "Keystore password missing. Fill in $SIGNING_ENV or run in a terminal."
  read -rsp "  Keystore password: " MELAGER_STORE_PASSWORD; echo
fi
if [[ -z "${MELAGER_KEY_PASSWORD:-}" ]]; then
  if [[ -t 0 ]]; then
    read -rsp "  Key password (Enter = same as keystore): " MELAGER_KEY_PASSWORD; echo
  fi
  MELAGER_KEY_PASSWORD="${MELAGER_KEY_PASSWORD:-$MELAGER_STORE_PASSWORD}"
fi
# Catch a wrong password now instead of after a ten-minute build. -certreq
# needs the private key itself, so it proves both passwords and the alias.
keytool -certreq -keystore "$KEYSTORE" -alias "$MELAGER_KEY_ALIAS" \
  -storepass:env MELAGER_STORE_PASSWORD -keypass:env MELAGER_KEY_PASSWORD \
  >/dev/null 2>&1 || die "Keystore password, key password or alias is wrong."
echo "  keystore unlocked (alias $MELAGER_KEY_ALIAS)"

# ---------------------------------------------------------------- app config --
step "Loading build environment from $ENV_FILE"
[[ -f "$ENV_FILE" ]] || die "mobile/$ENV_FILE not found. Create it from .env.example."

# Start from nothing, so a variable left in this shell, or a .env.local written
# by `npm run set-local-ip`, can never slip into the APK. EXPO_NO_DOTENV stops
# Expo reading .env files on its own while it bundles; what is in .env is
# exactly what the app gets.
while IFS= read -r name; do unset "$name"; done < <(compgen -e | grep '^EXPO_PUBLIC_' || true)
export EXPO_NO_DOTENV=1

# Parse with the same dotenv library Expo uses, and pass values through NUL
# separators instead of eval, so no value is ever run as shell code.
while IFS= read -r -d '' key && IFS= read -r -d '' value; do
  export "$key=$value"
done < <(node -e '
  const fs = require("fs");
  const path = require("path");
  const expoEnv = require.resolve("@expo/env", { paths: [require.resolve("expo/package.json")] });
  const dotenv = require(require.resolve("dotenv", { paths: [path.dirname(expoEnv)] }));
  const vars = dotenv.parse(fs.readFileSync(process.argv[1]));
  for (const [key, value] of Object.entries(vars)) {
    if (key.startsWith("EXPO_PUBLIC_")) process.stdout.write(key + "\0" + value + "\0");
  }
' "$ENV_FILE")

[[ "${EXPO_PUBLIC_API_URL:-}" == https://* ]] ||
  die "EXPO_PUBLIC_API_URL in $ENV_FILE must be https (got '${EXPO_PUBLIC_API_URL:-}'). A LAN http:// address only works with npm run dev; the APK blocks cleartext traffic."
if [[ -z "${EXPO_PUBLIC_SOCKET_URL:-}" ]]; then
  # Same rule the app uses: the socket lives on the API host, without /api.
  EXPO_PUBLIC_SOCKET_URL="${EXPO_PUBLIC_API_URL%/}"
  export EXPO_PUBLIC_SOCKET_URL="${EXPO_PUBLIC_SOCKET_URL%/api}"
fi
[[ "$EXPO_PUBLIC_SOCKET_URL" == https://* ]] ||
  die "EXPO_PUBLIC_SOCKET_URL in $ENV_FILE must be https (got '$EXPO_PUBLIC_SOCKET_URL')."
[[ "${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:-}" == *.apps.googleusercontent.com ]] ||
  die "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in $ENV_FILE is missing or malformed; Google sign-in would break."
export NODE_ENV=production

TARGET_HOST=$(node -e 'console.log(new URL(process.argv[1]).host)' "$EXPO_PUBLIC_API_URL")
echo "  API    $EXPO_PUBLIC_API_URL"
echo "  Socket $EXPO_PUBLIC_SOCKET_URL"
if [[ "$TARGET_HOST" == "$PRODUCTION_HOST" ]]; then
  echo "  ✓ production server"
else
  echo "  ⚠ NOT the production server: this build talks to $TARGET_HOST"
  # An AAB exists only to be uploaded to Play, where a test server is never right.
  [[ "$FORMAT" == "aab" ]] &&
    die "Refusing to build a Play Store AAB against $TARGET_HOST. Set EXPO_PUBLIC_API_URL=https://$PRODUCTION_HOST in $ENV_FILE."
fi

# ----------------------------------------------------------------- prebuild --
step "Generating native Android project"
EXPO_NO_GIT_STATUS=1 CI=1 npx expo prebuild --platform android --clean --no-install

# A local APK must not have a lower versionCode than the installed EAS build,
# or Android refuses it as a downgrade. Only the generated file is changed.
sed -i -E "s/^([[:space:]]*)versionCode [0-9]+/\1versionCode $VERSION_CODE/" android/app/build.gradle
grep -qE "^[[:space:]]*versionCode $VERSION_CODE$" android/app/build.gradle ||
  die "Could not set versionCode in android/app/build.gradle"
echo "  versionCode $VERSION_CODE"

# -------------------------------------------------------------------- build --
if [[ "$FORMAT" == "aab" ]]; then
  GRADLE_TASK=bundleRelease
  ARTIFACT="$PWD/android/app/build/outputs/bundle/release/app-release.aab"
else
  GRADLE_TASK=assembleRelease
  ARTIFACT="$PWD/android/app/build/outputs/apk/release/app-release.apk"
fi
# A leftover file from an earlier run must not pass as this build's output.
rm -f "$ARTIFACT"

step "Building release $(tr a-z A-Z <<<"$FORMAT") (this takes a while the first time)"
GRADLE_ARGS=("$GRADLE_TASK" --no-daemon)
[[ -n "${ARCHS:-}" ]] && GRADLE_ARGS+=("-PreactNativeArchitectures=$ARCHS")
# Signing is passed through ORG_GRADLE_PROJECT_* variables rather than -P
# flags, so the passwords never appear in the process list.
(
  cd android
  env \
    "ORG_GRADLE_PROJECT_android.injected.signing.store.file=$KEYSTORE" \
    "ORG_GRADLE_PROJECT_android.injected.signing.store.password=$MELAGER_STORE_PASSWORD" \
    "ORG_GRADLE_PROJECT_android.injected.signing.key.alias=$MELAGER_KEY_ALIAS" \
    "ORG_GRADLE_PROJECT_android.injected.signing.key.password=$MELAGER_KEY_PASSWORD" \
    ./gradlew "${GRADLE_ARGS[@]}"
)

[[ -f "$ARTIFACT" ]] || die "Build finished but $ARTIFACT was not produced"

# ------------------------------------------------------------------- verify --
step "Verifying signature"
if [[ "$FORMAT" == "aab" ]]; then
  # An AAB is JAR-signed, which apksigner does not read. jarsigner proves the
  # signature is intact; keytool prints the certificate it was made with.
  "$JAVA_HOME/bin/jarsigner" -verify "$ARTIFACT" 2>/dev/null | grep -q "jar verified" ||
    die "The AAB is not signed, or its signature is broken."
  CERTS=$(keytool -printcert -jarfile "$ARTIFACT" 2>/dev/null)
  fingerprint() { awk -v k="$1:" '$1 == k {print $2; exit}' <<<"$CERTS" | tr -d ':' | tr 'A-F' 'a-f'; }
  ACTUAL_SHA256=$(fingerprint SHA256)
  ACTUAL_SHA1=$(fingerprint SHA1)
else
  ACTUAL_SHA256=$("$APKSIGNER" verify --print-certs "$ARTIFACT" 2>/dev/null |
    awk -F': ' '/certificate SHA-256 digest/ {print $2; exit}')
  ACTUAL_SHA1=$("$APKSIGNER" verify --print-certs "$ARTIFACT" 2>/dev/null |
    awk -F': ' '/certificate SHA-1 digest/ {print $2; exit}')
fi
[[ "$ACTUAL_SHA256" == "$EXPECTED_SHA256" ]] ||
  die "Signature mismatch! expected $EXPECTED_SHA256, got ${ACTUAL_SHA256:-<unsigned>}"
echo "  SHA-1   $ACTUAL_SHA1"
echo "  SHA-256 $ACTUAL_SHA256  ✓ matches EAS"

if [[ "${INSTALL:-0}" == "1" ]]; then
  step "Installing on connected device"
  "$ADB" install -r "$ARTIFACT"
  "$ADB" shell monkey -p com.melager.mobile -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
fi

# android/ is regenerated on every run, so keep a copy whose name says which
# server it talks to. A development build must never be shipped as production.
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/mealager-apks}"
mkdir -p "$OUTPUT_DIR"
VERSION_NAME=$(node -p 'require("./app.json").expo.version')
NAMED_ARTIFACT="$OUTPUT_DIR/mealager-$VERSION_NAME-$VERSION_CODE-$TARGET_HOST.$FORMAT"
cp "$ARTIFACT" "$NAMED_ARTIFACT"
printf '\n✓ %s ready (%s)\n  version: %s (%s)\n  server:  %s\n  file:    %s\n' \
  "$(tr a-z A-Z <<<"$FORMAT")" "$(du -h "$NAMED_ARTIFACT" | cut -f1)" \
  "$VERSION_NAME" "$VERSION_CODE" "$EXPO_PUBLIC_API_URL" "$NAMED_ARTIFACT"
