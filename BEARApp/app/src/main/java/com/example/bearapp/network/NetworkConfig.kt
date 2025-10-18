package com.example.bearapp.network // Changed package

import android.content.Context
import android.util.Log
import androidx.preference.PreferenceManager // Using androidx.preference
import com.example.bearapp.BuildConfig // Changed BuildConfig import

object NetworkConfig {

    private const val DEV_CUSTOM_API_URL_KEY = "dev_custom_api_url"
    private const val TAG = "NetworkConfig" // Tag for logging

    fun getBaseUrl(context: Context): String {
        Log.d(TAG, "getBaseUrl called.")
        Log.d(TAG, "BuildConfig.DEBUG is: ${BuildConfig.DEBUG}")

        if (BuildConfig.DEBUG) {
            val sharedPrefs = PreferenceManager.getDefaultSharedPreferences(context.applicationContext)
            val customUrl = sharedPrefs.getString(DEV_CUSTOM_API_URL_KEY, null)
            Log.d(TAG, "Attempted to read customUrl from SharedPreferences. Value: '$customUrl'")

            if (!customUrl.isNullOrBlank()) {
                Log.i(TAG, "Using custom developer API URL from SharedPreferences: $customUrl")
                return customUrl
            } else {
                Log.d(TAG, "Custom URL from SharedPreferences is null or blank.")
            }
        } else {
            Log.d(TAG, "Not a DEBUG build, skipping SharedPreferences check.")
        }
        
        val buildConfigUrl = BuildConfig.API_BASE_URL
        Log.i(TAG, "Falling back to BuildConfig API URL: $buildConfigUrl")
        
        if (buildConfigUrl.contains("YOUR_PORT")) {
            Log.e(TAG, "CRITICAL: API_BASE_URL in BuildConfig still contains YOUR_PORT placeholder! Please fix in build.gradle.kts and resync.")
            return "http://error.placeholder.url/" // Fallback to prevent crash
        }
        return buildConfigUrl
    }

    fun setCustomApiBaseUrl(context: Context, url: String?) {
        Log.d(TAG, "setCustomApiBaseUrl called with URL: $url")
        if (BuildConfig.DEBUG) { // Only allow setting in debug builds
            val sharedPrefs = PreferenceManager.getDefaultSharedPreferences(context.applicationContext)
            sharedPrefs.edit().putString(DEV_CUSTOM_API_URL_KEY, url).apply()
            Log.i(TAG, "Custom developer API URL saved to SharedPreferences: $url")
        } else {
            Log.w(TAG, "Attempted to set custom API URL in a non-debug build. Operation ignored.")
        }
    }
}
