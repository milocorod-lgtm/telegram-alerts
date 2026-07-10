package com.milocorod.telegramalarm;

import android.app.Activity;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

public class RingtonePickerModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    private static final int REQUEST_CODE = 4201;
    private Promise pickPromise;
    private MediaPlayer mediaPlayer;

    RingtonePickerModule(ReactApplicationContext context) {
        super(context);
        context.addActivityEventListener(this);
    }

    @Override
    public String getName() {
        return "RingtonePickerModule";
    }

    @ReactMethod
    public void pickRingtone(String currentUri, Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No hay actividad activa");
            return;
        }
        pickPromise = promise;
        Intent intent = new Intent(RingtoneManager.ACTION_RINGTONE_PICKER);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_RINGTONE);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true);
        if (currentUri != null && !currentUri.isEmpty()) {
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(currentUri));
        }
        activity.startActivityForResult(intent, REQUEST_CODE);
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_CODE || pickPromise == null) return;
        Uri uri = data != null ? data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI) : null;
        if (uri != null) {
            Ringtone ringtone = RingtoneManager.getRingtone(getReactApplicationContext(), uri);
            String title = ringtone != null ? ringtone.getTitle(getReactApplicationContext()) : "Tono";
            WritableMap result = Arguments.createMap();
            result.putString("uri", uri.toString());
            result.putString("title", title);
            pickPromise.resolve(result);
        } else {
            pickPromise.resolve(null);
        }
        pickPromise = null;
    }

    @Override
    public void onNewIntent(Intent intent) {
    }

    @ReactMethod
    public void playRingtone(String uriString) {
        stopRingtone();
        try {
            Uri uri = uriString != null && !uriString.isEmpty()
                    ? Uri.parse(uriString)
                    : RingtoneManager.getActualDefaultRingtoneUri(getReactApplicationContext(), RingtoneManager.TYPE_RINGTONE);
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
            );
            mediaPlayer.setDataSource(getReactApplicationContext(), uri);
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            stopRingtone();
        }
    }

    @ReactMethod
    public void stopRingtone() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (Exception ignored) {
            }
            mediaPlayer.release();
            mediaPlayer = null;
        }
    }
}
