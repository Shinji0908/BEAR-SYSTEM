package com.example.bearapp;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.MenuItem;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;

import com.example.bearapp.models.IncidentG;
import com.example.bearapp.models.UserG;
import com.example.bearapp.models.UserProfileResponse;
import com.example.bearapp.network.BEARApi;
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.network.SocketManagerForAppGuide;
import com.example.bearapp.notification.NotificationManagerAppGuide;
import com.example.bearapp.util.SessionManager;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.material.navigation.NavigationView;

import kotlin.Unit;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ResidentDashboardActivity extends AppCompatActivity implements NavigationView.OnNavigationItemSelectedListener {
    private static final String TAG = "ResidentDashboard";
    private static final String VERIFIED_STATUS = "Verified";

    private ImageButton btnBarangay, btnPolice, btnHospital, btnFire;
    private ImageButton btnMenu;
    private ProgressBar progressBarDashboard;
    private DrawerLayout drawerLayout;
    private NavigationView navigationView;

    private FusedLocationProviderClient fusedLocationClient;
    private SessionManager sessionManager;
    private BEARApi bearApi;

    private ActivityResultLauncher<String> requestLocationPermissionLauncher;
    private ActivityResultLauncher<String> requestNotificationPermissionLauncher;
    private String pendingAlertType = null;

    private SocketManagerForAppGuide socketManager;
    private NotificationManagerAppGuide notificationManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "onCreate: Start");
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        sessionManager = new SessionManager(getApplicationContext());
        bearApi = RetrofitClient.getClient(this).create(BEARApi.class);

        if (!sessionManager.isLoggedIn()) {
            navigateToLogin();
            return;
        }

        drawerLayout = findViewById(R.id.drawer_layout);
        navigationView = findViewById(R.id.nav_view);
        navigationView.setNavigationItemSelectedListener(this);

        updateNavHeader();

        btnMenu = findViewById(R.id.btn_menu);
        btnMenu.setOnClickListener(v -> {
            if (drawerLayout != null) {
                drawerLayout.openDrawer(GravityCompat.START);
            }
        });

        btnBarangay = findViewById(R.id.btnBarangay);
        btnPolice = findViewById(R.id.btnPolice);
        btnHospital = findViewById(R.id.btnHospital);
        btnFire = findViewById(R.id.btnFire);
        progressBarDashboard = findViewById(R.id.progressBarDashboard);

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        setupLocationPermissionHandling();
        initializeNotificationPermissionLauncher();
        checkAndRequestNotificationPermission();

        btnBarangay.setOnClickListener(v -> handleAlertButtonClick("Barangay"));
        btnPolice.setOnClickListener(v -> handleAlertButtonClick("Police"));
        btnHospital.setOnClickListener(v -> handleAlertButtonClick("Hospital"));
        btnFire.setOnClickListener(v -> handleAlertButtonClick("Fire"));

        notificationManager = new NotificationManagerAppGuide(getApplicationContext(), sessionManager);
        socketManager = new SocketManagerForAppGuide();
        setupSocketCallbacks();

        String socketUrlToUse = BuildConfig.API_BASE_URL.replaceAll("/api/?$", "/");
        if (!socketUrlToUse.isEmpty()) {
            socketManager.connect(socketUrlToUse);
        }
    }

    private void updateNavHeader() {
        View headerView = navigationView.getHeaderView(0);
        TextView navUserName = headerView.findViewById(R.id.nav_header_user_name);
        TextView navUserEmail = headerView.findViewById(R.id.nav_header_textView_userEmail);

        String firstName = sessionManager.getUserFirstName();
        String lastName = sessionManager.getUserLastName();
        String email = sessionManager.getUserEmail();

        if (firstName != null && lastName != null) {
            navUserName.setText(firstName + " " + lastName);
        }
        if (email != null) {
            navUserEmail.setText(email);
        }
    }

    private void initializeNotificationPermissionLauncher() {
        requestNotificationPermissionLauncher = registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
            if (!isGranted) {
                Toast.makeText(this, "Notifications permission denied.", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void checkAndRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
    }

    private void setupSocketCallbacks() {
        socketManager.setOnConnectionStatusChanged(isConnected -> {
            runOnUiThread(() -> Log.i(TAG, "Socket Connection Status: " + isConnected));
            return Unit.INSTANCE;
        });

        socketManager.setOnIncidentStatusUpdated(incidentG -> {
            runOnUiThread(() -> {
                String currentUserId = sessionManager.getUserId();
                UserG reportedBy = incidentG.getReportedBy();
                if (reportedBy != null && reportedBy.get_id() != null && reportedBy.get_id().equals(currentUserId)) {
                    notificationManager.showIncidentNotification(incidentG, true);
                }
            });
            return Unit.INSTANCE;
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        checkVerificationStatusAndUpdateUI();
        updateNavHeader();
        navigationView.setCheckedItem(R.id.nav_dashboard);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (socketManager != null) {
            socketManager.disconnect();
        }
    }

    private void checkVerificationStatusAndUpdateUI() {
        String currentStatus = sessionManager.getVerificationStatus();
        if (currentStatus == null) {
            fetchUserProfileAndUpdateSession();
        } else {
            updateUIBasedOnVerificationStatus(currentStatus);
        }
    }

    private void fetchUserProfileAndUpdateSession() {
        String authToken = sessionManager.getAuthToken();
        if (authToken == null || authToken.isEmpty()) {
            navigateToLogin();
            return;
        }

        progressBarDashboard.setVisibility(View.VISIBLE);
        bearApi.getUserProfile("Bearer " + authToken).enqueue(new Callback<UserProfileResponse>() {
            @Override
            public void onResponse(@NonNull Call<UserProfileResponse> call, @NonNull Response<UserProfileResponse> response) {
                progressBarDashboard.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    UserProfileResponse profile = response.body();
                    sessionManager.setVerificationStatus(profile.getVerificationStatus());
                    updateUIBasedOnVerificationStatus(profile.getVerificationStatus());
                } else {
                    Toast.makeText(ResidentDashboardActivity.this, "Could not refresh profile.", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<UserProfileResponse> call, @NonNull Throwable t) {
                progressBarDashboard.setVisibility(View.GONE);
                Toast.makeText(ResidentDashboardActivity.this, "Network error refreshing profile.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void updateUIBasedOnVerificationStatus(String status) {
        boolean isVerified = VERIFIED_STATUS.equals(status);
        setAllAlertButtonsEnabled(isVerified);
    }

    private void setAllAlertButtonsEnabled(boolean enabled) {
        btnBarangay.setEnabled(enabled);
        btnPolice.setEnabled(enabled);
        btnHospital.setEnabled(enabled);
        btnFire.setEnabled(enabled);
        btnBarangay.setAlpha(enabled ? 1.0f : 0.5f);
        btnPolice.setAlpha(enabled ? 1.0f : 0.5f);
        btnHospital.setAlpha(enabled ? 1.0f : 0.5f);
        btnFire.setAlpha(enabled ? 1.0f : 0.5f);
    }

    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        int itemId = item.getItemId();
        if (itemId == R.id.nav_dashboard) {
            // Already here
        } else if (itemId == R.id.nav_edit_profile) {
            startActivity(new Intent(this, EditProfileActivity.class));
        } else if (itemId == R.id.nav_verification_status) {
            startActivity(new Intent(this, VerificationStatusActivity.class));
        } else if (itemId == R.id.nav_logout) {
            sessionManager.logoutUser();
            navigateToLogin();
        }
        drawerLayout.closeDrawer(GravityCompat.START);
        return true;
    }

    @Override
    public void onBackPressed() {
        if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START);
        } else {
            finishAffinity();
        }
    }

    private void navigateToLogin() {
        Intent intent = new Intent(this, LoginActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void setupLocationPermissionHandling() {
        requestLocationPermissionLauncher = registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
            if (isGranted) {
                if (pendingAlertType != null) {
                    proceedToIncidentStatus(pendingAlertType);
                    pendingAlertType = null;
                }
            } else {
                Toast.makeText(this, "Location permission is needed.", Toast.LENGTH_LONG).show();
                pendingAlertType = null;
            }
        });
    }

    private void handleAlertButtonClick(String type) {
        if (!VERIFIED_STATUS.equals(sessionManager.getVerificationStatus())) {
            Toast.makeText(this, "Your account is not verified.", Toast.LENGTH_LONG).show();
            return;
        }
        this.pendingAlertType = type;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestLocationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION);
        } else {
            proceedToIncidentStatus(type);
        }
    }

    private void proceedToIncidentStatus(String type) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        fusedLocationClient.getLastLocation().addOnSuccessListener(this, location -> {
            if (location != null) {
                Intent intent = new Intent(this, ResidentIncidentStatusActivity.class);
                intent.putExtra("INCIDENT_TYPE", type);
                intent.putExtra("USER_LATITUDE", location.getLatitude());
                intent.putExtra("USER_LONGITUDE", location.getLongitude());
                startActivity(intent);
            } else {
                Toast.makeText(this, "Unable to get current location.", Toast.LENGTH_LONG).show();
            }
        });
    }
}
