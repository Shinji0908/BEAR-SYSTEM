package com.example.bearapp.util; // Correct package

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.example.bearapp.LoginActivity; // For logout redirection

public class SessionManager {
    private static final String PREF_NAME = "BEARAppSession";
    private static final String KEY_IS_LOGGED_IN = "isLoggedIn";
    private static final String KEY_AUTH_TOKEN = "authToken";
    private static final String KEY_USER_ID = "userId";
    private static final String KEY_USER_EMAIL = "userEmail"; // Email user typed in
    private static final String KEY_USER_ROLE = "userRole";
    private static final String KEY_USER_FIRST_NAME = "userFirstName";
    private static final String KEY_USER_LAST_NAME = "userLastName";
    private static final String KEY_USER_CONTACT = "userContact";
    private static final String KEY_RESPONDER_TYPE = "responderType"; // Added for responder type
    private static final String KEY_VERIFICATION_STATUS = "verificationStatus"; // Added for verification status

    private SharedPreferences pref;
    private SharedPreferences.Editor editor;
    private Context _context;

    // Mode
    private int PRIVATE_MODE = 0;

    public SessionManager(Context context) {
        this._context = context;
        pref = _context.getSharedPreferences(PREF_NAME, PRIVATE_MODE);
        editor = pref.edit();
    }

    // Modified to include firstName, lastName, contact, and responderType
    public void createLoginSession(String token, String userId, String email, String role, String firstName, String lastName, String contact, String responderType) {
        editor.putBoolean(KEY_IS_LOGGED_IN, true);
        editor.putString(KEY_AUTH_TOKEN, token);
        editor.putString(KEY_USER_ID, userId);
        editor.putString(KEY_USER_EMAIL, email);
        editor.putString(KEY_USER_ROLE, role);
        editor.putString(KEY_USER_FIRST_NAME, firstName);
        editor.putString(KEY_USER_LAST_NAME, lastName);
        editor.putString(KEY_USER_CONTACT, contact);
        editor.putString(KEY_RESPONDER_TYPE, responderType); // Store responder type
        // Note: verificationStatus is typically fetched after login, e.g., from a profile endpoint
        editor.commit(); // Use commit() for synchronous save if critical, apply() for async
    }

    public String getAuthToken() {
        return pref.getString(KEY_AUTH_TOKEN, null);
    }

    public String getUserId() {
        return pref.getString(KEY_USER_ID, null);
    }

    public String getUserEmail() {
        return pref.getString(KEY_USER_EMAIL, null);
    }

    public String getUserRole() {
        return pref.getString(KEY_USER_ROLE, null);
    }

    public String getUserFirstName() {
        return pref.getString(KEY_USER_FIRST_NAME, null);
    }

    public String getUserLastName() {
        return pref.getString(KEY_USER_LAST_NAME, null);
    }

    public String getFullName() {
        String firstName = getUserFirstName();
        String lastName = getUserLastName();
        StringBuilder fullName = new StringBuilder();
        if (firstName != null && !firstName.isEmpty()) {
            fullName.append(firstName);
        }
        if (lastName != null && !lastName.isEmpty()) {
            if (fullName.length() > 0) {
                fullName.append(" "); // Add space if first name exists
            }
            fullName.append(lastName);
        }
        return fullName.length() > 0 ? fullName.toString() : null;
    }

    public String getUserContact() {
        return pref.getString(KEY_USER_CONTACT, null);
    }

    public String getResponderType() {
        return pref.getString(KEY_RESPONDER_TYPE, null); 
    }

    public void setResponderType(String responderType) {
        editor.putString(KEY_RESPONDER_TYPE, responderType);
        editor.commit();
    }

    // Methods for Verification Status
    public void setVerificationStatus(String verificationStatus) {
        editor.putString(KEY_VERIFICATION_STATUS, verificationStatus);
        editor.commit();
    }

    public String getVerificationStatus() {
        return pref.getString(KEY_VERIFICATION_STATUS, null); // Default to null if not set
    }

    public boolean isLoggedIn() {
        return pref.getBoolean(KEY_IS_LOGGED_IN, false);
    }

    public void checkLogin() {
        if (!this.isLoggedIn()) {
            Intent i = new Intent(_context, LoginActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            _context.startActivity(i);
        }
    }

    public void logoutUser() {
        editor.clear();
        editor.commit();

        Intent i = new Intent(_context, LoginActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        _context.startActivity(i);
    }
}
