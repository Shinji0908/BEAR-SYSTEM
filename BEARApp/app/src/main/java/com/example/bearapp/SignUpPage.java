package com.example.bearapp;

import android.app.DatePickerDialog;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.util.Patterns;
import android.view.View;
import android.widget.AdapterView;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.bearapp.network.BEARApi;
import com.example.bearapp.LoginActivity; // Kept, as it's used
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.models.RegisterRequest;
import com.example.bearapp.models.RegisterResponse;

import java.io.IOException;
import java.util.Calendar;
import java.util.Locale;

import okhttp3.ResponseBody; // Import for errorBody
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SignUpPage extends AppCompatActivity {

    private static final String TAG = "SignUpPage";

    private Spinner spinnerUserType, spinnerResponderType;
    private EditText etFirstName, etLastName, etUsername, etEmail, etContact, etPassword, etBirthday;
    private Button btnSignUp;
    private ProgressBar progressBarSignUp;
    private TextView tvSignUpError;

    private DatePickerDialog.OnDateSetListener dateSetListener;
    private String selectedRole = "Resident";
    private String selectedResponderType = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_signuppage);

        spinnerUserType = findViewById(R.id.spinner_user_type);
        spinnerResponderType = findViewById(R.id.spinner_responder_type);
        etFirstName = findViewById(R.id.fn);
        etLastName = findViewById(R.id.ln);
        etUsername = findViewById(R.id.etUsername);
        etEmail = findViewById(R.id.EmailAddress);
        etContact = findViewById(R.id.etContact);
        etPassword = findViewById(R.id.password);
        etBirthday = findViewById(R.id.bday);
        btnSignUp = findViewById(R.id.signupp);
        progressBarSignUp = findViewById(R.id.progressBarSignUp);
        tvSignUpError = findViewById(R.id.tvSignUpError);

        spinnerUserType.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                tvSignUpError.setVisibility(View.GONE);
                String selection = parent.getItemAtPosition(position).toString();
                if (selection.equals(getString(R.string.user_type_responder))) {
                    selectedRole = "Responder";
                    spinnerResponderType.setVisibility(View.VISIBLE);
                } else {
                    selectedRole = "Resident";
                    spinnerResponderType.setVisibility(View.GONE);
                    selectedResponderType = null;
                }
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {
                tvSignUpError.setVisibility(View.GONE);
                selectedRole = "Resident";
                spinnerResponderType.setVisibility(View.GONE);
                selectedResponderType = null;
            }
        });

        spinnerResponderType.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                tvSignUpError.setVisibility(View.GONE);
                if (position > 0) {
                    selectedResponderType = parent.getItemAtPosition(position).toString();
                } else {
                    selectedResponderType = null;
                }
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {
                tvSignUpError.setVisibility(View.GONE);
                selectedResponderType = null;
            }
        });

        View.OnFocusChangeListener clearErrorOnFocus = (v, hasFocus) -> {
            if (hasFocus) {
                tvSignUpError.setVisibility(View.GONE);
            }
        };
        etFirstName.setOnFocusChangeListener(clearErrorOnFocus);
        etLastName.setOnFocusChangeListener(clearErrorOnFocus);
        etUsername.setOnFocusChangeListener(clearErrorOnFocus);
        etEmail.setOnFocusChangeListener(clearErrorOnFocus);
        etContact.setOnFocusChangeListener(clearErrorOnFocus);
        etPassword.setOnFocusChangeListener(clearErrorOnFocus);
        etBirthday.setOnFocusChangeListener(clearErrorOnFocus);

        etBirthday.setOnClickListener(v -> {
            tvSignUpError.setVisibility(View.GONE);
            showDatePickerDialog();
        });

        dateSetListener = (view, year, monthOfYear, dayOfMonth) -> {
            int month = monthOfYear + 1;
            String date = String.format(Locale.getDefault(), "%04d-%02d-%02d", year, month, dayOfMonth);
            etBirthday.setText(date);
        };

        btnSignUp.setOnClickListener(v -> attemptRegistration());
    }

    private void showDatePickerDialog() {
        Calendar cal = Calendar.getInstance();
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH);
        int day = cal.get(Calendar.DAY_OF_MONTH);

        DatePickerDialog dialog = new DatePickerDialog(
                SignUpPage.this,
                android.R.style.Theme_Holo_Light_Dialog_MinWidth,
                dateSetListener,
                year, month, day);
        dialog.show();
    }

    private void attemptRegistration() {
        tvSignUpError.setVisibility(View.GONE);
        tvSignUpError.setText("");

        String firstName = etFirstName.getText().toString().trim();
        String lastName = etLastName.getText().toString().trim();
        String username = etUsername.getText().toString().trim();
        String email = etEmail.getText().toString().trim();
        String contact = etContact.getText().toString().trim();
        String password = etPassword.getText().toString().trim();
        String birthday = etBirthday.getText().toString().trim();

        if (TextUtils.isEmpty(firstName)) {
            etFirstName.setError(getString(R.string.signup_error_first_name_required));
            etFirstName.requestFocus();
            return;
        }
        if (TextUtils.isEmpty(lastName)) {
            etLastName.setError(getString(R.string.signup_error_last_name_required));
            etLastName.requestFocus();
            return;
        }
        if (TextUtils.isEmpty(email)) {
            etEmail.setError(getString(R.string.signup_error_email_required));
            etEmail.requestFocus();
            return;
        }
        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            etEmail.setError(getString(R.string.signup_error_invalid_email));
            etEmail.requestFocus();
            return;
        }
        if (TextUtils.isEmpty(password)) {
            etPassword.setError(getString(R.string.signup_error_password_required));
            etPassword.requestFocus();
            return;
        }
        if (password.length() < 6) {
            etPassword.setError(getString(R.string.signup_error_password_length));
            etPassword.requestFocus();
            return;
        }

        String finalResponderType = null;
        if ("Responder".equals(selectedRole)) {
            if (selectedResponderType == null || selectedResponderType.equals(getResources().getStringArray(R.array.responder_types_array)[0])) {
                Toast.makeText(this, getString(R.string.signup_toast_select_responder_type), Toast.LENGTH_LONG).show();
                spinnerResponderType.requestFocus();
                return;
            }
            finalResponderType = selectedResponderType;
        }

        progressBarSignUp.setVisibility(View.VISIBLE);
        btnSignUp.setEnabled(false);

        RegisterRequest registerRequest = new RegisterRequest(
                firstName,
                lastName,
                username.isEmpty() ? null : username,
                email,
                contact.isEmpty() ? null : contact,
                password,
                selectedRole,
                finalResponderType,
                birthday.isEmpty() ? null : birthday
        );

        BEARApi bearApi = RetrofitClient.getClient(getApplicationContext()).create(BEARApi.class);
        Call<RegisterResponse> call = bearApi.registerUser(registerRequest);

        call.enqueue(new Callback<RegisterResponse>() {
            @Override
            public void onResponse(@NonNull Call<RegisterResponse> call, @NonNull Response<RegisterResponse> response) {
                progressBarSignUp.setVisibility(View.GONE);
                btnSignUp.setEnabled(true);

                if (response.isSuccessful()) {
                    RegisterResponse responseBody = response.body();
                    if (responseBody != null) {
                        tvSignUpError.setVisibility(View.GONE);
                        String message = responseBody.getMessage();
                        if (message != null) {
                            Toast.makeText(SignUpPage.this, message, Toast.LENGTH_LONG).show();
                        } else {
                            Toast.makeText(SignUpPage.this, "Registration successful (no message).", Toast.LENGTH_LONG).show();
                            Log.w(TAG, "Registration successful but response message was null. HTTP: " + response.code());
                        }
                        // TODO: Change navigation to DocumentUploadActivity after session creation if token is available
                        Intent intent = new Intent(SignUpPage.this, LoginActivity.class); // Current navigation
                        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        finish();
                    } else {
                        // Successful HTTP response but empty body, or body couldn't be parsed.
                        Log.e(TAG, "Registration successful (HTTP " + response.code() + ") but response body was null or unparseable. Raw response: " + response.toString());
                        String errorHint = getString(R.string.signup_toast_registration_failed_empty_response); // Define this: "Registration failed: Empty or invalid server response."
                        if (response.code() == 204) { // No Content, often a valid success with no body
                            Toast.makeText(SignUpPage.this, "Registration successful (No Content).", Toast.LENGTH_LONG).show();
                             // TODO: Still need to decide flow here. If 204 means user created but must login, then current flow is fine.
                             // If 204 implies token *should* have been there or some implicit login, flow is broken.
                            Intent intent = new Intent(SignUpPage.this, LoginActivity.class);
                            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                            finish();
                        } else {
                            tvSignUpError.setText(errorHint);
                            tvSignUpError.setVisibility(View.VISIBLE);
                        }
                    }
                } else { // response not successful (e.g., 4xx, 5xx)
                    String errorMessage = getString(R.string.signup_toast_registration_failed);
                    ResponseBody errorBodyInstance = response.errorBody();
                    if (errorBodyInstance != null) {
                        try (ResponseBody eb = errorBodyInstance) {
                            errorMessage += " (" + response.code() + "): " + eb.string();
                        } catch (IOException e) {
                            Log.e(TAG, "Error parsing error body", e);
                            errorMessage += getString(R.string.signup_toast_error_parsing_response);
                        }
                    } else if (response.message() != null && !response.message().isEmpty()) {
                        errorMessage += " (" + response.code() + "): " + response.message();
                    } else {
                        errorMessage += " (Error code: " + response.code() + ")";
                    }
                    Log.e(TAG, "Registration API call failed: " + errorMessage);
                    tvSignUpError.setText(errorMessage);
                    tvSignUpError.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onFailure(@NonNull Call<RegisterResponse> call, @NonNull Throwable t) {
                progressBarSignUp.setVisibility(View.GONE);
                btnSignUp.setEnabled(true);
                String networkErrorMsg = getString(R.string.signup_toast_registration_network_error, t.getMessage());
                tvSignUpError.setText(networkErrorMsg);
                tvSignUpError.setVisibility(View.VISIBLE);
                Log.e(TAG, "API Call Failure", t);
            }
        });
    }
}
