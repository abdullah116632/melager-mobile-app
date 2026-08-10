const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Exclude bcryptjs temp build dirs that Metro may try to watch but don't exist after install
const blockListPatterns = [/.*bcryptjs_tmp.*/];
const existing = config.resolver?.blockList;
if (Array.isArray(existing)) {
  config.resolver.blockList = [...existing, ...blockListPatterns];
} else if (existing instanceof RegExp) {
  config.resolver.blockList = [existing, ...blockListPatterns];
} else {
  config.resolver = {
    ...(config.resolver ?? {}),
    blockList: blockListPatterns,
  };
}

module.exports = withNativeWind(config, { input: "./global.css" });
