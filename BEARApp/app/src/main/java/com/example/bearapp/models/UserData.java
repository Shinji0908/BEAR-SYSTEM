package com.example.bearapp.models;

import com.google.gson.annotations.SerializedName;

public class UserData { // This was previously named User in some contexts
    @SerializedName("id") // CORRECTED: Should be "id" to match backend JSON key
    private String id;

    @SerializedName("email")
    private String email;

    @SerializedName("role")
    private String role;

    @SerializedName("firstName")
    private String firstName;

    @SerializedName("lastName")
    private String lastName;

    @SerializedName("contact") // Assuming 'contact' is the JSON key from your backend
    private String contact;    // Field to store contact number

    @SerializedName("responderType") // Added for responder type
    private String responderType;      // Field to store responder type (e.g., "barangay", "police", etc.)

    @SerializedName("verificationStatus") // Added for verification status
    private String verificationStatus;   // Field to store verification status

    // Getters
    public String getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getContact() { // Getter for contact number
        return contact;
    }

    public String getResponderType() { // Getter for responder type
        return responderType;
    }

    public String getVerificationStatus() { // Getter for verification status
        return verificationStatus;
    }

    // Setters - if needed
    public void setId(String id) {
        this.id = id;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public void setContact(String contact) { // Setter for contact number
        this.contact = contact;
    }

    public void setResponderType(String responderType) { // Setter for responder type
        this.responderType = responderType;
    }

    public void setVerificationStatus(String verificationStatus) { // Setter for verification status
        this.verificationStatus = verificationStatus;
    }
}
