package com.example.bearapp.models;

import com.google.gson.annotations.SerializedName;

public class RegisterResponse {

    @SerializedName("message")
    private String message;

    @SerializedName("user")
    private RegisteredUserDetails user;

    // Getters
    public String getMessage() {
        return message;
    }

    public RegisteredUserDetails getUser() {
        return user;
    }

    // No constructor or setters needed if only used for GSON deserialization
}