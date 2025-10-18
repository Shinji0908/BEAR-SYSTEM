package com.example.bearapp;

import android.content.Intent;import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout; // Added for loadingOverlay
import android.widget.ImageView;
// import android.widget.ProgressBar; // ProgressBar is inside FrameLayout, direct control might not be needed if FrameLayout is managed
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.bearapp.models.DocumentInfo;
import com.example.bearapp.models.UserInfo;
import com.example.bearapp.models.VerificationStatusResponse;
import com.example.bearapp.network.BEARApi;
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.util.SessionManager;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class VerificationStatusActivity extends AppCompatActivity {

    private static final String TAG = "VerificationStatus";

    // XML has tvVerificationStatus (title) and tvStatusValue (for actual value)
    private TextView tvVerificationStatusTitle; // Renamed for clarity, maps to R.id.tvVerificationStatus
    private TextView tvStatusValue;          // Maps to R.id.tvStatusValue
    private TextView tvStatusSubtitle;       // Maps to R.id.tvStatusSubtitle

    private TextView tvAdminRemarks;
    private TextView tvSubmittedDocumentsLabel;
    private RecyclerView rvSubmittedDocuments;
    private TextView tvNoDocumentsMessage;
    private Button btnStatusAction;
    private Button btnRefreshStatus; // Added for the dedicated refresh button
    // private ProgressBar progressBarStatus; // Will control loadingOverlay instead
    private FrameLayout loadingOverlay; // Added

    private SubmittedDocumentsAdapter documentsAdapter;
    private List<DocumentInfo> submittedDocumentList = new ArrayList<>();
    private UserInfo currentUserInfo;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_verification_status);

        // Initialize UI Elements
        tvVerificationStatusTitle = findViewById(R.id.tvVerificationStatus); // This is the main title "Verification Status"
        tvStatusValue = findViewById(R.id.tvStatusValue);                 // This TextView will show "PENDING", "APPROVED" etc.
        tvStatusSubtitle = findViewById(R.id.tvStatusSubtitle);           // Subtitle below status value

        tvAdminRemarks = findViewById(R.id.tvAdminRemarks);
        tvSubmittedDocumentsLabel = findViewById(R.id.tvSubmittedDocumentsLabel);
        rvSubmittedDocuments = findViewById(R.id.rvSubmittedDocuments);
        tvNoDocumentsMessage = findViewById(R.id.tvNoDocumentsMessage);
        btnStatusAction = findViewById(R.id.btnStatusAction);
        btnRefreshStatus = findViewById(R.id.btnRefreshStatus); // Initialize refresh button
        loadingOverlay = findViewById(R.id.loadingOverlay);   // Initialize loading overlay

        setupRecyclerView();

        btnStatusAction.setOnClickListener(v -> {
            String buttonText = btnStatusAction.getText().toString();
            if ("Re-submit Documents".equalsIgnoreCase(buttonText)) {
                navigateToDocumentUpload();
            } else if ("Refresh".equalsIgnoreCase(buttonText)) { // This case might be less used if btnRefreshStatus is active
                fetchVerificationStatus();
            } else if ("Login".equalsIgnoreCase(buttonText)) {
                navigateToLogin();
            } else if ("Go to Dashboard".equalsIgnoreCase(buttonText)) {
                navigateToDashboard();
            }
        });

        // Set OnClickListener for the dedicated refresh button
        if (btnRefreshStatus != null) {
            btnRefreshStatus.setOnClickListener(v -> fetchVerificationStatus());
        }

        // Initial fetch in onCreate
        // fetchVerificationStatus(); // Will be called by onResume first time too
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Fetch the latest status when the activity resumes
        fetchVerificationStatus();
        Log.d(TAG, "onResume: Fetching latest verification status.");
    }

    private void setupRecyclerView() {
        documentsAdapter = new SubmittedDocumentsAdapter(submittedDocumentList);
        rvSubmittedDocuments.setLayoutManager(new LinearLayoutManager(this));
        rvSubmittedDocuments.setAdapter(documentsAdapter);
    }

    private void navigateToDashboard() {
        if (currentUserInfo != null && currentUserInfo.getRole() != null) {
            String role = currentUserInfo.getRole();
            Intent intent;
            switch (role) {
                case "Resident":
                    intent = new Intent(VerificationStatusActivity.this, ResidentDashboardActivity.class);
                    break;
                case "Responder":
                    intent = new Intent(VerificationStatusActivity.this, ResponderDashboardActivity.class);
                    // String responderType = currentUserInfo.getResponderType(); // Already part of UserInfo if needed by target activity
                    // if (responderType != null) {
                    //     intent.putExtra("RESPONDER_TYPE", responderType);
                    // }
                    break;
                default:
                    Log.w(TAG, "Unsupported or unknown user role for mobile dashboard: " + role + ". Navigating to Login.");
                    Toast.makeText(VerificationStatusActivity.this, "Your role (" + role + ") does not have a mobile dashboard.", Toast.LENGTH_LONG).show();
                    intent = new Intent(VerificationStatusActivity.this, LoginActivity.class);
                    break;
            }
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
        } else {
            Log.e(TAG, "Cannot navigate to dashboard: currentUserInfo or role is null.");
            Toast.makeText(VerificationStatusActivity.this, "Error determining user role. Please try logging in again.", Toast.LENGTH_LONG).show();
            navigateToLogin();
        }
    }


    private void fetchVerificationStatus() {
        Log.d(TAG, "Fetching verification status...");
        if (loadingOverlay != null) loadingOverlay.setVisibility(View.VISIBLE);

        // Hide content while loading for better UX
        if (tvStatusValue != null) tvStatusValue.setVisibility(View.INVISIBLE);
        if (tvStatusSubtitle != null) tvStatusSubtitle.setVisibility(View.INVISIBLE);
        if (tvAdminRemarks != null) tvAdminRemarks.setVisibility(View.INVISIBLE);
        if (rvSubmittedDocuments != null) rvSubmittedDocuments.setVisibility(View.INVISIBLE);
        if (tvSubmittedDocumentsLabel != null) tvSubmittedDocumentsLabel.setVisibility(View.INVISIBLE);
        if (tvNoDocumentsMessage != null) tvNoDocumentsMessage.setVisibility(View.INVISIBLE);

        btnStatusAction.setEnabled(false);
        if (btnRefreshStatus != null) btnRefreshStatus.setEnabled(false);


        String authToken = new SessionManager(this).getAuthToken();
        if (authToken == null || authToken.isEmpty()) {
            Toast.makeText(this, "User not logged in. Please log in again.", Toast.LENGTH_LONG).show();
            if (loadingOverlay != null) loadingOverlay.setVisibility(View.GONE);

            if (tvVerificationStatusTitle != null) tvVerificationStatusTitle.setText("Authentication Error"); // Or keep as title
            if (tvStatusValue != null) tvStatusValue.setText("N/A");
            if (tvStatusValue != null) tvStatusValue.setVisibility(View.VISIBLE);
            if (tvStatusSubtitle != null) tvStatusSubtitle.setText("Please log in to check your status.");
            if (tvStatusSubtitle != null) tvStatusSubtitle.setVisibility(View.VISIBLE);

            if (tvAdminRemarks != null) tvAdminRemarks.setText("Please log in to view your status.");
            if (tvAdminRemarks != null) tvAdminRemarks.setVisibility(View.VISIBLE);

            btnStatusAction.setText("Login");
            btnStatusAction.setEnabled(true);
            if (btnRefreshStatus != null) btnRefreshStatus.setEnabled(true); // Allow refresh/login attempt
            return;
        }

        BEARApi api = RetrofitClient.getClient(this).create(BEARApi.class);
        Call<VerificationStatusResponse> call = api.getVerificationStatus("Bearer " + authToken);

        call.enqueue(new Callback<VerificationStatusResponse>() {
            @Override
            public void onResponse(@NonNull Call<VerificationStatusResponse> call, @NonNull Response<VerificationStatusResponse> response) {
                if (loadingOverlay != null) loadingOverlay.setVisibility(View.GONE);
                // Make content visible again
                if (tvStatusValue != null) tvStatusValue.setVisibility(View.VISIBLE);
                if (tvStatusSubtitle != null) tvStatusSubtitle.setVisibility(View.VISIBLE);
                if (tvAdminRemarks != null) tvAdminRemarks.setVisibility(View.VISIBLE);
                // RecyclerView visibility will be handled in updateUiWithStatus

                btnStatusAction.setEnabled(true);
                if (btnRefreshStatus != null) btnRefreshStatus.setEnabled(true);

                if (response.isSuccessful() && response.body() != null) {
                    VerificationStatusResponse statusResponseBody = response.body();
                    String fetchedStatus = statusResponseBody.getVerificationStatus();
                    if (fetchedStatus != null) {
                        new SessionManager(VerificationStatusActivity.this).setVerificationStatus(fetchedStatus);
                        Log.d(TAG, "Fetched status via API: '" + fetchedStatus + "' and updated SessionManager.");
                    } else {
                        Log.w(TAG, "Fetched status via API was null. SessionManager not updated.");
                    }
                    updateUiWithStatus(statusResponseBody);
                } else {
                    handleApiError(response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<VerificationStatusResponse> call, @NonNull Throwable t) {
                if (loadingOverlay != null) loadingOverlay.setVisibility(View.GONE);
                // Make content visible for error message
                if (tvStatusValue != null) tvStatusValue.setVisibility(View.VISIBLE);
                if (tvStatusSubtitle != null) tvStatusSubtitle.setVisibility(View.VISIBLE);
                if (tvAdminRemarks != null) tvAdminRemarks.setVisibility(View.VISIBLE);

                btnStatusAction.setEnabled(true);
                if (btnRefreshStatus != null) btnRefreshStatus.setEnabled(true);

                Log.e(TAG, "Network Error: " + t.getMessage(), t);
                Toast.makeText(VerificationStatusActivity.this, "Network error. Please try again.", Toast.LENGTH_SHORT).show();

                if (tvStatusValue != null) tvStatusValue.setText("Network Error");
                if (tvStatusSubtitle != null) tvStatusSubtitle.setText("Check connection.");
                if (tvAdminRemarks != null) tvAdminRemarks.setText("Could not connect to the server. Please check your internet connection and try again.");
                btnStatusAction.setText("Refresh");
            }
        });
    }

    private void handleApiError(@NonNull Response<VerificationStatusResponse> response) {
        String errorMessage = "Failed to fetch status. ";
        if (response.errorBody() != null) {
            try {
                errorMessage += "Error: " + response.code() + " " + response.errorBody().string();
            } catch (IOException e) {
                Log.e(TAG, "Error parsing error body", e);
                errorMessage += "Error: " + response.code() + " " + response.message();
            }
        } else {
            errorMessage += "Error: " + response.code() + " " + response.message();
        }
        Log.e(TAG, "API Error: " + errorMessage);
        Toast.makeText(VerificationStatusActivity.this, "Could not load status.", Toast.LENGTH_SHORT).show();

        if (tvStatusValue != null) tvStatusValue.setText("Error");
        if (tvStatusSubtitle != null) tvStatusSubtitle.setText("Failed to load.");
        if (tvAdminRemarks != null) tvAdminRemarks.setText("Could not load verification status. " + (response.message() != null ? response.message() : "Unknown error"));
        btnStatusAction.setText("Refresh");
    }


    private void updateUiWithStatus(VerificationStatusResponse statusResponse) {
        if (statusResponse == null) {
            Log.e(TAG, "Status response is null after successful API call.");
            if (tvStatusValue != null) tvStatusValue.setText("Error");
            if (tvStatusSubtitle != null) tvStatusSubtitle.setText("Empty details received.");
            if (tvAdminRemarks != null) tvAdminRemarks.setText("Received empty status details.");
            btnStatusAction.setText("Refresh");
            if (tvSubmittedDocumentsLabel != null) tvSubmittedDocumentsLabel.setVisibility(View.GONE);
            if (rvSubmittedDocuments != null) rvSubmittedDocuments.setVisibility(View.GONE);
            if (tvNoDocumentsMessage != null) {
                tvNoDocumentsMessage.setText("Could not retrieve document details.");
                tvNoDocumentsMessage.setVisibility(View.VISIBLE);
            }
            this.currentUserInfo = null;
            return;
        }

        // Store user info
        this.currentUserInfo = statusResponse.getUser();
        if (this.currentUserInfo == null) {
            Log.e(TAG, "UserInfo is null in VerificationStatusResponse. Cannot determine role for navigation.");
        }


        String rawStatus = statusResponse.getVerificationStatus();
        String displayStatus = rawStatus != null ? rawStatus.toUpperCase().replace("_", " ") : "N/A";

        if (tvStatusValue != null) tvStatusValue.setText(displayStatus);

        String remarks = statusResponse.getRejectionReason(); // Admin-set remarks
        String verifiedAtDate = statusResponse.getVerifiedAt();
        String subtitleText = "Your documents are being reviewed."; // Default subtitle

        if ("APPROVED".equalsIgnoreCase(rawStatus)) {
            subtitleText = "Your account has been successfully verified" + (verifiedAtDate != null && !verifiedAtDate.isEmpty() ? " on " + verifiedAtDate : "") + ".";
            remarks = (remarks != null && !remarks.isEmpty()) ? remarks : subtitleText; // Show admin remarks or default approval message
            btnStatusAction.setText("Go to Dashboard");
            try { if (tvStatusValue != null) tvStatusValue.setTextColor(ContextCompat.getColor(this, R.color.status_approved)); }
            catch (Exception e) { Log.w(TAG, "Color resource R.color.status_approved not found."); }
        } else if ("PENDING".equalsIgnoreCase(rawStatus)) {
            // subtitleText remains default "Your documents are being reviewed."
            remarks = (remarks != null && !remarks.isEmpty()) ? remarks : "Your documents are under review. Please check back later.";
            btnStatusAction.setText("Go to Dashboard"); // Or "Refresh" if you want them to manually refresh
            try { if (tvStatusValue != null) tvStatusValue.setTextColor(ContextCompat.getColor(this, R.color.status_pending)); }
            catch (Exception e) { Log.w(TAG, "Color resource R.color.status_pending not found."); }
        } else if ("REJECTED".equalsIgnoreCase(rawStatus)) {
            subtitleText = "Your verification was rejected.";
            remarks = (remarks != null && !remarks.isEmpty()) ? remarks : "Your verification was rejected. Please see details and re-submit if necessary.";
            btnStatusAction.setText("Re-submit Documents");
            try { if (tvStatusValue != null) tvStatusValue.setTextColor(ContextCompat.getColor(this, R.color.status_rejected)); }
            catch (Exception e) { Log.w(TAG, "Color resource R.color.status_rejected not found."); }
        } else { // Catches null, empty, or other unexpected statuses
            subtitleText = "Status information unavailable.";
            remarks = (remarks != null && !remarks.isEmpty()) ? remarks : "No specific remarks provided.";
            btnStatusAction.setText("Refresh"); // Or "Go to Dashboard" if a default action is preferred
            try { if (tvStatusValue != null) tvStatusValue.setTextColor(ContextCompat.getColor(this, R.color.default_text_color)); }
            catch (Exception e) { Log.w(TAG, "Color resource R.color.default_text_color not found."); }
        }

        if (tvStatusSubtitle != null) tvStatusSubtitle.setText(subtitleText);
        if (tvAdminRemarks != null) tvAdminRemarks.setText(remarks);


        // Handle documents display
        if (statusResponse.getDocuments() != null && !statusResponse.getDocuments().isEmpty()) {
            if (tvSubmittedDocumentsLabel != null) tvSubmittedDocumentsLabel.setVisibility(View.VISIBLE);
            if (rvSubmittedDocuments != null) rvSubmittedDocuments.setVisibility(View.VISIBLE);
            if (tvNoDocumentsMessage != null) tvNoDocumentsMessage.setVisibility(View.GONE);
            submittedDocumentList.clear();
            submittedDocumentList.addAll(statusResponse.getDocuments());
            if (documentsAdapter != null) documentsAdapter.notifyDataSetChanged();
        } else {
            if (tvSubmittedDocumentsLabel != null) tvSubmittedDocumentsLabel.setVisibility(View.GONE);
            if (rvSubmittedDocuments != null) rvSubmittedDocuments.setVisibility(View.GONE);
            if (tvNoDocumentsMessage != null) {
                tvNoDocumentsMessage.setText("No submitted documents found.");
                tvNoDocumentsMessage.setVisibility(View.VISIBLE);
            }
        }
    }

    private void navigateToDocumentUpload() {
        Intent intent = new Intent(VerificationStatusActivity.this, DocumentUploadActivity.class);
        startActivity(intent);
        // Do not finish() here if you want the user to easily come back via back press
        // and have onResume trigger a refresh.
    }

    private void navigateToLogin() {
        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    // SubmittedDocumentsAdapter remains the same
    static class SubmittedDocumentsAdapter extends RecyclerView.Adapter<SubmittedDocumentsAdapter.ViewHolder> {
        private List<DocumentInfo> documents;

        SubmittedDocumentsAdapter(List<DocumentInfo> documents) {
            this.documents = documents;
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_submitted_document, parent, false);
            return new ViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            DocumentInfo document = documents.get(position);
            holder.tvDocumentName.setText(document.getType() != null ? document.getType().replace("_", " ") : "N/A");

            String statusText = "Status N/A";
            if (document.getDescription() != null && !document.getDescription().isEmpty()) {
                statusText = document.getDescription();
            } else if (document.getUploadedAt() != null && !document.getUploadedAt().isEmpty()) {
                // Consider formatting the date if you parse it
                statusText = "Uploaded: " + document.getUploadedAt();
            }
            holder.tvDocumentStatus.setText(statusText);

            String url = document.getUrl();
            String docType = document.getType() != null ? document.getType().toLowerCase() : "";

            // Determine icon based on type or URL extension
            if (docType.contains("pdf") || (url != null && url.toLowerCase().endsWith(".pdf"))) {
                holder.ivDocumentIcon.setImageResource(R.drawable.ic_file_pdf);
            } else if (docType.contains("jpg") || docType.contains("jpeg") || docType.contains("png") ||
                    (url != null && (url.toLowerCase().endsWith(".jpg") || url.toLowerCase().endsWith(".jpeg") || url.toLowerCase().endsWith(".png")))) {
                holder.ivDocumentIcon.setImageResource(R.drawable.ic_photo);
            } else {
                holder.ivDocumentIcon.setImageResource(R.drawable.ic_file_generic);
            }
        }

        @Override
        public int getItemCount() {
            return documents != null ? documents.size() : 0;
        }

        static class ViewHolder extends RecyclerView.ViewHolder {
            TextView tvDocumentName;
            TextView tvDocumentStatus;
            ImageView ivDocumentIcon;

            ViewHolder(View itemView) {
                super(itemView);
                tvDocumentName = itemView.findViewById(R.id.tvSubmittedDocumentName);
                tvDocumentStatus = itemView.findViewById(R.id.tvSubmittedDocumentStatus);
                ivDocumentIcon = itemView.findViewById(R.id.ivDocumentIcon);
            }
        }
    }
}
