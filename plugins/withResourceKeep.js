/**
 * Config plugin: protect dynamically-referenced resources from the R8
 * resource shrinker.
 *
 * The 20 takbir sounds live in res/raw and are referenced ONLY at runtime by
 * name (notification-channel sound lookup via getIdentifier). The shrinker
 * cannot see those references, so without this keep file it would strip every
 * sound and prayer alerts would fall back to silence.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const KEEP_XML =
  '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<resources xmlns:tools="http://schemas.android.com/tools"\n' +
  '    tools:keep="@raw/*" />\n';

module.exports = function withResourceKeep(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const resDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "raw",
      );
      fs.mkdirSync(resDir, { recursive: true });
      fs.writeFileSync(path.join(resDir, "keep.xml"), KEEP_XML, "utf8");
      return cfg;
    },
  ]);
};
