/**
 * Config plugin: localize the Android app name (the label shown under the icon
 * and as the sender name on notifications) to "يقين" for Arabic-locale devices.
 * The default label stays "Yaqeen" (from app.json `name`).
 *
 * Applied on prebuild (dev build / EAS). No effect inside Expo Go.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const AR_APP_NAME = "يقين";

module.exports = function withArabicAppName(config) {
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
};
