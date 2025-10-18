package com.example.bearapp.models;    public class Message {
    private String content;
    private String senderId;

    // A no-argument constructor is required for some libraries like Gson/Firebase
    public Message() {
    }

    // A constructor to easily create new message objects
    public Message(String content, String senderId) {
        this.content = content;
        this.senderId = senderId;
    }

    // Getter method for the message content (used in your adapter)
    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    // Getter method for the sender's ID (used in your adapter)
    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
    }
}
    