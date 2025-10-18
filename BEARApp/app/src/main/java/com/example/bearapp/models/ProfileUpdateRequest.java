package com.example.bearapp.models;

import com.google.gson.annotations.SerializedName;

public class ProfileUpdateRequest {

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

    // Constructor
    public ProfileUpdateRequest(String firstName, String lastName, String username, String email, String contact, String birthday) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.email = email;
        this.contact = contact;
        this.birthday = birthday;
    }

    // Getters (and Setters if you plan to modify the object after creation)
    // For a request object, often only getters are needed if constructed fully.
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
}
