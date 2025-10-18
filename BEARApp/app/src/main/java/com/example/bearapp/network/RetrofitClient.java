package com.example.bearapp.network;

import android.content.Context;
import android.util.Log;

import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class RetrofitClient {

    // Removed the static BASE_URL constant
    private static Retrofit retrofit = null; // Keep it nullable
    private static String currentBaseUrl = null; // To track the URL used by the current Retrofit instance

    private static final String TAG = "RetrofitClient";

    // Singleton pattern → Only one Retrofit instance for a given Base URL
    public static Retrofit getClient(Context context) {
        String newBaseUrl = NetworkConfig.INSTANCE.getBaseUrl(context.getApplicationContext());
        Log.d(TAG, "getClient called. Requested Base URL from NetworkConfig: " + newBaseUrl);

        if (retrofit == null || currentBaseUrl == null || !currentBaseUrl.equals(newBaseUrl)) {
            Log.d(TAG, "Creating new Retrofit instance.");
            Log.d(TAG, "Old Base URL was: " + currentBaseUrl);
            Log.d(TAG, "New Base URL is: " + newBaseUrl);
            currentBaseUrl = newBaseUrl; // Update the current base URL
            retrofit = new Retrofit.Builder()
                    .baseUrl(currentBaseUrl) // Use the dynamically fetched URL
                    .addConverterFactory(GsonConverterFactory.create())
                    .build();
        } else {
            Log.d(TAG, "Reusing existing Retrofit instance with Base URL: " + currentBaseUrl);
        }
        return retrofit;
    }

    // Optional: Method to explicitly clear the cached Retrofit instance
    // This can be useful if you know the base URL needs to change dramatically
    // and you want to force a re-creation on the next getClient() call.
    public static void clearInstance() {
        Log.d(TAG, "Retrofit instance cleared.");
        retrofit = null;
        currentBaseUrl = null;
    }
}
