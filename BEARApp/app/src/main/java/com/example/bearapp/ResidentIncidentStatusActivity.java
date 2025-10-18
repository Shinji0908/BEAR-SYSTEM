package com.example.bearapp;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.bearapp.models.Incident;
import com.example.bearapp.models.IncidentApiResponse;
import com.example.bearapp.network.BEARApi;
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.util.SessionManager;

import org.json.JSONException;
import org.json.JSONObject;
import org.osmdroid.api.IMapController;
import org.osmdroid.config.Configuration;
import org.osmdroid.tileprovider.tilesource.TileSourceFactory;
import org.osmdroid.util.GeoPoint;
import org.osmdroid.views.MapView;
import org.osmdroid.views.overlay.Marker;

import java.net.URISyntaxException;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ResidentIncidentStatusActivity extends AppCompatActivity {

    private static final String TAG = "ResidentIncidentStatus";

    private static final String EVENT_JOIN_INCIDENT = "joinIncident";
    private static final String EVENT_LEAVE_INCIDENT = "leaveIncident";
    private static final String EVENT_JOINED_INCIDENT_CONFIRMATION = "joinedIncident";
    private static final String EVENT_INCIDENT_STATUS_UPDATE = "incidentStatusUpdate";

    private TextView tvIncidentType, tvLocationInfo, tvStatusMessage;
    private EditText etIncidentDescription;
    private Button btnConfirmAlert, btnOpenChat;
    private MapView osmMapView;
    private IMapController mapController;

    private SessionManager sessionManager;
    private BEARApi api;
    private Socket mSocket;

    private String incidentTypeExtra;
    private double userLatitude, userLongitude;
    private String incidentIdFromServer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Configuration.getInstance().load(getApplicationContext(), getSharedPreferences("osmdroid", MODE_PRIVATE));
        setContentView(R.layout.activity_resident_incident_status);

        sessionManager = new SessionManager(getApplicationContext());
        api = RetrofitClient.getClient(this).create(BEARApi.class);

        tvIncidentType = findViewById(R.id.tv_incident_type);
        tvLocationInfo = findViewById(R.id.tv_location_info);
        tvStatusMessage = findViewById(R.id.tv_status_message);
        etIncidentDescription = findViewById(R.id.et_incident_description);
        btnConfirmAlert = findViewById(R.id.btn_confirm_alert);
        btnOpenChat = findViewById(R.id.btn_open_chat_resident);
        osmMapView = findViewById(R.id.map_view_resident);

        Intent intent = getIntent();
        if (intent != null) {
            incidentTypeExtra = intent.getStringExtra("INCIDENT_TYPE");
            userLatitude = intent.getDoubleExtra("USER_LATITUDE", -1);
            userLongitude = intent.getDoubleExtra("USER_LONGITUDE", -1);
            incidentIdFromServer = intent.getStringExtra("INCIDENT_ID");

            Log.d(TAG, "Received - Type: " + incidentTypeExtra + ", Lat: " + userLatitude + ", Lon: " + userLongitude + ", IncidentID: " + incidentIdFromServer);

            tvIncidentType.setText(incidentTypeExtra != null ? incidentTypeExtra : "N/A");
            if (userLatitude != -1 && userLongitude != -1) {
                tvLocationInfo.setText(String.format("Lat: %.5f, Lng: %.5f", userLatitude, userLongitude));
            } else {
                tvLocationInfo.setText("Location not provided");
            }

            if (incidentIdFromServer != null && !incidentIdFromServer.isEmpty()) {
                btnConfirmAlert.setVisibility(View.GONE);
                etIncidentDescription.setVisibility(View.GONE);
                tvStatusMessage.setText("Tracking existing incident...");
                btnOpenChat.setVisibility(View.VISIBLE); // Show chat button immediately if we have an ID
                initializeSocket();
            } else {
                btnConfirmAlert.setVisibility(View.VISIBLE);
                etIncidentDescription.setVisibility(View.VISIBLE);
                btnOpenChat.setVisibility(View.GONE); // Hide chat button initially
            }

        } else {
            Log.e(TAG, "No intent data received.");
            tvIncidentType.setText("Error");
            tvLocationInfo.setText("Error");
            tvStatusMessage.setText("Could not load incident details.");
            btnConfirmAlert.setEnabled(false);
            etIncidentDescription.setEnabled(false);
        }

        setupOpenStreetMap(userLatitude, userLongitude);

        btnConfirmAlert.setOnClickListener(v -> {
            if (incidentTypeExtra == null || userLatitude == -1 || userLongitude == -1) {
                Toast.makeText(this, "Incident details incomplete. Cannot send alert.", Toast.LENGTH_LONG).show();
                return;
            }
            confirmAndSendAlert();
        });

        // --- CORRECTED CHAT BUTTON LISTENER ---
        btnOpenChat.setOnClickListener(v -> {
            if (incidentIdFromServer != null && !incidentIdFromServer.isEmpty()) {
                Intent chatIntent = new Intent(ResidentIncidentStatusActivity.this, ChatActivity.class);
                chatIntent.putExtra("INCIDENT_ID", incidentIdFromServer);
                startActivity(chatIntent);
            } else {
                Toast.makeText(this, "Incident ID not yet available. Please wait.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setupOpenStreetMap(double latitude, double longitude) {
        if (osmMapView == null) {
            Log.e(TAG, "osmdroid MapView is null. Check XML ID: map_view_resident");
            return;
        }
        osmMapView.setTileSource(TileSourceFactory.MAPNIK);
        osmMapView.setMultiTouchControls(true);
        mapController = osmMapView.getController();

        if (latitude != -1 && longitude != -1) {
            GeoPoint incidentLocation = new GeoPoint(latitude, longitude);
            mapController.setZoom(17.0);
            mapController.setCenter(incidentLocation);
            Marker incidentMarker = new Marker(osmMapView);
            incidentMarker.setPosition(incidentLocation);
            incidentMarker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM);
            incidentMarker.setTitle("Your Reported Location");
            osmMapView.getOverlays().clear();
            osmMapView.getOverlays().add(incidentMarker);
        } else {
            mapController.setZoom(10.0);
            mapController.setCenter(new GeoPoint(14.5995, 120.9842)); // Default to Manila
            Log.w(TAG, "Incident location not available for map.");
        }
        osmMapView.invalidate();
    }

    private void confirmAndSendAlert() {
        btnConfirmAlert.setEnabled(false);
        tvStatusMessage.setText("Sending alert...");

        String description = etIncidentDescription.getText().toString().trim();
        Log.d(TAG, "Incident description input: '" + description + "'");

        String userName = sessionManager.getFullName();
        String userContact = sessionManager.getUserContact();
        String authToken = sessionManager.getAuthToken();

        if (userName == null || userName.trim().isEmpty()) {
            userName = "Unknown Resident";
        }
        if (userContact == null || userContact.trim().isEmpty()) {
            userContact = "N/A";
        }

        if (authToken == null || authToken.trim().isEmpty()) {
            Toast.makeText(this, "Authorization token not found. Please log in again.", Toast.LENGTH_LONG).show();
            Log.e(TAG, "Auth token is null or empty. Cannot send incident report.");
            tvStatusMessage.setText("Error: Not logged in.");
            btnConfirmAlert.setEnabled(true);
            return;
        }

        String incidentName = incidentTypeExtra != null && !incidentTypeExtra.trim().isEmpty()
                ? incidentTypeExtra + " Report"
                : "Incident Report";

        Incident incidentToReport = new Incident(
                incidentName,
                userContact,
                userName,
                userLatitude,
                userLongitude,
                incidentTypeExtra,
                description
        );

        api.reportIncident("Bearer " + authToken, incidentToReport).enqueue(new Callback<IncidentApiResponse>() {
            @Override
            public void onResponse(@NonNull Call<IncidentApiResponse> call, @NonNull Response<IncidentApiResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    IncidentApiResponse apiResponse = response.body();
                    Incident actualIncident = apiResponse.getIncident();

                    if (actualIncident != null && actualIncident.getId() != null && !actualIncident.getId().isEmpty()) {
                        incidentIdFromServer = actualIncident.getId();
                        Log.i(TAG, "Alert sent successfully. Incident ID: " + incidentIdFromServer);
                        Toast.makeText(ResidentIncidentStatusActivity.this, apiResponse.getMessage(), Toast.LENGTH_SHORT).show();
                        tvStatusMessage.setText("Alert sent. Waiting for responder acknowledgement.");
                        btnConfirmAlert.setVisibility(View.GONE);
                        etIncidentDescription.setVisibility(View.GONE);

                        // --- SHOW and ENABLE CHAT BUTTON ---
                        btnOpenChat.setVisibility(View.VISIBLE);

                        initializeSocket();
                    } else {
                        Log.e(TAG, "Incident or Incident ID from server is null/empty after successful report.");
                        tvStatusMessage.setText("Alert sent, but error getting tracking ID.");
                        btnConfirmAlert.setEnabled(true);
                    }
                } else {
                    String errorBody = "Unknown error";
                    try {
                        if (response.errorBody() != null) errorBody = response.errorBody().string();
                    } catch (Exception e) {
                        Log.e(TAG, "Error parsing error body", e);
                    }
                    Toast.makeText(ResidentIncidentStatusActivity.this, "Failed to send alert. Code: " + response.code(), Toast.LENGTH_LONG).show();
                    Log.e(TAG, "Failed to send alert. Code: " + response.code() + " Message: " + response.message() + " Body: " + errorBody);
                    tvStatusMessage.setText("Failed to send alert. Please try again.");
                    btnConfirmAlert.setEnabled(true);
                }
            }

            @Override
            public void onFailure(@NonNull Call<IncidentApiResponse> call, @NonNull Throwable t) {
                Log.e(TAG, "Network error sending alert: ", t);
                Toast.makeText(ResidentIncidentStatusActivity.this, "Network error: " + t.getMessage(), Toast.LENGTH_LONG).show();
                tvStatusMessage.setText("Network error. Please check connection and try again.");
                btnConfirmAlert.setEnabled(true);
            }
        });
    }

    private void initializeSocket() {
        if (incidentIdFromServer == null || incidentIdFromServer.isEmpty()) {
            Log.e(TAG, "Cannot initialize socket without a valid incidentIdFromServer.");
            return;
        }
        try {
            String socketUrl = BuildConfig.API_BASE_URL.replaceAll("/api/?$", "/");
            mSocket = IO.socket(socketUrl);
        } catch (URISyntaxException e) {
            Log.e(TAG, "Socket.IO URI Syntax Exception: " + e.getMessage());
            tvStatusMessage.setText("Error connecting to update server.");
            return;
        }

        mSocket.on(Socket.EVENT_CONNECT, onConnect);
        mSocket.on(Socket.EVENT_DISCONNECT, onDisconnect);
        mSocket.on(Socket.EVENT_CONNECT_ERROR, onConnectError);
        mSocket.on(EVENT_JOINED_INCIDENT_CONFIRMATION, onJoinedIncidentConfirmation);
        mSocket.on(EVENT_INCIDENT_STATUS_UPDATE, onIncidentStatusUpdate);

        mSocket.connect();
        Log.i(TAG, "Attempting to connect to Socket.IO server for incident: " + incidentIdFromServer);
    }

    private final Emitter.Listener onConnect = args -> runOnUiThread(() -> {
        Log.i(TAG, "Socket.IO Connected!");
        tvStatusMessage.setText("Connected for updates...");
        if (incidentIdFromServer != null && !incidentIdFromServer.isEmpty()) {
            JSONObject joinData = new JSONObject();
            try {
                joinData.put("incidentId", incidentIdFromServer);
                mSocket.emit(EVENT_JOIN_INCIDENT, joinData);
                Log.i(TAG, "Emitted " + EVENT_JOIN_INCIDENT + " for incident ID: " + incidentIdFromServer);
            } catch (JSONException e) {
                Log.e(TAG, "JSONException when creating joinData: " + e.getMessage());
            }
        }
    });

    private final Emitter.Listener onDisconnect = args -> runOnUiThread(() -> {
        Log.w(TAG, "Socket.IO Disconnected. Reason: " + (args.length > 0 ? args[0] : "Unknown"));
        tvStatusMessage.setText("Disconnected from update server.");
    });

    private final Emitter.Listener onConnectError = args -> runOnUiThread(() -> {
        Log.e(TAG, "Socket.IO Connection Error. Reason: " + (args.length > 0 ? args[0] : "Unknown"));
        tvStatusMessage.setText("Connection error for updates.");
    });

    private final Emitter.Listener onJoinedIncidentConfirmation = args -> runOnUiThread(() -> {
        Log.i(TAG, EVENT_JOINED_INCIDENT_CONFIRMATION + " event received.");
        tvStatusMessage.setText("Subscribed to incident updates.");
    });

    private final Emitter.Listener onIncidentStatusUpdate = args -> runOnUiThread(() -> {
        Log.i(TAG, EVENT_INCIDENT_STATUS_UPDATE + " event received.");
        if (args.length > 0 && args[0] instanceof JSONObject) {
            JSONObject data = (JSONObject) args[0];
            Log.d(TAG, "Status update data: " + data.toString());
            try {
                String newStatus = data.optString("newStatus", "Status not provided");
                String receivedIncidentId = data.optString("incidentId", "");

                if (incidentIdFromServer != null && incidentIdFromServer.equals(receivedIncidentId)) {
                    tvStatusMessage.setText("Status: " + newStatus);
                    // Show chat button when incident is in progress
                    if ("In Progress".equalsIgnoreCase(newStatus)) {
                        btnOpenChat.setVisibility(View.VISIBLE);
                    }
                } else {
                    Log.w(TAG, "Received status update for different/null incident");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error processing status update: " + e.getMessage());
            }
        }
    });

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mSocket != null) {
            Log.i(TAG, "Disconnecting socket for incident " + incidentIdFromServer);
            JSONObject leaveData = new JSONObject();
            try {
                leaveData.put("incidentId", incidentIdFromServer);
                mSocket.emit(EVENT_LEAVE_INCIDENT, leaveData);
            } catch (JSONException e) {
                Log.e(TAG, "JSONException when creating leaveData: " + e.getMessage());
            }
            mSocket.disconnect();
        }
    }
}
