/**
 * Config plugin: permissions that make prayer alerts fire EXACTLY on time
 * with the app closed.
 *
 * expo-notifications only uses AlarmManager.setExactAndAllowWhileIdle when
 * canScheduleExactAlarms() is true. On Android 12+ (and especially with
 * targetSdk 33+) that requires:
 *   - USE_EXACT_ALARM      → auto-granted; permitted by Play policy for apps
 *                            whose core function is timed alerts (adhan apps
 *                            are the canonical example).
 *   - SCHEDULE_EXACT_ALARM → the pre-13 variant (auto-granted ≤ API 32).
 * Without them alarms silently degrade to inexact and aggressive OEMs
 * (ColorOS/MIUI…) defer them until the app is reopened.
 *
 * REQUEST_IGNORE_BATTERY_OPTIMIZATIONS backs the in-app "reliable alerts"
 * action that asks the user to exempt Yaqeen from battery optimization.
 */
const { withAndroidManifest } = require("@expo/config-plugins");

const PERMISSIONS = [
  { name: "android.permission.USE_EXACT_ALARM" },
  { name: "android.permission.SCHEDULE_EXACT_ALARM", maxSdk: "32" },
  { name: "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" },
];

module.exports = function withReliableAlarms(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest["uses-permission"] = manifest["uses-permission"] ?? [];
    for (const perm of PERMISSIONS) {
      if (
        !manifest["uses-permission"].some(
          (p) => p.$["android:name"] === perm.name,
        )
      ) {
        manifest["uses-permission"].push({
          $: {
            "android:name": perm.name,
            ...(perm.maxSdk ? { "android:maxSdkVersion": perm.maxSdk } : {}),
          },
        });
      }
    }
    return cfg;
  });
};
