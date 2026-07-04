/**
 * Config plugin: localize the Android app name (the label shown under the icon
 * and as the sender name on notifications) to "يقين" for Arabic-locale devices.
 * The default label stays "Yaqeen" (from app.json `name`).
 *
 * Also adds a default-locale `CFBundleDisplayName` string: the Expo `locales`
 * option writes that key into values-b+ar / values-b+en only, which release
 * lint flags as a fatal ExtraTranslation error without a default entry.
 *
 * Applied on prebuild (dev build / EAS). No effect inside Expo Go.
 */
const { withDangerousMod, withStringsXml } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const APP_NAME = "Yaqeen";
const AR_APP_NAME = "يقين";

function withArabicStrings(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const resDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "values-ar",
      );
      fs.mkdirSync(resDir, { recursive: true });
      const xml =
        '<?xml version="1.0" encoding="utf-8"?>\n' +
        "<resources>\n" +
        `  <string name="app_name">${AR_APP_NAME}</string>\n` +
        "</resources>\n";
      fs.writeFileSync(path.join(resDir, "strings.xml"), xml, "utf8");
      return cfg;
    },
  ]);
}

function withDefaultDisplayName(config) {
  return withStringsXml(config, (cfg) => {
    const resources = cfg.modResults.resources;
    resources.string = resources.string || [];
    if (!resources.string.some((s) => s.$?.name === "CFBundleDisplayName")) {
      resources.string.push({
        $: { name: "CFBundleDisplayName" },
        _: APP_NAME,
      });
    }
    return cfg;
  });
}

module.exports = function withArabicAppName(config) {
  return withDefaultDisplayName(withArabicStrings(config));
};
