package com.impactatms.app;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final String TAG = "AppUpdatePlugin";
    private long downloadId = -1;
    private PluginCall savedCall = null;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Download URL is required");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        savedCall = call;

        try {
            // Delete any previous update APK
            File apkFile = new File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "update.apk");
            if (apkFile.exists()) {
                apkFile.delete();
            }

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("Downloading Update");
            request.setDescription("Downloading latest version...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
            request.setDestinationInExternalFilesDir(activity, Environment.DIRECTORY_DOWNLOADS, "update.apk");

            DownloadManager dm = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            downloadId = dm.enqueue(request);

            Log.d(TAG, "Download started with ID: " + downloadId);

            // Register receiver for download completion
            BroadcastReceiver onComplete = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id != downloadId) return;

                    activity.unregisterReceiver(this);
                    handleDownloadComplete(activity, dm);
                }
            };

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                activity.registerReceiver(onComplete,
                        new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                        Context.RECEIVER_EXPORTED);
            } else {
                activity.registerReceiver(onComplete,
                        new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
            }

        } catch (Exception e) {
            Log.e(TAG, "Download failed", e);
            call.reject("Download failed: " + e.getMessage());
            savedCall = null;
        }
    }

    private void handleDownloadComplete(Activity activity, DownloadManager dm) {
        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(downloadId);
        Cursor cursor = dm.query(query);

        if (cursor != null && cursor.moveToFirst()) {
            int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
            int status = cursor.getInt(statusIndex);

            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                Log.d(TAG, "Download complete, launching installer");
                installApk(activity);
            } else {
                Log.e(TAG, "Download failed with status: " + status);
                if (savedCall != null) {
                    savedCall.reject("Download failed with status: " + status);
                    savedCall = null;
                }
            }
            cursor.close();
        }
    }

    private void installApk(Activity activity) {
        try {
            File apkFile = new File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "update.apk");

            if (!apkFile.exists()) {
                if (savedCall != null) {
                    savedCall.reject("APK file not found after download");
                    savedCall = null;
                }
                return;
            }

            Uri apkUri = FileProvider.getUriForFile(activity,
                    activity.getPackageName() + ".fileprovider", apkFile);

            // Temporarily exit lock task mode so the installer can show
            try {
                activity.stopLockTask();
            } catch (Exception e) {
                Log.w(TAG, "Could not stop lock task (may not be in lock task mode)", e);
            }

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(installIntent);

            if (savedCall != null) {
                savedCall.resolve();
                savedCall = null;
            }

        } catch (Exception e) {
            Log.e(TAG, "Install failed", e);
            // Re-enter lock task mode if install fails
            try {
                activity.startLockTask();
            } catch (Exception ex) {
                Log.w(TAG, "Could not re-enter lock task", ex);
            }
            if (savedCall != null) {
                savedCall.reject("Install failed: " + e.getMessage());
                savedCall = null;
            }
        }
    }
}
