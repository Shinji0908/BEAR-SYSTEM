package com.example.bearapp;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log; // Import Log
import android.view.View;
import android.widget.Button;

import androidx.appcompat.app.AppCompatActivity;

import com.example.bearapp.util.SessionManager; // Import SessionManager

public class LandingActivity extends AppCompatActivity {

    private Button btnLogin, btnSignUp;
    private static final String TAG = "LandingActivity"; // Tag for logging
    private SessionManager sessionManager; // Declare SessionManager

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "onCreate started.");

        sessionManager = new SessionManager(getApplicationContext());
        Intent intent = null; // Initialize intent to null

        if (sessionManager.isLoggedIn()) {
            String userRole = sessionManager.getUserRole();
            Log.d(TAG, "User is already logged in. Role: " + userRole + ". Redirecting to dashboard.");
            // Intent intent; // Removed declaration from here
            if ("Resident".equalsIgnoreCase(userRole)) {
                intent = new Intent(LandingActivity.this, ResidentDashboardActivity.class);
            } else if ("Responder".equalsIgnoreCase(userRole)) {
                intent = new Intent(LandingActivity.this, ResponderDashboardActivity.class);
            } else {
                Log.w(TAG, "Unknown or null user role: '" + userRole + "'. Staying on LandingActivity as fallback (should not happen if login is robust).");
                // Fallback: If role is somehow unknown after being logged in, let user see landing page to re-navigate.
                // This scenario should ideally be handled by ensuring role is always set upon login.
                // For now, we let the rest of LandingActivity's onCreate execute.
                // If this happens, user will see LandingActivity, and can click login again.
            }

            // If intent is not null, it means a valid role was found and intent was initialized.
            if (intent != null) {
                startActivity(intent);
                finish(); // Finish LandingActivity so it's not in the back stack
                return; // Important: Do not execute the rest of onCreate for LandingActivity
            }
        }

        // If not logged in OR if logged in but role was problematic (and we didn't return), proceed to show LandingActivity content:
        Log.d(TAG, "User is not logged in or role was problematic. Setting up LandingActivity UI.");
        setContentView(R.layout.activity_landing);

        btnLogin = findViewById(R.id.login);
        btnSignUp = findViewById(R.id.signup);

        if (btnLogin != null) {
            btnLogin.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Log.d(TAG, "Login button clicked. Starting LoginActivity.");
                    Intent i = new Intent(LandingActivity.this, LoginActivity.class);
                    startActivity(i);
                }
            });
        } else {
            Log.e(TAG, "Login button (R.id.login) not found in activity_landing.xml");
        }

        if (btnSignUp != null) {
            btnSignUp.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Log.d(TAG, "Sign Up button clicked. Starting SignUpPage.");
                    Intent i = new Intent(LandingActivity.this, SignUpPage.class);
                    startActivity(i);
                }
            });
        } else {
            Log.e(TAG, "SignUp button (R.id.signup) not found in activity_landing.xml");
        }
        Log.d(TAG, "onCreate finished for LandingActivity UI.");
    }
}
