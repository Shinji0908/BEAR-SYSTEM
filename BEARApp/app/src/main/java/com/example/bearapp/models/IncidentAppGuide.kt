package com.example.bearapp.models

// Guide-specific data classes with G suffix to avoid collision

data class IncidentG(
    val _id: String,
    val name: String,
    val description: String?,
    val type: String, // fire, hospital, police, barangay
    val location: LocationG, // Using LocationG data class defined below
    val reportedBy: UserG?,  // Using UserG data class defined below
    val status: String = "Pending",
    val contact: String, // As per guide's Incident model structure
    val createdAt: String // As per guide's Incident model (String for date)
)

data class LocationG(
    val latitude: Double,
    val longitude: Double
)

data class UserG(
    val _id: String,
    val firstName: String,
    val lastName: String,
    val contact: String,
    val email: String // As per guide's User model structure
)

// Response wrappers as per the guide, with G suffix
data class IncidentResponseG(
    val incident: IncidentG // Uses the IncidentG data class defined above
)

data class LoginResponseG(
    val token: String,
    val user: UserG // Uses the UserG data class defined above
)
