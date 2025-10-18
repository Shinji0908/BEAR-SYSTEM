package com.example.bearapp;

import android.app.DatePickerDialog;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.util.Patterns;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.bearapp.models.ProfileUpdateRequest;
import com.example.bearapp.models.UserProfileResponse;
import com.example.bearapp.network.BEARApi;
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.util.SessionManager;

import java.io.IOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class EditProfileActivity extends AppCompatActivity {

    private static final String TAG = "EditProfileActivity";

    private EditText etEditFirstName, etEditLastName, etEditUsername, etEditEmailAddress, etEditContactNumber, etEditBirthday;
    private Button btnSaveChanges;
    private ImageButton btnBack; // Added back button
    private TextView tvEditProfileError;
    private ProgressBar progressBarEditProfile;
    private ImageView ivProfileLogo; // Keep if used, remove if not

    private Calendar birthdayCalendar;
    private SessionManager sessionManager;
    private BEARApi bearApi;
    private String currentUserId; // To store the user's ID for updates

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_edit_profile);

        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Edit Profile");
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }

        sessionManager = new SessionManager(this);
        bearApi = RetrofitClient.getClient(this).create(BEARApi.class);
        birthdayCalendar = Calendar.getInstance();

        // Initialize UI elements
        ivProfileLogo = findViewById(R.id.ivProfileLogo);
        tvEditProfileError = findViewById(R.id.tvEditProfileError);
        etEditFirstName = findViewById(R.id.etEditFirstName);
        etEditLastName = findViewById(R.id.etEditLastName);
        etEditUsername = findViewById(R.id.etEditUsername);
        etEditEmailAddress = findViewById(R.id.etEditEmailAddress);
        etEditContactNumber = findViewById(R.id.etEditContactNumber);
        etEditBirthday = findViewById(R.id.etEditBirthday);
        btnSaveChanges = findViewById(R.id.btnSaveChanges);
        btnBack = findViewById(R.id.btnBack); // Initialize back button
        progressBarEditProfile = findViewById(R.id.progressBarEditProfile);

        setupUIInteractions(); // Setup all UI interactions including back button
        loadUserProfile();
    }

    private void setupUIInteractions() {
        // Setup back button with null check
        if (btnBack != null) {
            btnBack.setOnClickListener(v -> {
                // finish(); // Finishes current activity
                onBackPressed(); // More standard way to trigger back navigation
            });
        } else {
            Log.e(TAG, "CRITICAL: btnBack (R.id.btnBack) not found in layout. Check activity_edit_profile.xml.");
        }

        // Setup save changes button
        if (btnSaveChanges != null) {
            btnSaveChanges.setOnClickListener(v -> saveProfileChanges());
        } else {
            Log.e(TAG, "CRITICAL: btnSaveChanges (R.id.btnSaveChanges) not found in layout.");
        }

        // Setup birthday picker
        setupBirthdayPicker();
    }

    private void setupBirthdayPicker() {
        DatePickerDialog.OnDateSetListener dateSetListener = (view, year, monthOfYear, dayOfMonth) -> {
            birthdayCalendar.set(Calendar.YEAR, year);
            birthdayCalendar.set(Calendar.MONTH, monthOfYear);
            birthdayCalendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);
            updateBirthdayLabel();
        };

        if (etEditBirthday != null) {
            etEditBirthday.setOnClickListener(v -> {
                int year = birthdayCalendar.get(Calendar.YEAR);
                int month = birthdayCalendar.get(Calendar.MONTH);
                int day = birthdayCalendar.get(Calendar.DAY_OF_MONTH);
                new DatePickerDialog(EditProfileActivity.this, dateSetListener, year, month, day).show();
            });
        } else {
            Log.w(TAG, "etEditBirthday not found in layout.");
        }
    }

    private void updateBirthdayLabel() {
        String myFormat = "yyyy-MM-dd"; // Desired format
        SimpleDateFormat sdf = new SimpleDateFormat(myFormat, Locale.US);
        if (etEditBirthday != null) {
            etEditBirthday.setText(sdf.format(birthdayCalendar.getTime()));
        }
    }

    private void loadUserProfile() {
        String authToken = sessionManager.getAuthToken();
        Log.d(TAG, "loadUserProfile: Called.");
        if (authToken == null || authToken.isEmpty()) {
            Log.e(TAG, "Auth token is null or empty.");
            Toast.makeText(this, "Authentication error. Please log in again.", Toast.LENGTH_LONG).show();
            return;
        }
        Log.d(TAG, "Attempting to load auth token.");
        Log.d(TAG, "Auth token retrieved. Length: " + authToken.length());

        if (progressBarEditProfile != null) {
            progressBarEditProfile.setVisibility(View.VISIBLE);
        }
        if (tvEditProfileError != null) {
            tvEditProfileError.setVisibility(View.GONE);
        }

        Log.d(TAG, "Calling GET /api/auth/profile");
        Call<UserProfileResponse> call = bearApi.getUserProfile("Bearer " + authToken);
        call.enqueue(new Callback<UserProfileResponse>() {
            @Override
            public void onResponse(@NonNull Call<UserProfileResponse> call, @NonNull Response<UserProfileResponse> response) {
                if (progressBarEditProfile != null) {
                    progressBarEditProfile.setVisibility(View.GONE);
                }
                if (response.isSuccessful() && response.body() != null) {
                    UserProfileResponse userProfile = response.body();
                    currentUserId = userProfile.getId();

                    if (etEditFirstName != null) etEditFirstName.setText(userProfile.getFirstName());
                    if (etEditLastName != null) etEditLastName.setText(userProfile.getLastName());
                    if (etEditUsername != null) etEditUsername.setText(userProfile.getUsername());
                    if (etEditEmailAddress != null) etEditEmailAddress.setText(userProfile.getEmail());
                    if (etEditContactNumber != null) etEditContactNumber.setText(userProfile.getContact());

                    if (userProfile.getBirthday() != null && !userProfile.getBirthday().isEmpty()) {
                        if (etEditBirthday != null) {
                            etEditBirthday.setText(userProfile.getBirthday());
                        }
                        try {
                            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                            birthdayCalendar.setTime(sdf.parse(userProfile.getBirthday()));
                        } catch (ParseException e) {
                            Log.e(TAG, "Error parsing birthday: " + userProfile.getBirthday(), e);
                        }
                    }
                    // Store verification status in SessionManager
                    if (userProfile.getVerificationStatus() != null) {
                        sessionManager.setVerificationStatus(userProfile.getVerificationStatus());
                        Log.d(TAG, "Verification status saved to SessionManager: " + userProfile.getVerificationStatus());
                    } else {
                        sessionManager.setVerificationStatus(null); // Explicitly set to null if not present
                        Log.d(TAG, "Verification status from profile is null, saved null to SessionManager.");
                    }

                    Log.d(TAG, "User profile loaded successfully. Username: " + userProfile.getUsername());
                } else {
                    String errorMsg = "Failed to load profile.";
                    if (response.errorBody() != null) {
                        try {
                            errorMsg += " Error: " + response.errorBody().string();
                        } catch (IOException e) {
                            Log.e(TAG, "Error parsing error body", e);
                        }
                    } else {
                        errorMsg += " Code: " + response.code();
                    }
                    if (tvEditProfileError != null) {
                        tvEditProfileError.setText(errorMsg);
                        tvEditProfileError.setVisibility(View.VISIBLE);
                    }
                    Log.e(TAG, errorMsg);
                }
            }

            @Override
            public void onFailure(@NonNull Call<UserProfileResponse> call, @NonNull Throwable t) {
                if (progressBarEditProfile != null) {
                    progressBarEditProfile.setVisibility(View.GONE);
                }
                Log.e(TAG, "Failed to load profile: " + t.getMessage(), t);
                if (tvEditProfileError != null) {
                    tvEditProfileError.setText("Network error. Please check your connection.");
                    tvEditProfileError.setVisibility(View.VISIBLE);
                }
            }
        });
    }

    private void saveProfileChanges() {
        Log.d(TAG, "saveProfileChanges: Clicked");

        String firstName = etEditFirstName != null ? etEditFirstName.getText().toString().trim() : "";
        String lastName = etEditLastName != null ? etEditLastName.getText().toString().trim() : "";
        String username = etEditUsername != null ? etEditUsername.getText().toString().trim() : "";
        String email = etEditEmailAddress != null ? etEditEmailAddress.getText().toString().trim() : "";
        String contactNumber = etEditContactNumber != null ? etEditContactNumber.getText().toString().trim() : "";
        String birthday = etEditBirthday != null ? etEditBirthday.getText().toString().trim() : "";

        // Validation
        if (TextUtils.isEmpty(firstName)) {
            if (etEditFirstName != null) {
                etEditFirstName.setError("First Name is required.");
                etEditFirstName.requestFocus();
            }
            return;
        }
        if (TextUtils.isEmpty(lastName)) {
            if (etEditLastName != null) {
                etEditLastName.setError("Last Name is required.");
                etEditLastName.requestFocus();
            }
            return;
        }
        if (TextUtils.isEmpty(email)) {
            if (etEditEmailAddress != null) {
                etEditEmailAddress.setError("Email is required.");
                etEditEmailAddress.requestFocus();
            }
            return;
        }
        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            if (etEditEmailAddress != null) {
                etEditEmailAddress.setError("Enter a valid email address.");
                etEditEmailAddress.requestFocus();
            }
            return;
        }

        if (currentUserId == null || currentUserId.isEmpty()) {
            if (tvEditProfileError != null) {
                tvEditProfileError.setText("Cannot save changes: User ID not found. Please reload profile.");
                tvEditProfileError.setVisibility(View.VISIBLE);
            }
            Log.e(TAG, "User ID is null or empty, cannot save profile.");
            return;
        }

        String authToken = sessionManager.getAuthToken();
        if (authToken == null || authToken.isEmpty()) {
            Toast.makeText(this, "Authentication error. Please log in again.", Toast.LENGTH_LONG).show();
            return;
        }

        if (tvEditProfileError != null) {
            tvEditProfileError.setVisibility(View.GONE);
        }
        if (progressBarEditProfile != null) {
            progressBarEditProfile.setVisibility(View.VISIBLE);
        }
        if (btnSaveChanges != null) {
            btnSaveChanges.setEnabled(false);
        }

        ProfileUpdateRequest updateRequest = new ProfileUpdateRequest(firstName, lastName, username, email, contactNumber, birthday);
        Log.d(TAG, "Calling PUT /api/users/" + currentUserId);

        Call<ResponseBody> call = bearApi.updateUserProfile("Bearer " + authToken, currentUserId, updateRequest);
        call.enqueue(new Callback<ResponseBody>() {
            @Override
            public void onResponse(@NonNull Call<ResponseBody> call, @NonNull Response<ResponseBody> response) {
                if (progressBarEditProfile != null) {
                    progressBarEditProfile.setVisibility(View.GONE);
                }
                if (btnSaveChanges != null) {
                    btnSaveChanges.setEnabled(true);
                }
                if (response.isSuccessful()) {
                    Toast.makeText(EditProfileActivity.this, "Profile updated successfully!", Toast.LENGTH_LONG).show();
                    Log.d(TAG, "Profile updated successfully for user ID: " + currentUserId);
                    // Optionally, you might want to reload the profile or finish the activity
                    // loadUserProfile(); // To refresh data if staying on page
                    // finish(); // To go back to the previous screen
                } else {
                    String errorMsg = "Failed to update profile.";
                    if (response.errorBody() != null) {
                        try {
                            errorMsg += " Error: " + response.errorBody().string();
                        } catch (IOException e) {
                            Log.e(TAG, "Error parsing error body for update", e);
                        }
                    } else {
                        errorMsg += " Code: " + response.code();
                    }
                    if (tvEditProfileError != null) {
                        tvEditProfileError.setText(errorMsg);
                        tvEditProfileError.setVisibility(View.VISIBLE);
                    }
                    Log.e(TAG, errorMsg);
                }
            }

            @Override
            public void onFailure(@NonNull Call<ResponseBody> call, @NonNull Throwable t) {
                if (progressBarEditProfile != null) {
                    progressBarEditProfile.setVisibility(View.GONE);
                }
                if (btnSaveChanges != null) {
                    btnSaveChanges.setEnabled(true);
                }
                Log.e(TAG, "Failed to update profile: " + t.getMessage(), t);
                if (tvEditProfileError != null) {
                    tvEditProfileError.setText("Network error. Please check your connection.");
                    tvEditProfileError.setVisibility(View.VISIBLE);
                }
            }
        });
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}