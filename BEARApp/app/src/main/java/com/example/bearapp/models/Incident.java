package com.example.bearapp.models;

import android.os.Parcel;
import android.os.Parcelable;
import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;
import java.util.Date;

// The inner LocationData class has been removed. We now use the single, Parcelable Location class.
public class Incident implements Parcelable {

    @SerializedName("name")
    @Expose
    private String name;

    @SerializedName("contact")
    @Expose
    private String contact;

    @SerializedName("location")
    @Expose
    private Location location; // Changed from LocationData

    @SerializedName("type")
    @Expose
    private String type;

    @SerializedName("_id")
    @Expose
    private String id;

    @SerializedName("status")
    @Expose
    private String status;

    @SerializedName("residentName")
    @Expose
    private String residentName;

    @SerializedName("residentContact")
    @Expose
    private String residentContact;

    @SerializedName("description")
    @Expose
    private String description;

    @SerializedName("createdAt")
    @Expose
    private Date createdAt;

    public Incident() {
    }

    public Incident(String name, String contact, double latitude, double longitude, String type) {
        this.name = name;
        this.contact = contact;
        this.location = new Location(latitude, longitude); // Use Location class
        this.type = type;
        this.description = null;
        this.status = "Pending";
        this.createdAt = new Date();
    }

    public Incident(String incidentTitle, String reporterContactInfo, String residentReporterName,
                    double latitude, double longitude, String incidentCategory, String incidentDetails) {
        this.name = incidentTitle;
        this.contact = reporterContactInfo;
        this.residentName = residentReporterName;
        this.location = new Location(latitude, longitude); // Use Location class
        this.type = incidentCategory;
        this.description = incidentDetails;
        this.status = "Pending";
        this.createdAt = new Date();
    }

    // --- Parcelable Implementation ---
    protected Incident(Parcel in) {
        id = in.readString();
        name = in.readString();
        contact = in.readString();
        location = in.readParcelable(Location.class.getClassLoader()); // Use Location class
        type = in.readString();
        status = in.readString();
        residentName = in.readString();
        residentContact = in.readString();
        description = in.readString();
        long tmpDate = in.readLong();
        createdAt = tmpDate == -1 ? null : new Date(tmpDate);
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeString(id);
        dest.writeString(name);
        dest.writeString(contact);
        dest.writeParcelable(location, flags); // Use Parcelable Location
        dest.writeString(type);
        dest.writeString(status);
        dest.writeString(residentName);
        dest.writeString(residentContact);
        dest.writeString(description);
        dest.writeLong(createdAt != null ? createdAt.getTime() : -1);
    }

    @Override
    public int describeContents() {
        return 0;
    }

    public static final Creator<Incident> CREATOR = new Creator<Incident>() {
        @Override
        public Incident createFromParcel(Parcel in) {
            return new Incident(in);
        }

        @Override
        public Incident[] newArray(int size) {
            return new Incident[size];
        }
    };
    // --- End Parcelable Implementation ---

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }
    public Location getLocation() { return location; } // Changed to Location
    public void setLocation(Location location) { this.location = location; } // Changed to Location
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getResidentName() { return residentName; }
    public void setResidentName(String residentName) { this.residentName = residentName; }
    public String getResidentContact() { return residentContact; }
    public void setResidentContact(String residentContact) { this.residentContact = residentContact; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
