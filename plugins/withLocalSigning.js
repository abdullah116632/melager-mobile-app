const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Signs local Gradle builds with the app's own upload keystore instead of
 * the template's shared debug key.
 *
 * `expo prebuild --clean` regenerates android/ and wires release builds to
 * the debug key, so a locally built AAB would be refused by the Play Store,
 * and Google Sign-In fails with DEVELOPER_ERROR because that key's SHA-1 is
 * not registered with Google. Debug builds use the same key, so a dev build
 * signs in with Google too and installs over a release build.
 *
 * The keystore details are read from credentials.json when Gradle runs, so
 * no password is ever written into android/. Without that file, builds fall
 * back to the debug key as before.
 */
const SIGNING_BLOCK = `
def localCredentialsFile = new File(rootDir, "../credentials.json")
def localKeystore = localCredentialsFile.exists()
    ? new groovy.json.JsonSlurper().parse(localCredentialsFile).android.keystore
    : null
`;

const withLocalSigning = (config) =>
  withAppBuildGradle(config, (gradleConfig) => {
    let contents = gradleConfig.modResults.contents;
    if (contents.includes("localCredentialsFile")) return gradleConfig;

    contents = contents.replace(
      /^android \{/m,
      `${SIGNING_BLOCK}\nandroid {`,
    );
    contents = contents.replace(
      /signingConfigs \{\n(\s*)debug \{/,
      `signingConfigs {
$1upload {
$1    if (localKeystore != null) {
$1        storeFile new File(rootDir, "../" + localKeystore.keystorePath)
$1        storePassword localKeystore.keystorePassword
$1        keyAlias localKeystore.keyAlias
$1        keyPassword localKeystore.keyPassword
$1    }
$1}
$1debug {`,
    );
    contents = contents.replace(
      /signingConfig signingConfigs\.debug/g,
      "signingConfig localKeystore != null ? signingConfigs.upload : signingConfigs.debug",
    );

    gradleConfig.modResults.contents = contents;
    return gradleConfig;
  });

module.exports = withLocalSigning;
