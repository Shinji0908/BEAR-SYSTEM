package com.example.bearapp.network

import com.example.bearapp.models.IncidentG
import com.example.bearapp.models.LocationG
import com.example.bearapp.models.LoginResponseG
import retrofit2.Response
import retrofit2.http.*

// Guide-specific ApiService Interface with ForAppGuide suffix
interface ApiServiceForAppGuide {
    @POST("auth/login")
    suspend fun login(@Body loginRequest: LoginRequestG): Response<LoginResponseG>

    @GET("incidents")
    suspend fun getIncidents(@Header("Authorization") token: String): Response<List<IncidentG>>

    @POST("incidents")
    suspend fun createIncident(
        @Header("Authorization") token: String,
        @Body incident: CreateIncidentRequestG
    ): Response<IncidentG> // Guide expects direct Incident response

    @PUT("incidents/{id}/status")
    suspend fun updateIncidentStatus(
        @Header("Authorization") token: String,
        @Path("id") incidentId: String,
        @Body statusUpdate: StatusUpdateRequestG
    ): Response<IncidentG> // Guide expects direct Incident response
}

// Data classes for requests, as per the guide, with G suffix
data class LoginRequestG(
    val email: String,
    val password: String
)

data class CreateIncidentRequestG(
    val name: String,
    val description: String?,
    val location: LocationG, // From com.example.bearapp.models (defined in IncidentAppGuide.kt)
    val type: String
)

data class StatusUpdateRequestG(
    val status: String
)
