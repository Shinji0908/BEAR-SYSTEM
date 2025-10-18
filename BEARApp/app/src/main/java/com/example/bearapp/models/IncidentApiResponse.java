package com.example.bearapp.models;

import com.google.gson.annotations.SerializedName;

public class IncidentApiResponse {

    @SerializedName("message")
    private String message;

    @SerializedName("incident")
    private Incident incident;

    // Getter for the message
    public String getMessage() {
        return message;
    }

    // Getter for the Incident object
    public Incident getIncident() {
        return incident;
    }

    // Optional: Setters if needed, though typically not for response objects
    public void setMessage(String message) {
        this.message = message;
    }

    public void setIncident(Incident incident) {
        this.incident = incident;
    }
}
