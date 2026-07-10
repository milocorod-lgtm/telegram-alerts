const { withAndroidManifest, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Permisos que react-native-callkeep necesita para registrar el
// ConnectionService de Android y mostrar la llamada sobre el bloqueo.
const PERMISSIONS = [
  'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.READ_PHONE_STATE',
  'android.permission.MANAGE_OWN_CALLS',
  'android.permission.USE_FULL_SCREEN_INTENT',
  'android.permission.POST_NOTIFICATIONS',
];

function withCallKeepManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
    for (const perm of PERMISSIONS) {
      const exists = manifest.manifest['uses-permission'].some(
        (p) => p.$['android:name'] === perm
      );
      if (!exists) {
        manifest.manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    app.service = app.service || [];
    const serviceExists = app.service.some(
      (s) => s.$['android:name'] === 'io.wazo.callkeep.VoiceConnectionService'
    );
    if (!serviceExists) {
      app.service.push({
        $: {
          'android:name': 'io.wazo.callkeep.VoiceConnectionService',
          'android:label': 'TelegramAlarm',
          'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
          'android:foregroundServiceType': 'phoneCall',
          'android:exported': 'true',
        },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.telecom.ConnectionService' } }] }],
      });
    }

    return config;
  });
}

// Copia el modulo nativo del selector de tonos (no existe como paquete npm,
// asi que lo inyectamos como codigo fuente durante el prebuild).
function withRingtonePickerNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const destDir = path.join(
        projectRoot,
        'android/app/src/main/java/com/milocorod/telegramalarm'
      );
      fs.mkdirSync(destDir, { recursive: true });

      const srcDir = path.join(projectRoot, 'plugins', 'native');
      for (const file of ['RingtonePickerModule.java', 'RingtonePickerPackage.java']) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }

      return config;
    },
  ]);
}

function withRingtonePickerRegistration(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes('RingtonePickerPackage()')) {
      return config;
    }
    if (contents.includes('val packages = PackageList(this).packages')) {
      contents = contents.replace(
        'val packages = PackageList(this).packages',
        'val packages = PackageList(this).packages\n            packages.add(RingtonePickerPackage())'
      );
    } else if (
      contents.includes('List<ReactPackage> packages = new PackageList(this).getPackages();')
    ) {
      contents = contents.replace(
        'List<ReactPackage> packages = new PackageList(this).getPackages();',
        'List<ReactPackage> packages = new PackageList(this).getPackages();\n      packages.add(new RingtonePickerPackage());'
      );
    }
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withCallKeep(config) {
  config = withCallKeepManifest(config);
  config = withRingtonePickerNativeFiles(config);
  config = withRingtonePickerRegistration(config);
  return config;
};
