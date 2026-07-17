/**
 * Config plugin: set android:supportsRtl="false".
 *
 * Yaqeen handles Arabic/English direction ENTIRELY in JS (every row/text
 * carries explicit isRTL-aware styles driven by the in-app language). When
 * the device locale is Arabic, Android's native RTL mirroring would flip
 * those layouts a second time — English screens render right-aligned and
 * icons/chevrons swap sides. Disabling native RTL makes the app's own
 * direction logic the single source of truth on every device.
 */
const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withForceLtr(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$["android:supportsRtl"] = "false";
    }
    return cfg;
  });
};
