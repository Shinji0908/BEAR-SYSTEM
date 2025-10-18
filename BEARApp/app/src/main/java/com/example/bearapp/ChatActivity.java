package com.example.bearapp;

import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.MenuItem;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.bearapp.adapter.MessageAdapter;
import com.example.bearapp.models.Message;
import com.example.bearapp.network.BEARApi;
import com.example.bearapp.network.RetrofitClient;
import com.example.bearapp.util.SessionManager;
import com.google.gson.Gson;

import org.json.JSONException;
import org.json.JSONObject;

import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;

import io.socket.client.IO;
import io.socket.client.Socket;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ChatActivity extends AppCompatActivity {

    private static final String TAG = "ChatActivity";

    private RecyclerView recyclerViewChat;
    private MessageAdapter messageAdapter;
    private List<Message> messageList;
    private EditText etMessage;
    private ImageButton btnSend;
    private Toolbar toolbar;

    private SessionManager sessionManager;
    private BEARApi bearApi;
    private Socket mSocket;
    private Gson gson; // Gson instance for JSON parsing

    private String incidentId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        incidentId = getIntent().getStringExtra("INCIDENT_ID");
        if (incidentId == null || incidentId.isEmpty()) {
            Toast.makeText(this, "Error: Incident ID is missing.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Incident Chat");
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }

        sessionManager = new SessionManager(getApplicationContext());
        bearApi = RetrofitClient.getClient(this).create(BEARApi.class);
        gson = new Gson(); // Initialize Gson

        initViews();
        setupRecyclerView();
        fetchChatHistory();
        initSocket();
    }

    private void initViews() {
        recyclerViewChat = findViewById(R.id.recycler_view_chat);
        etMessage = findViewById(R.id.edit_text_message);
        btnSend = findViewById(R.id.button_send);

        btnSend.setOnClickListener(v -> sendMessage());
    }

    private void setupRecyclerView() {
        messageList = new ArrayList<>();
        messageAdapter = new MessageAdapter(messageList, sessionManager.getUserId());
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        layoutManager.setStackFromEnd(true);
        recyclerViewChat.setLayoutManager(layoutManager);
        recyclerViewChat.setAdapter(messageAdapter);
    }

    private void fetchChatHistory() {
        String authToken = "Bearer " + sessionManager.getAuthToken();
        bearApi.getChatMessages(authToken, incidentId).enqueue(new Callback<List<Message>>() {
            @Override
            public void onResponse(@NonNull Call<List<Message>> call, @NonNull Response<List<Message>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    messageList.clear();
                    messageList.addAll(response.body());
                    messageAdapter.notifyDataSetChanged();
                    recyclerViewChat.scrollToPosition(messageList.size() - 1);
                } else {
                    Toast.makeText(ChatActivity.this, "Failed to load chat history", Toast.LENGTH_SHORT).show();
                    Log.e(TAG, "Failed to fetch chat history. Code: " + response.code());
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Message>> call, @NonNull Throwable t) {
                Toast.makeText(ChatActivity.this, "Network error loading chat history", Toast.LENGTH_SHORT).show();
                Log.e(TAG, "Network error fetching chat history", t);
            }
        });
    }

    private void initSocket() {
        try {
            String socketUrl = BuildConfig.API_BASE_URL.replaceAll("/api/?$", "/");
            mSocket = IO.socket(socketUrl);
        } catch (URISyntaxException e) {
            Log.e(TAG, "Socket.IO URI Syntax Exception", e);
            return;
        }

        mSocket.on(Socket.EVENT_CONNECT, args -> {
            Log.i(TAG, "Socket connected");
            authenticateSocket();
        });

        mSocket.on("joinedChat", args -> {
            Log.i(TAG, "Successfully joined chat room: " + incidentId);
        });

        // --- THIS IS THE CORRECTED LISTENER ---
        mSocket.on("receiveMessage", args -> {
            if (args.length > 0 && args[0] instanceof JSONObject) {
                JSONObject data = (JSONObject) args[0];
                // Use Gson to safely parse the incoming JSON into a Message object
                Message newMessage = gson.fromJson(data.toString(), Message.class);

                runOnUiThread(() -> {
                    // Add a null-safety check before adding to the adapter
                    if (newMessage != null && newMessage.getSenderId() != null) {
                        messageList.add(newMessage);
                        messageAdapter.notifyItemInserted(messageList.size() - 1);
                        recyclerViewChat.scrollToPosition(messageList.size() - 1);
                    } else {
                        Log.e(TAG, "Received a null or invalid message object from socket.");
                    }
                });
            }
        });
        // --- END OF CORRECTION ---

        mSocket.on(Socket.EVENT_DISCONNECT, args -> Log.i(TAG, "Socket disconnected"));
        mSocket.on("error", args -> Log.e(TAG, "Socket error: " + args[0].toString()));

        mSocket.connect();
    }

    private void authenticateSocket() {
        if (mSocket.connected()) {
            try {
                JSONObject authPayload = new JSONObject();
                authPayload.put("token", sessionManager.getAuthToken());
                mSocket.emit("authenticate", authPayload);
                joinChatRoom();
            } catch (JSONException e) {
                Log.e(TAG, "Error creating auth payload", e);
            }
        }
    }

    private void joinChatRoom() {
        if (mSocket.connected()) {
            try {
                JSONObject joinPayload = new JSONObject();
                joinPayload.put("incidentId", incidentId);
                mSocket.emit("joinChat", joinPayload);
            } catch (JSONException e) {
                Log.e(TAG, "Error creating join chat payload", e);
            }
        }
    }

    private void sendMessage() {
        String messageText = etMessage.getText().toString().trim();
        if (TextUtils.isEmpty(messageText) || !mSocket.connected()) {
            return;
        }

        try {
            JSONObject messagePayload = new JSONObject();
            messagePayload.put("incidentId", incidentId);
            messagePayload.put("content", messageText);
            mSocket.emit("sendMessage", messagePayload);
            etMessage.setText("");
        } catch (JSONException e) {
            Log.e(TAG, "Error sending message", e);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mSocket != null) {
            try {
                JSONObject leavePayload = new JSONObject();
                leavePayload.put("incidentId", incidentId);
                mSocket.emit("leaveChat", leavePayload);
            } catch (JSONException e) {
                Log.e(TAG, "Error creating leave chat payload", e);
            }
            mSocket.disconnect();
            mSocket.off();
        }
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            onBackPressed();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}
