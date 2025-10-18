package com.example.bearapp.models;

import com.google.gson.annotations.SerializedName;

public class UserProfileResponse {

    @SerializedName("id") // Or common alternatives like "_id", "userId"
    private String id;

    @SerializedName("firstName")
    private String firstName;

    @SerializedName("lastName")
    private String lastName;

    @SerializedName("username")
    private String username;

    @SerializedName("email")
    private String email;

    @SerializedName("contact")
    private String contact;

    @SerializedName("birthday") // Expecting YYYY-MM-DD string
    private String birthday;

    @SerializedName("role")
    private String role;

    @SerializedName("responderType")
    private String responderType;

    @SerializedName("verificationStatus")
    private String verificationStatus;

    // Getters for all fields
    public String getId() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getContact() {
        return contact;
    }

    public String getBirthday() {
        return birthday;
    }

    public String getRole() {
        return role;
    }

    public String getResponderType() {
        return responderType;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }

    // Setters can be added if needed for other purposes, but typically not for response objects
}
