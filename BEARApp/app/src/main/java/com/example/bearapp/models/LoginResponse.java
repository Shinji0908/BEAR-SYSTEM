package com.example.bearapp.models;

import com.google.gson.annotations.SerializedName;

public class LoginResponse {
    @SerializedName("message")
    private String message;

    @SerializedName("token")
    private String token;

    @SerializedName("user") // This field will hold UserData upon login
    private UserData user;  // Changed from User to UserData

    // Getters
    public String getMessage() {
        return message;
    }

    public String getToken() {
        return token;
    }

    public UserData getUser() { // Return type is UserData
        return user;
    }

    // Setters
    public void setMessage(String message) {
        this.message = message;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public void setUser(UserData user) { // Parameter type is UserData
        this.user = user;
    }
}
