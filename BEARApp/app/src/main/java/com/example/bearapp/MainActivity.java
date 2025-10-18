package com.example.bearapp;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.widget.ImageButton;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import com.example.bearapp.models.Incident;
import com.example.bearapp.models.IncidentApiResponse;
import com.example.bearapp.network.BEARApi;
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.util.SessionManager;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private ImageButton btnFire, btnPolice, btnBarangay, btnHospital;
    private FusedLocationProviderClient fusedLocationClient;
    private BEARApi api;
    private SessionManager sessionManager;

    private static final int LOCATION_PERMISSION_REQUEST = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        sessionManager = new SessionManager(getApplicationContext());
        if (!sessionManager.isLoggedIn()) {
            // If user is not logged in, redirect to LoginActivity
            Intent intent = new Intent(MainActivity.this, LoginActivity.class);
            startActivity(intent);
            finish();
            return;
        }

        btnFire = findViewById(R.id.btnFire);
        btnPolice = findViewById(R.id.btnPolice);
        btnBarangay = findViewById(R.id.btnBarangay);
        btnHospital = findViewById(R.id.btnHospital);

        api = RetrofitClient.getClient(getApplicationContext()).create(BEARApi.class);
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        btnFire.setOnClickListener(v -> sendPanicAlert("Fire"));
        btnPolice.setOnClickListener(v -> sendPanicAlert("Police"));
        btnBarangay.setOnClickListener(v -> sendPanicAlert("Barangay"));
        btnHospital.setOnClickListener(v -> sendPanicAlert("Hospital"));
    }

    private void sendPanicAlert(String type) {
        if (ActivityCompat.checkSelfPermission(this,
                Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this,
                Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {

            Log.d(TAG, "Location permission not granted. Requesting...");
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                    LOCATION_PERMISSION_REQUEST);
            return;
        }

        Log.d(TAG, "sendPanicAlert called for type: " + type + ". Requesting current location...");

        fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                .addOnSuccessListener(this, location -> {
                    if (location != null) {
                        Log.d(TAG, "getCurrentLocation success. Lat: " + location.getLatitude() +
                                   ", Lon: " + location.getLongitude());

                        String userName = sessionManager.getUserFirstName() + " " + sessionManager.getUserLastName();
                        String userContact = sessionManager.getUserContact();
                        String authToken = sessionManager.getAuthToken();

                        Incident incidentToReport = new Incident(
                                userName,
                                userContact,
                                location.getLatitude(),
                                location.getLongitude(),
                                type
                        );

                        api.reportIncident("Bearer " + authToken, incidentToReport).enqueue(new Callback<IncidentApiResponse>() {
                            @Override
                            public void onResponse(@NonNull Call<IncidentApiResponse> call, @NonNull Response<IncidentApiResponse> response) {
                                if (response.isSuccessful() && response.body() != null) {
                                    IncidentApiResponse apiResponse = response.body();
                                    Incident actualIncident = apiResponse.getIncident();

                                    Toast.makeText(MainActivity.this,
                                            "🚨 " + type + " alert sent! - " + apiResponse.getMessage(),
                                            Toast.LENGTH_SHORT).show();

                                    Intent intent = new Intent(MainActivity.this, ResidentIncidentStatusActivity.class);
                                    intent.putExtra("INCIDENT_TYPE", type);
                                    intent.putExtra("USER_LATITUDE", location.getLatitude());
                                    intent.putExtra("USER_LONGITUDE", location.getLongitude());
                                    
                                    if (actualIncident != null && actualIncident.getId() != null && !actualIncident.getId().isEmpty()) {
                                        intent.putExtra("INCIDENT_ID", actualIncident.getId());
                                        Log.d(TAG, "Incident reported, ID: " + actualIncident.getId());
                                    } else {
                                        Log.e(TAG, "Incident ID from server is null/empty.");
                                    }
                                    startActivity(intent);

                                } else {
                                    String errorBodyString = "Unknown error";
                                    try {
                                        if(response.errorBody() != null) errorBodyString = response.errorBody().string();
                                    } catch (Exception e) { Log.e(TAG, "Error parsing error body", e);}
                                    Toast.makeText(MainActivity.this,
                                            "❌ Failed to send " + type + " alert. Code: " + response.code(),
                                            Toast.LENGTH_LONG).show();
                                    Log.e(TAG, "Failed to send alert. Code: " + response.code() + " Body: " + errorBodyString);
                                }
                            }

                            @Override
                            public void onFailure(@NonNull Call<IncidentApiResponse> call, @NonNull Throwable t) {
                                Toast.makeText(MainActivity.this,
                                        "⚠ Network error: " + t.getMessage(),
                                        Toast.LENGTH_LONG).show();
                                Log.e(TAG, "Network error: " + t.getMessage(), t);
                            }
                        });

                    } else {
                        Log.w(TAG, "getCurrentLocation returned NULL location object.");
                        Toast.makeText(MainActivity.this, "Could not get current location. Alert not sent.", Toast.LENGTH_LONG).show();
                    }
                })
                .addOnFailureListener(this, e -> {
                    Log.e(TAG, "getCurrentLocation failed: " + e.getMessage(), e);
                    Toast.makeText(MainActivity.this, "Failed to get current location: " + e.getMessage(), Toast.LENGTH_LONG).show();
                });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Location permission granted. Please try sending the alert again.", Toast.LENGTH_LONG).show();
            } else {
                Toast.makeText(this,
                        "Location permission is required to send alerts.",
                        Toast.LENGTH_SHORT).show();
            }
        }
    }
}
