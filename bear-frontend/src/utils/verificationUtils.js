// Verification Status Utility Functions
// This file provides consistent verification status handling across the frontend

// Helper function to normalize verification status
export const normalizeVerificationStatus = (status) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (normalized === "approved" || normalized === "verified") {
    return "Verified"; // Standardize to "Verified"
  }
  return status; // Keep original case for other statuses
};

// Helper function to check if user is verified (handles both "Verified" and "Approved")
export const isUserVerified = (status) => {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === "verified" || normalized === "approved";
};

// Get verification status color for UI components
export const getVerificationStatusColor = (status) => {
  if (!status) return "default"; // Handle null/undefined status
  const normalizedStatus = normalizeVerificationStatus(status);
  switch (normalizedStatus) {
    case "Verified":
      return "success";
    case "Pending":
      return "warning";
    case "Rejected":
      return "error";
    default:
      return "default";
  }
};

// Get verification status icon for UI components
export const getVerificationStatusIcon = (status) => {
  if (!status) return "?"; // Handle null/undefined status
  const normalizedStatus = normalizeVerificationStatus(status);
  switch (normalizedStatus) {
    case "Verified":
      return "✓";
    case "Pending":
      return "⌛";
    case "Rejected":
      return "✗";
    default:
      return "?";
  }
};

// Get verification status display text
export const getVerificationStatusText = (status) => {
  const normalizedStatus = normalizeVerificationStatus(status);
  return normalizedStatus || "Not Submitted";
};

// Verification status constants
export const VERIFICATION_STATUS = {
  PENDING: "Pending",
  VERIFIED: "Verified", 
  APPROVED: "Approved",
  REJECTED: "Rejected"
};

// All possible verified statuses (for checking if user can perform actions)
export const VERIFIED_STATUSES = ["Verified", "Approved"];
