package com.example.bearapp.models;

import com.google.gson.annotations.SerializedName;

public class RegisteredUserDetails {

    @SerializedName("id")
    private String id;

    @SerializedName("firstName")
    private String firstName;

    @SerializedName("lastName")
    private String lastName;

    @SerializedName("username")
    private String username;

    @SerializedName("email")
    private String email;

    @SerializedName("role")
    private String role;

    @SerializedName("responderType")
    private String responderType; // Can be null

    @SerializedName("birthday")
    private String birthday; // Can be null

    // Getters
    public String getId() { return id; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getResponderType() { return responderType; }
    public String getBirthday() { return birthday; }

    // No constructor needed if only used for GSON deserialization
    // No setters needed if data is immutable after creation
}