package com.example.bearapp;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.bearapp.network.BEARApi;
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.models.LoginRequest;
import com.example.bearapp.models.LoginResponse;
import com.example.bearapp.models.UserData;
import com.example.bearapp.services.ConnectionService;
import com.example.bearapp.util.SessionManager;

import java.io.IOException;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LoginActivity extends AppCompatActivity {

    private static final String TAG = "LoginActivity";

    private EditText etEmail, etPassword;
    private Button btnLogin;
    private ProgressBar progressBarLogin;
    private boolean isResidentLogin = true;
    private SessionManager sessionManager;

    private static final String STATUS_VERIFIED = "Verified";
    private static final String STATUS_PENDING_REVIEW = "Pending";
    private static final String STATUS_REJECTED = "Rejected";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_loginpage);

        etEmail = findViewById(R.id.EmailAddress);
        etPassword = findViewById(R.id.password);
        btnLogin = findViewById(R.id.loginn);
        Spinner spinnerLoginUserType = findViewById(R.id.spinner_login_user_type);
        progressBarLogin = findViewById(R.id.progressBarLogin);

        sessionManager = new SessionManager(getApplicationContext());

        ArrayAdapter<CharSequence> adapter = ArrayAdapter.createFromResource(this,
                R.array.login_user_types_array, android.R.layout.simple_spinner_item);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerLoginUserType.setAdapter(adapter);

        spinnerLoginUserType.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                isResidentLogin = (position == 0);
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {
                isResidentLogin = true;
            }
        });

        btnLogin.setOnClickListener(v -> loginUser());
    }

    private void loginUser() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        if (TextUtils.isEmpty(email) || TextUtils.isEmpty(password)) {
            Toast.makeText(this, "Email and password are required", Toast.LENGTH_SHORT).show();
            return;
        }

        progressBarLogin.setVisibility(View.VISIBLE);
        btnLogin.setEnabled(false);

        BEARApi bearApi = RetrofitClient.getClient(getApplicationContext()).create(BEARApi.class);
        LoginRequest loginRequest = new LoginRequest(email, password);

        bearApi.loginUser(loginRequest).enqueue(new Callback<LoginResponse>() {
            @Override
            public void onResponse(@NonNull Call<LoginResponse> call, @NonNull Response<LoginResponse> response) {
                progressBarLogin.setVisibility(View.GONE);
                btnLogin.setEnabled(true);

                if (response.isSuccessful() && response.body() != null) {
                    LoginResponse loginResponse = response.body();
                    UserData userData = loginResponse.getUser();

                    if (userData != null && (isResidentLogin && "Resident".equalsIgnoreCase(userData.getRole())) || (!isResidentLogin && "Responder".equalsIgnoreCase(userData.getRole()))) {
                        sessionManager.createLoginSession(
                                loginResponse.getToken(),
                                userData.getId(),
                                userData.getEmail(),
                                userData.getRole(),
                                userData.getFirstName(),
                                userData.getLastName(),
                                userData.getContact(),
                                userData.getResponderType()
                        );
                        sessionManager.setVerificationStatus(userData.getVerificationStatus());

                        // --- NEW: Start ConnectionService for Responders ---
                        if ("Responder".equalsIgnoreCase(userData.getRole())) {
                            Intent serviceIntent = new Intent(LoginActivity.this, ConnectionService.class);
                            startService(serviceIntent);
                            Log.d(TAG, "ConnectionService started for Responder.");
                        }

                        navigateToNextScreen(userData.getRole(), userData.getVerificationStatus());
                    } else {
                        Toast.makeText(LoginActivity.this, "Role mismatch or user data is null.", Toast.LENGTH_LONG).show();
                    }
                } else {
                    handleLoginError(response);
                }
            }

            @Override
            public void onFailure(@NonNull Call<LoginResponse> call, @NonNull Throwable t) {
                progressBarLogin.setVisibility(View.GONE);
                btnLogin.setEnabled(true);
                Log.e(TAG, "Login API Call Failure", t);
                Toast.makeText(LoginActivity.this, "Connection Error. Check internet.", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void navigateToNextScreen(String role, String verificationStatus) {
        Intent intent;
        if (verificationStatus == null || verificationStatus.isEmpty() || "null".equalsIgnoreCase(verificationStatus)) {
            intent = new Intent(this, DocumentUploadActivity.class);
        } else {
            switch (verificationStatus) {
                case STATUS_VERIFIED:
                    if ("Resident".equalsIgnoreCase(role)) {
                        intent = new Intent(this, ResidentDashboardActivity.class);
                    } else {
                        intent = new Intent(this, IncidentInboxActivity.class);
                    }
                    break;
                case STATUS_PENDING_REVIEW:
                case STATUS_REJECTED:
                    intent = new Intent(this, VerificationStatusActivity.class);
                    break;
                default:
                    intent = new Intent(this, VerificationStatusActivity.class); // Fallback
                    break;
            }
        }
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void handleLoginError(Response<LoginResponse> response) {
        String errorMessage = "An unexpected error occurred.";
        if (response.code() == 401 || response.code() == 404) {
            errorMessage = "Invalid email or password.";
        } else {
            try {
                if (response.errorBody() != null) {
                    String errorBody = response.errorBody().string();
                    Log.e(TAG, "Login error: " + errorBody);
                    // You can parse the errorBody JSON here if needed
                }
            } catch (IOException e) {
                Log.e(TAG, "Error reading error body", e);
            }
        }
        Toast.makeText(LoginActivity.this, errorMessage, Toast.LENGTH_LONG).show();
    }
}
