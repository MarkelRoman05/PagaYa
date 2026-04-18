package com.markel.pagaya;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
	private static final String TAG = "PagaYaPush";
	private static final String PREFS = "pagaya_push_prefs";
	private static final String KEY_ROTATED = "fcm_token_rotated_once";

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		rotateFcmTokenOncePerInstall();
	}

	private void rotateFcmTokenOncePerInstall() {
		SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
		boolean alreadyRotated = prefs.getBoolean(KEY_ROTATED, false);

		if (alreadyRotated) {
			return;
		}

		FirebaseMessaging.getInstance().deleteToken()
			.addOnSuccessListener(unused -> {
				prefs.edit().putBoolean(KEY_ROTATED, true).apply();
				FirebaseMessaging.getInstance().getToken()
					.addOnSuccessListener(token -> Log.i(TAG, "FCM token rotated. New token length=" + (token != null ? token.length() : 0)))
					.addOnFailureListener(error -> Log.e(TAG, "Failed to fetch new FCM token after rotation", error));
			})
			.addOnFailureListener(error -> Log.e(TAG, "Failed to rotate FCM token", error));
	}
}
