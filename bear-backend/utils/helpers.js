const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

// Helper function to normalize verification status
const normalizeVerificationStatus = (status) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (normalized === "approved" || normalized === "verified") {
    return "Verified"; // Standardize to "Verified"
  }
  return status; // Keep original case for other statuses
};

// Helper function to check if user is verified
const isUserVerified = (status) => {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === "verified" || normalized === "approved";
};

// Helper function to validate JWT token
const validateJWT = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Helper function to generate JWT token
const generateJWT = (payload, expiresIn = "7d") => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Helper function to format user response
const formatUserResponse = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  
  // Apply verification status logic
  let responseVerificationStatus = normalizeVerificationStatus(userObj.verificationStatus);
  
  // Only set to null if user has never submitted documents AND has no verification status
  if ((!userObj.verificationDocuments || userObj.verificationDocuments.length === 0) && 
      (!userObj.verificationStatus || userObj.verificationStatus === "Pending")) {
    responseVerificationStatus = null;
  }

  return {
    id: userObj._id.toString(),
    firstName: userObj.firstName,
    lastName: userObj.lastName,
    username: userObj.username,
    email: userObj.email,
    contact: userObj.contact,
    role: userObj.role,
    responderType: userObj.responderType,
    birthday: userObj.birthday,
    verificationStatus: responseVerificationStatus,
    createdAt: userObj.createdAt
  };
};

module.exports = {
  JWT_SECRET,
  normalizeVerificationStatus,
  isUserVerified,
  validateJWT,
  generateJWT,
  formatUserResponse
};
