const { withAndroidManifest, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Permisos que react-native-callkeep necesita para registrar el
// ConnectionService de Android y mostrar la llamada sobre el bloqueo.
const PERMISSIONS = [
  'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
  'android.permission.FOREGROUND_SERVICE',
  // Android 14+ exige este permiso granular para un foreground service de tipo
  // "phoneCall"; sin el, el sistema mata la app con SecurityException.
  'android.permission.FOREGROUND_SERVICE_PHONE_CALL',
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

    // Expo SDK 50 (Kotlin) usa la forma directa:
    //   return PackageList(this).packages
    // La envolvemos en .apply { add(...) } que agrega el paquete y devuelve la lista.
    if (contents.includes('return PackageList(this).packages\n')) {
      contents = contents.replace(
        'return PackageList(this).packages\n',
        'return PackageList(this).packages.apply {\n              add(RingtonePickerPackage())\n            }\n'
      );
    } else if (contents.includes('PackageList(this).packages.apply {')) {
      // Forma con bloque apply preexistente
      contents = contents.replace(
        'PackageList(this).packages.apply {',
        'PackageList(this).packages.apply {\n              add(RingtonePickerPackage())'
      );
    } else if (contents.includes('val packages = PackageList(this).packages')) {
      // Forma Kotlin con variable intermedia
      contents = contents.replace(
        'val packages = PackageList(this).packages',
        'val packages = PackageList(this).packages\n            packages.add(RingtonePickerPackage())'
      );
    } else if (
      contents.includes('List<ReactPackage> packages = new PackageList(this).getPackages();')
    ) {
      // Forma Java (plantillas viejas)
      contents = contents.replace(
        'List<ReactPackage> packages = new PackageList(this).getPackages();',
        'List<ReactPackage> packages = new PackageList(this).getPackages();\n      packages.add(new RingtonePickerPackage());'
      );
    } else {
      throw new Error(
        'withCallKeep: no se encontro donde registrar RingtonePickerPackage en MainApplication.'
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

// Permite que la MainActivity se dibuje SOBRE la pantalla de bloqueo y encienda
// la pantalla (necesario para la alarma de pantalla completa via Notifee).
function withLockScreenActivity(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    const activities = app.activity || [];
    for (const act of activities) {
      const name = act.$ && act.$['android:name'];
      if (name && name.endsWith('MainActivity')) {
        act.$['android:showWhenLocked'] = 'true';
        act.$['android:turnScreenOn'] = 'true';
      }
    }
    return config;
  });
}

module.exports = function withCallKeep(config) {
  config = withCallKeepManifest(config);
  config = withRingtonePickerNativeFiles(config);
  config = withRingtonePickerRegistration(config);
  config = withLockScreenActivity(config);
  return config;
};
