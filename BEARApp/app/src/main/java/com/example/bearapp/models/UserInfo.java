package com.example.bearapp.models;

public class UserInfo {
    private String firstName;
    private String lastName;
    private String role; // Added
    private String responderType; // Added

    // Getters
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getRole() { return role; } // Added
    public String getResponderType() { return responderType; } // Added

    // Setters
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public void setRole(String role) { this.role = role; } // Added
    public void setResponderType(String responderType) { this.responderType = responderType; } // Added
}
