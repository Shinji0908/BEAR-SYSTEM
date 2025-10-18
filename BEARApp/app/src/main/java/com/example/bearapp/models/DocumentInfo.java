package com.example.bearapp.models;

    public class DocumentInfo {
        private String type;
        private String description;
        private String uploadedAt;
        private String url;

        // Getters
        public String getType() { return type; }
        public String getDescription() { return description; }
        public String getUploadedAt() { return uploadedAt; }
        public String getUrl() { return url; }

        // Setters
        public void setType(String type) { this.type = type; }
        public void setDescription(String description) { this.description = description; }
        public void setUploadedAt(String uploadedAt) { this.uploadedAt = uploadedAt; }
        public void setUrl(String url) { this.url = url; }
    }