package com.example.bearapp.network;

import com.example.bearapp.models.Incident;
import com.example.bearapp.models.IncidentApiResponse;
import com.example.bearapp.models.LoginRequest;
import com.example.bearapp.models.LoginResponse;
import com.example.bearapp.models.Message;
import com.example.bearapp.models.ProfileUpdateRequest;
import com.example.bearapp.models.RegisterRequest;
import com.example.bearapp.models.RegisterResponse;
import com.example.bearapp.models.StatusUpdateRequest;
import com.example.bearapp.models.UserProfileResponse;
import com.example.bearapp.models.VerificationStatusResponse;

import java.util.List;

import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.Multipart;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Part;
import retrofit2.http.Path;

public interface BEARApi {
    @POST("api/auth/register")
    Call<RegisterResponse> registerUser(@Body RegisterRequest registerRequest);

    @POST("api/auth/login")
    Call<LoginResponse> loginUser(@Body LoginRequest loginRequest);

    // User Profile Endpoints
    @GET("api/auth/profile")
    Call<UserProfileResponse> getUserProfile(@Header("Authorization") String authToken);

    @PUT("api/users/{id}")
    Call<ResponseBody> updateUserProfile(
            @Header("Authorization") String authToken,
            @Path("id") String userId,
            @Body ProfileUpdateRequest profileUpdateRequest // Using the specific request model
    );

    @POST("api/incidents")
    Call<IncidentApiResponse> reportIncident(@Header("Authorization") String authToken, @Body Incident incident);

    @GET("api/incidents")
    Call<List<Incident>> getActiveIncidents(@Header("Authorization") String authToken);

    @GET("api/incidents/{incidentId}")
    Call<IncidentApiResponse> getIncidentById(
            @Header("Authorization") String authToken,
            @Path("incidentId") String incidentId
    );

    @PUT("api/incidents/{incidentId}/status")
    Call<IncidentApiResponse> updateIncidentStatus(
            @Header("Authorization") String authToken,
            @Path("incidentId") String incidentId,
            @Body StatusUpdateRequest statusUpdate
    );

    // Verification System Endpoints

    @Multipart
    @POST("api/verification/upload-documents")
    Call<ResponseBody> uploadVerificationDocuments(
            @Header("Authorization") String authToken,
            @Part List<MultipartBody.Part> documents,
            @Part("documentType") RequestBody documentType,
            @Part("description") RequestBody description
    );

    @GET("api/verification/status")
    Call<VerificationStatusResponse> getVerificationStatus(
            @Header("Authorization") String authToken
    );

    // Debug Endpoints from Backend Developer
    @GET("api/verification/debug")
    Call<ResponseBody> getVerificationDebugInfo();

    @Multipart
    @POST("api/verification/test-upload")
    Call<ResponseBody> testUploadVerificationDocuments(
            @Header("Authorization") String authToken,
            @Part List<MultipartBody.Part> documents,
            @Part("documentType") RequestBody documentType,
            @Part("description") RequestBody description
    );

    @Multipart
    @POST("api/verification/simple-test")
    Call<ResponseBody> simpleTestUploadVerificationDocuments(
            @Header("Authorization") String authToken,
            @Part List<MultipartBody.Part> documents,
            @Part("documentType") RequestBody documentType,
            @Part("description") RequestBody description
    );

    @Multipart
    @POST("api/verification/test-main-upload")
    Call<ResponseBody> testMainUploadWithoutAuth(
            @Part List<MultipartBody.Part> documents,
            @Part("documentType") RequestBody documentType,
            @Part("description") RequestBody description
    );
    @GET("api/incidents/my-active")
    Call<List<Incident>> getMyActiveIncident(@Header("Authorization") String authToken);

    @GET("api/incidents/{incidentId}/messages")
    Call<List<Message>> getChatMessages(
            @Header("Authorization") String authToken,
            @Path("incidentId") String incidentId
    );
}
