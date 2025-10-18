package com.example.bearapp.models;

import com.google.gson.annotations.SerializedName;

public class RegisterRequest {

    @SerializedName("firstName")
    private String firstName;

    @SerializedName("lastName")
    private String lastName;

    @SerializedName("username")
    private String username; // Optional

    @SerializedName("email")
    private String email;

    @SerializedName("contact")
    private String contact; // Optional

    @SerializedName("password")
    private String password;

    @SerializedName("role")
    private String role; // "Resident" or "Responder"

    @SerializedName("responderType")
    private String responderType; // Required if role is "Responder", otherwise can be null

    @SerializedName("birthday")
    private String birthday; // Optional, format YYYY-MM-DD

    // Constructor
    public RegisterRequest(String firstName, String lastName, String username, String email,
                           String contact, String password, String role, String responderType, String birthday) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.email = email;
        this.contact = contact;
        this.password = password;
        this.role = role;
        this.responderType = responderType;
        this.birthday = birthday;
    }

    // Getters (and setters if you need to modify the object after creation, though often not needed for request objects)
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

    public String getPassword() {
        return password;
    }

    public String getRole() {
        return role;
    }

    public String getResponderType() {
        return responderType;
    }

    public String getBirthday() {
        return birthday;
    }
}
