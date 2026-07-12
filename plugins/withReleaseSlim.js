/**
 * Config plugin: ship only real-device ABIs (armeabi-v7a + arm64-v8a).
 * The default universal APK also bundles x86 / x86_64 — emulator-only
 * architectures that roughly double the native-library payload.
 *
 * (Play Store AABs split per device automatically; this matters for the
 * directly-distributed APK.)
 */
const { withGradleProperties } = require("@expo/config-plugins");

const KEY = "reactNativeArchitectures";
const VALUE = "armeabi-v7a,arm64-v8a";

module.exports = function withReleaseSlim(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults.filter(
      (item) => !(item.type === "property" && item.key === KEY),
    );
    props.push({ type: "property", key: KEY, value: VALUE });
    cfg.modResults = props;
    return cfg;
  });
};
