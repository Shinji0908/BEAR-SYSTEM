package com.example.bearapp.models;

import com.google.gson.annotations.SerializedName;

public class StatusUpdateRequest {

    @SerializedName("status")
    private String status;

    public StatusUpdateRequest(String status) {
        this.status = status;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
