package com.example.bearapp.services;

import android.Manifest;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Binder;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.example.bearapp.network.SocketManagerForAppGuide;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.osmdroid.util.GeoPoint;

import java.util.ArrayList;
import java.util.List;
import kotlin.Unit;

public class ConnectionService extends Service {

    private static final String TAG = "ConnectionService";
    private final IBinder binder = new LocalBinder();

    private SocketManagerForAppGuide socketManager;
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private GeoPoint currentResponderLocation;

    private final List<LocationUpdateListener> locationListeners = new ArrayList<>();
    private final List<ConnectionStatusListener> connectionStatusListeners = new ArrayList<>();

    public interface LocationUpdateListener {
        void onLocationUpdated(GeoPoint newLocation);
    }

    public interface ConnectionStatusListener {
        void onConnectionStatusChanged(boolean isConnected);
    }

    public class LocalBinder extends Binder {
        public ConnectionService getService() {
            return ConnectionService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        socketManager = new SocketManagerForAppGuide();

        socketManager.setOnConnectionStatusChanged(isConnected -> {
            Log.d(TAG, "Socket connection status changed: " + isConnected);
            notifyConnectionStatusListeners(isConnected);
            return Unit.INSTANCE;
        });

        String socketUrl = com.example.bearapp.BuildConfig.API_BASE_URL.replaceAll("/api/?$", "/");
        socketManager.connect(socketUrl);
        Log.d(TAG, "ConnectionService created and socket connect initiated.");

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
    }

    public void startLocationUpdates() {
        if (locationCallback != null) return; // Already started

        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000)
                .setMinUpdateIntervalMillis(2000)
                .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                for (android.location.Location location : locationResult.getLocations()) {
                    currentResponderLocation = new GeoPoint(location.getLatitude(), location.getLongitude());
                    Log.d(TAG, "Location updated: " + currentResponderLocation.toDoubleString());
                    notifyLocationListeners(currentResponderLocation);
                }
            }
        };

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "Permissions not granted to start location updates.");
            return;
        }
        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
        Log.d(TAG, "Started location updates.");
    }

    public void addLocationUpdateListener(LocationUpdateListener listener) {
        if (!locationListeners.contains(listener)) {
            locationListeners.add(listener);
        }
    }

    public void removeLocationUpdateListener(LocationUpdateListener listener) {
        locationListeners.remove(listener);
    }

    private void notifyLocationListeners(GeoPoint newLocation) {
        for (LocationUpdateListener listener : new ArrayList<>(locationListeners)) {
            listener.onLocationUpdated(newLocation);
        }
    }

    public void addConnectionStatusListener(ConnectionStatusListener listener) {
        if (!connectionStatusListeners.contains(listener)) {
            connectionStatusListeners.add(listener);
        }
    }

    public void removeConnectionStatusListener(ConnectionStatusListener listener) {
        connectionStatusListeners.remove(listener);
    }

    private void notifyConnectionStatusListeners(boolean isConnected) {
        for (ConnectionStatusListener listener : new ArrayList<>(connectionStatusListeners)) {
            listener.onConnectionStatusChanged(isConnected);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    public SocketManagerForAppGuide getSocketManager() {
        return socketManager;
    }

    public GeoPoint getCurrentResponderLocation() {
        return currentResponderLocation;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (socketManager != null) {
            socketManager.disconnect();
            Log.d(TAG, "Socket disconnected.");
        }
        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
            Log.d(TAG, "Location updates stopped.");
        }
    }
}
