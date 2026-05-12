const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

function removeStoragePermissions(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const manifestPath = path.join(
        config.modRequest.projectRoot,
        "android",
        "app",
        "src",
        "main",
        "AndroidManifest.xml",
      );

      try {
        let manifest = await fs.promises.readFile(manifestPath, "utf8");

        // Remove storage permission lines (both read and write)
        manifest = manifest.replace(
          /\s*<uses-permission\s+android:name="android.permission.READ_EXTERNAL_STORAGE"\s*\/?>\s*\n?/g,
          "",
        );
        manifest = manifest.replace(
          /\s*<uses-permission\s+android:name="android.permission.WRITE_EXTERNAL_STORAGE"\s*\/?>\s*\n?/g,
          "",
        );

        await fs.promises.writeFile(manifestPath, manifest, "utf8");
      } catch (e) {
        // If manifest doesn't exist yet or something goes wrong, just skip
        console.warn(
          "remove-storage-perms plugin: failed to update AndroidManifest.xml",
          e.message,
        );
      }

      return config;
    },
  ]);
}

module.exports = removeStoragePermissions;
