package com.example.bearapp;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;

import com.example.bearapp.models.Incident;
import com.example.bearapp.models.IncidentApiResponse;
import com.example.bearapp.models.StatusUpdateRequest;
import com.example.bearapp.network.BEARApi;
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.services.ConnectionService;
import com.example.bearapp.util.SessionManager;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.navigation.NavigationView;

import org.json.JSONArray;
import org.json.JSONObject;
import org.osmdroid.api.IMapController;
import org.osmdroid.config.Configuration;
import org.osmdroid.tileprovider.tilesource.TileSourceFactory;
import org.osmdroid.util.BoundingBox;
import org.osmdroid.util.GeoPoint;
import org.osmdroid.views.MapView;
import org.osmdroid.views.overlay.Marker;
import org.osmdroid.views.overlay.Polyline;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ResponderDashboardActivity extends AppCompatActivity implements NavigationView.OnNavigationItemSelectedListener, ConnectionService.LocationUpdateListener, ConnectionService.ConnectionStatusListener {

    private static final String TAG = "ResponderDashboardMap";

    private MapView osmMapView;
    private IMapController mapController;
    private Marker responderMarker;
    private Polyline routePolyline;
    private DrawerLayout drawerLayout;
    private NavigationView navigationView;
    private LinearLayout bottomButtonsContainer;
    private Button btnMarkResolved, btnOpenChat;

    private BEARApi bearApi;
    private SessionManager sessionManager;
    private Incident activeIncident;

    private ConnectionService connectionService;
    private boolean isServiceBound = false;
    private boolean hasCenteredMap = false;

    private ActivityResultLauncher<String> requestLocationPermissionLauncher;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            ConnectionService.LocalBinder binder = (ConnectionService.LocalBinder) service;
            connectionService = binder.getService();
            isServiceBound = true;
            connectionService.addConnectionStatusListener(ResponderDashboardActivity.this);
            connectionService.addLocationUpdateListener(ResponderDashboardActivity.this);
            connectionService.startLocationUpdates();
            Log.d(TAG, "Map: ConnectionService bound and listeners added.");
            setupMapAndInitialState();
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            isServiceBound = false;
            if (connectionService != null) {
                connectionService.removeConnectionStatusListener(ResponderDashboardActivity.this);
            }
            Log.d(TAG, "Map: ConnectionService unbound.");
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Configuration.getInstance().load(getApplicationContext(), androidx.preference.PreferenceManager.getDefaultSharedPreferences(getApplicationContext()));
        setContentView(R.layout.activity_responder_dashboard);

        sessionManager = new SessionManager(this);
        bearApi = RetrofitClient.getClient(this).create(BEARApi.class);

        initializePermissionLauncher();

        drawerLayout = findViewById(R.id.responder_dashboard_drawer);
        navigationView = findViewById(R.id.nav_view);
        navigationView.setNavigationItemSelectedListener(this);

        updateNavHeader();

        ImageButton menuButton = findViewById(R.id.menuButton);
        menuButton.setOnClickListener(v -> drawerLayout.openDrawer(GravityCompat.START));

        osmMapView = findViewById(R.id.mapView);
        FloatingActionButton centerMapFab = findViewById(R.id.centerMapFab);
        centerMapFab.setOnClickListener(v -> centerMapOnResponder());

        bottomButtonsContainer = findViewById(R.id.bottom_buttons_container);
        btnMarkResolved = findViewById(R.id.btnMarkResolved);
        btnOpenChat = findViewById(R.id.btnOpenChat);

        btnMarkResolved.setOnClickListener(v -> resolveIncident());
        btnOpenChat.setOnClickListener(v -> openChat());
    }

    private void initializePermissionLauncher() {
        requestLocationPermissionLauncher = registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
            if (isGranted) {
                Log.d(TAG, "Location permission granted.");
                bindConnectionService();
            } else {
                Toast.makeText(this, "Location permission is required to show the map.", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void checkAndRequestLocationPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            bindConnectionService();
        } else {
            requestLocationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION);
        }
    }

    private void bindConnectionService() {
        Intent intent = new Intent(this, ConnectionService.class);
        startService(intent);
        bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }

    private void updateNavHeader() {
        View headerView = navigationView.getHeaderView(0);
        TextView tvUserName = headerView.findViewById(R.id.nav_header_user_name);
        TextView tvUserEmail = headerView.findViewById(R.id.nav_header_user_email);

        String firstName = sessionManager.getUserFirstName();
        String lastName = sessionManager.getUserLastName();
        String email = sessionManager.getUserEmail();

        tvUserName.setText(firstName + " " + lastName);
        tvUserEmail.setText(email);
    }

    private void setupMapAndInitialState() {
        if (!isServiceBound || osmMapView == null) return;

        setupMapController();
        
        Intent intent = getIntent();
        if (intent != null && intent.hasExtra("incident")) {
            activeIncident = intent.getParcelableExtra("incident"); // CORRECTED to getParcelableExtra
            if (activeIncident != null) {
                displayIncidentMarker(new GeoPoint(activeIncident.getLocation().getLatitude(), activeIncident.getLocation().getLongitude()), activeIncident.getType());
                bottomButtonsContainer.setVisibility(View.VISIBLE);

                GeoPoint currentLocation = connectionService.getCurrentResponderLocation();
                if (currentLocation != null) {
                    fetchAndDisplayRoute(currentLocation, new GeoPoint(activeIncident.getLocation().getLatitude(), activeIncident.getLocation().getLongitude()));
                }
            } else {
                 bottomButtonsContainer.setVisibility(View.GONE);
                 Log.e(TAG, "Failed to retrieve incident from intent.");
            }
        } else {
            bottomButtonsContainer.setVisibility(View.GONE);
        }

        GeoPoint lastKnownLocation = connectionService.getCurrentResponderLocation();
        if (lastKnownLocation != null) {
            updateResponderMarker(lastKnownLocation);
            if (!hasCenteredMap) {
                centerMapOnResponder(lastKnownLocation);
                hasCenteredMap = true;
            }
        }
    }

    private void setupMapController() {
        osmMapView.setTileSource(TileSourceFactory.MAPNIK);
        osmMapView.setMultiTouchControls(true);
        mapController = osmMapView.getController();
        mapController.setZoom(15.0);
    }

    @Override
    public void onLocationUpdated(GeoPoint newLocation) {
        runOnUiThread(() -> {
            updateResponderMarker(newLocation);

            if (!hasCenteredMap) {
                centerMapOnResponder(newLocation);
                hasCenteredMap = true;
            }

            if (activeIncident != null && routePolyline == null) {
                GeoPoint incidentLocation = new GeoPoint(activeIncident.getLocation().getLatitude(), activeIncident.getLocation().getLongitude());
                fetchAndDisplayRoute(newLocation, incidentLocation);
            }
        });
    }

    @Override
    public void onConnectionStatusChanged(boolean isConnected) {
        runOnUiThread(() -> {
            if (isConnected) {
                Toast.makeText(this, "Connected to Live Service", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void displayIncidentMarker(GeoPoint location, String type) {
        Marker incidentMarker = new Marker(osmMapView);
        incidentMarker.setPosition(location);
        incidentMarker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM);
        incidentMarker.setTitle("Incident: " + type);
        osmMapView.getOverlays().add(incidentMarker);
    }

    private void updateResponderMarker(GeoPoint location) {
        if (osmMapView == null || location == null) return;
        if (responderMarker == null) {
            responderMarker = new Marker(osmMapView);
            responderMarker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER);
            responderMarker.setTitle("You are here");
            osmMapView.getOverlays().add(responderMarker);
        }
        responderMarker.setPosition(location);
        osmMapView.invalidate();
    }

    private void centerMapOnResponder(GeoPoint location) {
         if (mapController != null && location != null) {
            mapController.animateTo(location);
            mapController.setZoom(17.0);
        }
    }
    
    private void centerMapOnResponder() {
        if (isServiceBound && connectionService != null) {
            GeoPoint currentLocation = connectionService.getCurrentResponderLocation();
            if (currentLocation != null) {
                centerMapOnResponder(currentLocation);
            } else {
                Toast.makeText(this, "Waiting for current location...", Toast.LENGTH_SHORT).show();
            }
        }
    }

    public void fetchAndDisplayRoute(GeoPoint start, GeoPoint end) {
        if (routePolyline != null) {
            osmMapView.getOverlays().remove(routePolyline);
        }

        String urlString = "https://router.project-osrm.org/route/v1/driving/" + start.getLongitude() + "," + start.getLatitude() + ";" + end.getLongitude() + "," + end.getLatitude() + "?overview=full&geometries=geojson";

        new Thread(() -> {
            try {
                URL url = new URL(urlString);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                if (connection.getResponseCode() == 200) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                    StringBuilder responseStrBuilder = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        responseStrBuilder.append(line);
                    }
                    JSONObject jsonResponse = new JSONObject(responseStrBuilder.toString());
                    JSONArray routes = jsonResponse.getJSONArray("routes");
                    if (routes.length() > 0) {
                        JSONArray coordinates = routes.getJSONObject(0).getJSONObject("geometry").getJSONArray("coordinates");
                        ArrayList<GeoPoint> routePoints = new ArrayList<>();
                        for (int i = 0; i < coordinates.length(); i++) {
                            JSONArray coord = coordinates.getJSONArray(i);
                            routePoints.add(new GeoPoint(coord.getDouble(1), coord.getDouble(0)));
                        }
                        runOnUiThread(() -> {
                            routePolyline = new Polyline(osmMapView);
                            routePolyline.setPoints(routePoints);
                            routePolyline.getOutlinePaint().setColor(Color.BLUE);
                            routePolyline.getOutlinePaint().setStrokeWidth(12f);
                            osmMapView.getOverlays().add(0, routePolyline);
                            osmMapView.zoomToBoundingBox(BoundingBox.fromGeoPoints(routePoints), true, 100);
                            osmMapView.invalidate();
                        });
                    }
                } else {
                     Log.e(TAG, "OSRM routing error: " + connection.getResponseCode());
                }
            } catch (Exception e) {
                Log.e(TAG, "Route calculation error", e);
            }
        }).start();
    }

    private void resolveIncident() {
        if (activeIncident == null) {
            Toast.makeText(this, "No active incident to resolve.", Toast.LENGTH_SHORT).show();
            return;
        }
        updateIncidentStatusOnServer(activeIncident.getId(), "Resolved");
    }

    private void openChat() {
        if (activeIncident == null) {
            Toast.makeText(this, "No active incident for chat.", Toast.LENGTH_SHORT).show();
            return;
        }
        Intent intent = new Intent(this, ChatActivity.class);
        intent.putExtra("INCIDENT_ID", activeIncident.getId());
        startActivity(intent);
    }

    private void updateIncidentStatusOnServer(final String incidentId, final String newStatus) {
        String authToken = sessionManager.getAuthToken();
        if (authToken == null) return;

        bearApi.updateIncidentStatus("Bearer " + authToken, incidentId, new StatusUpdateRequest(newStatus)).enqueue(new Callback<IncidentApiResponse>() {
            @Override
            public void onResponse(@NonNull Call<IncidentApiResponse> call, @NonNull Response<IncidentApiResponse> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(ResponderDashboardActivity.this, "Incident marked as Resolved", Toast.LENGTH_SHORT).show();
                    bottomButtonsContainer.setVisibility(View.GONE);
                    if (routePolyline != null) {
                        osmMapView.getOverlays().remove(routePolyline);
                        osmMapView.invalidate();
                    }
                    activeIncident = null;
                    startActivity(new Intent(ResponderDashboardActivity.this, IncidentInboxActivity.class));
                    finish();
                } else {
                    Toast.makeText(ResponderDashboardActivity.this, "Failed to update status.", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<IncidentApiResponse> call, @NonNull Throwable t) {
                Toast.makeText(ResponderDashboardActivity.this, "Network error.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.nav_dashboard) {
            startActivity(new Intent(this, IncidentInboxActivity.class));
            finish();
        } else if (id == R.id.nav_map_view) {
            // Already on the map, do nothing
        } else if (id == R.id.nav_edit_profile) {
            startActivity(new Intent(this, EditProfileActivity.class));
        } else if (id == R.id.nav_verification_status) {
            startActivity(new Intent(this, VerificationStatusActivity.class));
        } else if (id == R.id.nav_logout) {
            sessionManager.logoutUser();
            if (isServiceBound) {
                unbindService(serviceConnection);
                isServiceBound = false;
            }
            stopService(new Intent(this, ConnectionService.class));
            Intent intent = new Intent(this, LandingActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finishAffinity();
        }
        drawerLayout.closeDrawer(GravityCompat.START);
        return true;
    }

    @Override
    protected void onStart() {
        super.onStart();
        checkAndRequestLocationPermission();
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (isServiceBound) {
            unbindService(serviceConnection);
            isServiceBound = false;
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (osmMapView != null) osmMapView.onResume();
        if (isServiceBound && connectionService != null) {
            connectionService.addLocationUpdateListener(this);
        }
        navigationView.setCheckedItem(R.id.nav_map_view);
        updateNavHeader();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (osmMapView != null) osmMapView.onPause();
        if (connectionService != null && isServiceBound) {
            connectionService.removeLocationUpdateListener(this);
        }
    }

    @Override
    public void onBackPressed() {
        if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }
}
