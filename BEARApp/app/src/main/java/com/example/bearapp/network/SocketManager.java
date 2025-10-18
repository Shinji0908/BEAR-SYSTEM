package com.example.bearapp.network;

import android.util.Log;
import java.net.URISyntaxException;
import io.socket.client.IO;
import io.socket.client.Socket;

public class SocketManager {
    private static Socket socket;

    public static Socket getSocket() {
        if (socket == null) {
            try {
                // ✅ Use 10.0.2.2 for Android Emulator
                socket = IO.socket("http://10.0.2.2:5000");
            } catch (URISyntaxException e) {
                Log.e("SocketIO", "Socket connection error: " + e.getMessage());
            }
        }
        return socket;
    }
}
