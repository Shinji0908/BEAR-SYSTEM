package com.example.bearapp.models;

    import java.util.List;

    public class VerificationStatusResponse {
        private String verificationStatus;
        private String verifiedAt;
        private String rejectionReason;
        private List<DocumentInfo> documents;
        private UserInfo user;

        // Getters
        public String getVerificationStatus() { return verificationStatus; }
        public String getVerifiedAt() { return verifiedAt; }
        public String getRejectionReason() { return rejectionReason; }
        public List<DocumentInfo> getDocuments() { return documents; }
        public UserInfo getUser() { return user; }

        // Setters
        public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
        public void setVerifiedAt(String verifiedAt) { this.verifiedAt = verifiedAt; }
        public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
        public void setDocuments(List<DocumentInfo> documents) { this.documents = documents; }
        public void setUser(UserInfo user) { this.user = user; }
    }