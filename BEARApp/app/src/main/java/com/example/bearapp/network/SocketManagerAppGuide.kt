package com.example.bearapp.network

import android.util.Log
import com.example.bearapp.models.IncidentG
import com.example.bearapp.models.LocationG
import com.example.bearapp.models.Message
import com.example.bearapp.models.UserG
import com.google.gson.Gson
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URI

class SocketManagerForAppGuide {
    private var socket: Socket? = null
    private var isConnected = false
    private val gson = Gson() // Add Gson for parsing

    private val TAG = "SocketManagerGuide"

    fun connect(serverUrl: String) {
        try {
            val options = IO.Options().apply {
                transports = arrayOf("websocket")
            }

            Log.d(TAG, "Attempting to connect to: $serverUrl")
            socket = IO.socket(URI.create(serverUrl), options)

            socket?.on(Socket.EVENT_CONNECT) {
                isConnected = true
                Log.i(TAG, "Socket connected: ${socket?.id()}")
                onConnectionStatusChanged?.invoke(true)
            }

            socket?.on(Socket.EVENT_DISCONNECT) { args ->
                isConnected = false
                val reason = if (args.isNotEmpty() && args[0] is String) args[0] else "unknown"
                Log.w(TAG, "Socket disconnected. Reason: $reason")
                onConnectionStatusChanged?.invoke(false)
            }

            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val errorDetails = args.joinToString { it?.toString() ?: "null" }
                Log.e(TAG, "Socket connection error: $errorDetails")
                if (args.isNotEmpty() && args[0] is Exception) {
                    Log.e(TAG, "Socket connection exception details: ", args[0] as Exception)
                }
                isConnected = false
                onConnectionStatusChanged?.invoke(false)
            }

            socket?.on("incidentCreated") { args ->
                Log.d(TAG, "incidentCreated event received with data: ${args.joinToString()}")
                try {
                    val data = args[0] as JSONObject
                    val incidentJson = data.getJSONObject("incident")
                    val incident = parseIncidentFromJson(incidentJson)
                    onNewIncident?.invoke(incident)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing incidentCreated: ", e)
                }
            }

            socket?.on("incidentStatusUpdated") { args ->
                Log.d(TAG, "incidentStatusUpdated event received with data: ${args.joinToString()}")
                try {
                    val data = args[0] as JSONObject
                    val incidentJson = data.getJSONObject("incident")
                    val incident = parseIncidentFromJson(incidentJson)
                    onIncidentStatusUpdated?.invoke(incident)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing incidentStatusUpdated: ", e)
                }
            }

            // --- NEW: Listen for incoming chat messages ---
            socket?.on("receiveMessage") { args ->
                Log.d(TAG, "receiveMessage event received: ${args.joinToString()}")
                try {
                    if (args.isNotEmpty() && args[0] is JSONObject) {
                        val messageJson = args[0] as JSONObject
                        val message = gson.fromJson(messageJson.toString(), Message::class.java)
                        onNewMessageReceived?.invoke(message)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing receiveMessage event: ", e)
                }
            }
            // --- END NEW LISTENER ---

            socket?.on("incidentDeleted") { args ->
                Log.d(TAG, "incidentDeleted event received with data: ${args.joinToString()}")
                try {
                    val data = args[0] as JSONObject
                    val incidentId = data.getString("incidentId")
                    onIncidentDeleted?.invoke(incidentId)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing incidentDeleted: ", e)
                }
            }

            socket?.connect()
        } catch (e: Exception) {
            Log.e(TAG, "Socket connection setup exception: ", e)
            isConnected = false
            onConnectionStatusChanged?.invoke(false)
        }
    }

    fun disconnect() {
        Log.d(TAG, "Disconnecting socket.")
        socket?.off("receiveMessage") // Unregister the new listener
        socket?.off(Socket.EVENT_CONNECT)
        socket?.off(Socket.EVENT_DISCONNECT)
        socket?.off(Socket.EVENT_CONNECT_ERROR)
        socket?.off("incidentCreated")
        socket?.off("incidentStatusUpdated")
        socket?.off("incidentDeleted")
        socket?.disconnect()
        socket = null
        isConnected = false
    }

    fun joinIncidentRoom(incidentId: String) {
        if (socket?.connected() == true) {
            Log.d(TAG, "Joining incident room: $incidentId")
            socket?.emit("joinIncident", JSONObject().put("incidentId", incidentId))
        } else {
            Log.w(TAG, "Cannot join room, socket not connected.")
        }
    }

    fun leaveIncidentRoom(incidentId: String) {
        if (socket?.connected() == true) {
            Log.d(TAG, "Leaving incident room: $incidentId")
            socket?.emit("leaveIncident", JSONObject().put("incidentId", incidentId))
        } else {
            Log.w(TAG, "Cannot leave room, socket not connected.")
        }
    }

    // --- NEW: Callback for new messages ---
    var onNewMessageReceived: ((Message) -> Unit)? = null
    // --- END NEW CALLBACK ---

    var onConnectionStatusChanged: ((Boolean) -> Unit)? = null
    var onNewIncident: ((IncidentG) -> Unit)? = null
    var onIncidentStatusUpdated: ((IncidentG) -> Unit)? = null
    var onIncidentDeleted: ((String) -> Unit)? = null

    private fun parseIncidentFromJson(json: JSONObject): IncidentG {
        Log.d(TAG, "Parsing incident from JSON: ${json.toString(2)}")
        val id = json.getString("_id")
        val name = json.getString("name")
        val description = json.optString("description", null)
        val type = json.getString("type")

        val locationJson = json.getJSONObject("location")
        val location = LocationG(
            latitude = locationJson.getDouble("latitude"),
            longitude = locationJson.getDouble("longitude")
        )

        val reportedByJson = json.optJSONObject("reportedBy")
        val reportedBy = reportedByJson?.let {
            UserG(
                _id = it.optString("_id"),
                firstName = it.getString("firstName"),
                lastName = it.getString("lastName"),
                contact = it.getString("contact"),
                email = it.optString("email")
            )
        }

        val status = json.optString("status", "Pending")
        val contact = json.optString("contact", reportedBy?.contact ?: "")
        val createdAt = json.getString("createdAt")

        return IncidentG(
            _id = id,
            name = name,
            description = description,
            type = type,
            location = location,
            reportedBy = reportedBy,
            status = status,
            contact = contact,
            createdAt = createdAt
        )
    }
}
