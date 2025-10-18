package com.example.bearapp; // Ensure this package is correct

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.material.bottomsheet.BottomSheetDialogFragment;

import org.osmdroid.util.GeoPoint; // Required for GeoPoint

import java.util.Locale;

public class IncidentDetailsBottomSheet extends BottomSheetDialogFragment {

    private static final String ARG_INCIDENT_ID = "incident_id";
    private static final String ARG_REPORTER_NAME = "reporter_name";
    private static final String ARG_EMERGENCY_TYPE = "emergency_type";
    private static final String ARG_LATITUDE = "latitude";
    private static final String ARG_LONGITUDE = "longitude";
    private static final String ARG_STATUS = "status";

    private String incidentId;
    private String reporterName;
    private String emergencyType;
    private double latitude;
    private double longitude;
    private String status;

    private IncidentDetailsListener mListener;

    public interface IncidentDetailsListener {
        void onConfirmIncident(String incidentId);
        void onShowRoute(GeoPoint destination, String title);
    }

    public static IncidentDetailsBottomSheet newInstance(String incidentId, String reporterName, String emergencyType,
                                                         double latitude, double longitude, String status) {
        IncidentDetailsBottomSheet fragment = new IncidentDetailsBottomSheet();
        Bundle args = new Bundle();
        args.putString(ARG_INCIDENT_ID, incidentId);
        args.putString(ARG_REPORTER_NAME, reporterName);
        args.putString(ARG_EMERGENCY_TYPE, emergencyType);
        args.putDouble(ARG_LATITUDE, latitude);
        args.putDouble(ARG_LONGITUDE, longitude);
        args.putString(ARG_STATUS, status);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            incidentId = getArguments().getString(ARG_INCIDENT_ID);
            reporterName = getArguments().getString(ARG_REPORTER_NAME);
            emergencyType = getArguments().getString(ARG_EMERGENCY_TYPE);
            latitude = getArguments().getDouble(ARG_LATITUDE);
            longitude = getArguments().getDouble(ARG_LONGITUDE);
            status = getArguments().getString(ARG_STATUS);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_incident_details, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        TextView tvReporterName = view.findViewById(R.id.tvReporterName);
        TextView tvEmergencyType = view.findViewById(R.id.tvEmergencyType);
        TextView tvIncidentLocation = view.findViewById(R.id.tvIncidentLocation);
        TextView tvIncidentStatus = view.findViewById(R.id.tvIncidentStatus);
        Button btnConfirmIncident = view.findViewById(R.id.btnConfirmIncident);
        Button btnShowRoute = view.findViewById(R.id.btnShowRoute);

        tvReporterName.setText("Reporter: " + (reporterName != null ? reporterName : "N/A"));
        tvEmergencyType.setText("Type: " + (emergencyType != null ? emergencyType : "N/A"));
        tvIncidentLocation.setText(String.format(Locale.getDefault(), "Location: %.5f, %.5f", latitude, longitude));
        tvIncidentStatus.setText("Status: " + (status != null ? status : "N/A"));

        btnConfirmIncident.setOnClickListener(v -> {
            if (mListener != null) {
                mListener.onConfirmIncident(incidentId);
            }
            dismiss();
        });

        btnShowRoute.setOnClickListener(v -> {
            if (mListener != null) {
                GeoPoint destination = new GeoPoint(latitude, longitude);
                String title = (emergencyType != null ? emergencyType : "Incident") +
                               (reporterName != null ? " (Rep: " + reporterName + ")" : "");
                mListener.onShowRoute(destination, title);
            }
            dismiss();
        });
    }

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        if (context instanceof IncidentDetailsListener) {
            mListener = (IncidentDetailsListener) context;
        } else {
            throw new RuntimeException(context.toString()
                    + " must implement IncidentDetailsListener");
        }
    }

    @Override
    public void onDetach() {
        super.onDetach();
        mListener = null;
    }
}
