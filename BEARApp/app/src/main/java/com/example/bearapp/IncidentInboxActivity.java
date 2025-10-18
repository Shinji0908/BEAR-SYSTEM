package com.example.bearapp;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;
import android.view.MenuItem;
import android.view.View;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.bearapp.adapter.IncidentInboxAdapter;
import com.example.bearapp.models.Incident;
import com.example.bearapp.models.IncidentApiResponse;
import com.example.bearapp.models.IncidentG;
import com.example.bearapp.models.Location;
import com.example.bearapp.models.StatusUpdateRequest;
import com.example.bearapp.network.BEARApi;
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.network.SocketManagerForAppGuide;
import com.example.bearapp.services.ConnectionService;
import com.example.bearapp.util.SessionManager;
import com.google.android.material.navigation.NavigationView;

import java.util.ArrayList;
import java.util.List;

import kotlin.Unit;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class IncidentInboxActivity extends AppCompatActivity implements NavigationView.OnNavigationItemSelectedListener, ConnectionService.ConnectionStatusListener {

    private static final String TAG = "IncidentInboxActivity";

    private DrawerLayout drawerLayout;
    private NavigationView navigationView;

    private RecyclerView incidentRecyclerView;
    private IncidentInboxAdapter incidentAdapter;
    private List<Incident> incidentList = new ArrayList<>();
    private TextView tvEmptyMessage;

    private SessionManager sessionManager;
    private BEARApi bearApi;

    private ConnectionService connectionService;
    private boolean isServiceBound = false;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            ConnectionService.LocalBinder binder = (ConnectionService.LocalBinder) service;
            connectionService = binder.getService();
            isServiceBound = true;
            connectionService.addConnectionStatusListener(IncidentInboxActivity.this);
            Log.d(TAG, "ConnectionService bound.");
            setupSocketListeners();
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            isServiceBound = false;
            if(connectionService != null) {
                connectionService.removeConnectionStatusListener(IncidentInboxActivity.this);
            }
            Log.d(TAG, "ConnectionService unbound.");
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_incident_inbox);

        sessionManager = new SessionManager(this);
        bearApi = RetrofitClient.getClient(this).create(BEARApi.class);

        drawerLayout = findViewById(R.id.inbox_drawer_layout);
        navigationView = findViewById(R.id.inbox_nav_view);
        navigationView.setNavigationItemSelectedListener(this);

        updateNavHeader();

        ImageButton menuButton = findViewById(R.id.menuButton);
        menuButton.setOnClickListener(v -> drawerLayout.openDrawer(GravityCompat.START));

        tvEmptyMessage = findViewById(R.id.tv_empty_inbox_message);
        incidentRecyclerView = findViewById(R.id.rv_incident_inbox);
        incidentRecyclerView.setLayoutManager(new LinearLayoutManager(this));

        setupAdapter();
        checkEmptyList();
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

    private void setupAdapter() {
        incidentAdapter = new IncidentInboxAdapter(incidentList, new IncidentInboxAdapter.OnItemClickListener() {
            @Override
            public void onConfirmRouteClick(Incident incident) {
                updateIncidentStatusAndRoute(incident, "In Progress");
            }

            @Override
            public void onDismissClick(Incident incident, int position) {
                incidentList.remove(position);
                incidentAdapter.notifyItemRemoved(position);
                incidentAdapter.notifyItemRangeChanged(position, incidentList.size());
                checkEmptyList();
            }
        });
        incidentRecyclerView.setAdapter(incidentAdapter);
    }

    private void setupSocketListeners() {
        if (!isServiceBound || connectionService == null) return;

        SocketManagerForAppGuide socketManager = connectionService.getSocketManager();
        if (socketManager != null) {
            socketManager.setOnNewIncident(this::handleNewIncident);
        }
    }

    private Unit handleNewIncident(IncidentG incidentG) {
        runOnUiThread(() -> {
            Log.d(TAG, "New incident received from service");
            Incident incident = new Incident();
            incident.setId(incidentG.get_id());
            incident.setName(incidentG.getName());
            incident.setDescription(incidentG.getDescription());
            incident.setType(incidentG.getType());
            incident.setStatus(incidentG.getStatus());
            if (incidentG.getReportedBy() != null) {
                incident.setResidentName(incidentG.getReportedBy().getFirstName() + " " + incidentG.getReportedBy().getLastName());
                incident.setResidentContact(incidentG.getReportedBy().getContact());
            }
            if (incidentG.getLocation() != null) {
                incident.setLocation(new Location(incidentG.getLocation().getLatitude(), incidentG.getLocation().getLongitude()));
            }

            incidentList.add(0, incident);
            incidentAdapter.notifyItemInserted(0);
            incidentRecyclerView.scrollToPosition(0);
            checkEmptyList();
        });
        return Unit.INSTANCE;
    }

    @Override
    public void onConnectionStatusChanged(boolean isConnected) {
        runOnUiThread(() -> {
            if (isConnected) {
                Toast.makeText(IncidentInboxActivity.this, "Connected to Live Service", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void updateIncidentStatusAndRoute(Incident incident, String newStatus) {
        String authToken = sessionManager.getAuthToken();
        if (authToken == null) return;

        bearApi.updateIncidentStatus("Bearer " + authToken, incident.getId(), new StatusUpdateRequest(newStatus)).enqueue(new Callback<IncidentApiResponse>() {
            @Override
            public void onResponse(@NonNull Call<IncidentApiResponse> call, @NonNull Response<IncidentApiResponse> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(IncidentInboxActivity.this, "Incident Confirmed! Routing...", Toast.LENGTH_SHORT).show();

                    Intent intent = new Intent(IncidentInboxActivity.this, ResponderDashboardActivity.class);
                    intent.putExtra("incident", incident); // Pass the full incident object
                    startActivity(intent);

                    int index = incidentList.indexOf(incident);
                    if (index != -1) {
                        incidentList.remove(index);
                        incidentAdapter.notifyItemRemoved(index);
                        checkEmptyList();
                    }
                } else {
                    Toast.makeText(IncidentInboxActivity.this, "Failed to confirm incident.", Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<IncidentApiResponse> call, @NonNull Throwable t) {
                Toast.makeText(IncidentInboxActivity.this, "Network error.", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void checkEmptyList() {
        tvEmptyMessage.setVisibility(incidentList.isEmpty() ? View.VISIBLE : View.GONE);
        incidentRecyclerView.setVisibility(incidentList.isEmpty() ? View.GONE : View.VISIBLE);
    }

    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.nav_dashboard) {
            // Do nothing
        } else if (id == R.id.nav_map_view) {
            startActivity(new Intent(this, ResponderDashboardActivity.class));
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
        Intent intent = new Intent(this, ConnectionService.class);
        bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
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
    public void onBackPressed() {
        if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        navigationView.setCheckedItem(R.id.nav_dashboard);
        updateNavHeader();
    }
}
