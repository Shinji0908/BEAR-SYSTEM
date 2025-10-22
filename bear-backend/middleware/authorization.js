const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { JWT_SECRET } = require('../utils/helpers');

// Enhanced authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check User collection first
    let user = await User.findById(decoded.id).select("-password");
    
    // If not found in User collection, check Admin collection
    if (!user) {
      const admin = await Admin.findById(decoded.id).select("-password");
      if (admin) {
        user = {
          _id: admin._id,
          firstName: admin.username,
          lastName: "",
          username: admin.username,
          email: admin.email,
          role: "Admin",
          responderType: null,
          contact: null,
          birthday: null,
          createdAt: admin.createdAt
        };
      }
    }
    
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: "Access denied. Required roles: " + allowedRoles.join(', '),
        userRole: userRole,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

// Admin-only authorization
const requireAdmin = authorize('Admin');

// Admin or Responder authorization
const requireAdminOrResponder = authorize('Admin', 'Responder');

// Any authenticated user
const requireAuth = authorize('Admin', 'Responder', 'Resident');

// Resource ownership check (users can only access their own resources)
const requireOwnership = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const resourceUserId = req.params.userId || req.params.id;
  const currentUserId = req.user._id.toString();

  // Admins can access any resource
  if (req.user.role === 'Admin') {
    return next();
  }

  // Users can only access their own resources
  if (resourceUserId === currentUserId) {
    return next();
  }

  return res.status(403).json({ 
    message: "Access denied. You can only access your own resources" 
  });
};

// Incident access control
const requireIncidentAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const incidentId = req.params.id || req.params.incidentId;
    if (!incidentId) {
      return res.status(400).json({ message: "Incident ID required" });
    }

    const Incident = require('../models/Incident');
    const incident = await Incident.findById(incidentId);
    
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // Admins can access any incident
    if (req.user.role === 'Admin') {
      req.incident = incident;
      return next();
    }

    // Users can only access incidents they reported
    if (incident.reportedBy.toString() === req.user._id.toString()) {
      req.incident = incident;
      return next();
    }

    // Responders can access incidents of their type
    if (req.user.role === 'Responder' && req.user.responderType) {
      const responderType = req.user.responderType;
      const incidentType = incident.type;
      
      // Map responder types to incident types
      const typeMapping = {
        'police': ['police', 'barangay'],
        'fire': ['fire'],
        'hospital': ['hospital'],
        'barangay': ['barangay', 'police']
      };

      if (typeMapping[responderType] && typeMapping[responderType].includes(incidentType)) {
        req.incident = incident;
        return next();
      }
    }

    return res.status(403).json({ 
      message: "Access denied. You don't have permission to access this incident" 
    });
  } catch (error) {
    return res.status(500).json({ message: "Error checking incident access" });
  }
};

// Verification access control
const requireVerificationAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const targetUserId = req.params.userId;
    
    // Admins can access any verification
    if (req.user.role === 'Admin') {
      return next();
    }

    // Users can only access their own verification
    if (targetUserId === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({ 
      message: "Access denied. You can only access your own verification" 
    });
  } catch (error) {
    return res.status(500).json({ message: "Error checking verification access" });
  }
};

// Dashboard access control
const requireDashboardAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Only Admins can access dashboard stats
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ 
      message: "Access denied. Admin role required for dashboard access" 
    });
  }

  next();
};

// User management access control
const requireUserManagementAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Only Admins can manage users
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ 
      message: "Access denied. Admin role required for user management" 
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authorize,
  requireAdmin,
  requireAdminOrResponder,
  requireAuth,
  requireOwnership,
  requireIncidentAccess,
  requireVerificationAccess,
  requireDashboardAccess,
  requireUserManagementAccess
};
