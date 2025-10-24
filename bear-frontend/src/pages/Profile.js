import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from "@mui/material";
import {
  ArrowBack,
  Person,
  Email,
  Phone,
  Cake,
  Badge,
  Lock,
  Visibility,
  VisibilityOff,
  Edit,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Memoized snackbar function to prevent unnecessary re-renders
  const showSnackbar = useCallback((message, severity) => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      
      // Determine if this is a system admin (Admin table) or user admin (User table)
      const isSystemAdmin = userData.isSystemAdmin === true;
      const endpoint = isSystemAdmin
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/profile/${userData.id}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users/${userData.id}`;
      
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Add isSystemAdmin flag to user data for later use
        setUser({ ...data, isSystemAdmin });
      } else {
        throw new Error("Failed to fetch profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      showSnackbar("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  // Run once on mount to fetch user profile
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return "Password must contain uppercase, lowercase, and number";
    }
    
    return "";
  };

  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value,
    }));

    // Real-time validation
    if (name === "newPassword") {
      setPasswordErrors(prev => ({
        ...prev,
        newPassword: validatePassword(value),
      }));
    } else if (name === "confirmPassword") {
      setPasswordErrors(prev => ({
        ...prev,
        confirmPassword: value !== passwordForm.newPassword ? "Passwords do not match" : "",
      }));
    }
  };

  const handlePasswordChange = async () => {
    // Validate all fields
    const currentError = passwordForm.currentPassword ? "" : "Current password is required";
    const newError = validatePassword(passwordForm.newPassword);
    const confirmError = passwordForm.confirmPassword !== passwordForm.newPassword ? "Passwords do not match" : "";

    if (currentError || newError || confirmError) {
      setPasswordErrors({
        currentPassword: currentError,
        newPassword: newError,
        confirmPassword: confirmError,
      });
      showSnackbar("Please fix validation errors", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      // Use correct endpoint based on admin type
      const endpoint = user.isSystemAdmin
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/password/${user._id}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users/${user._id}/password`;
      
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (response.ok) {
        showSnackbar("Password changed successfully!", "success");
        setPasswordDialogOpen(false);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      showSnackbar(error.message, "error");
    }
  };

  const getInitials = (firstName, lastName, username) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    // For system admins without firstName/lastName, use username
    return username ? username.substring(0, 2).toUpperCase() : "AD";
  };

  const getDisplayName = (user) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || "Admin";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "Admin": return "#d32f2f";
      case "Responder": return "#f57c00";
      case "Resident": return "#1976d2";
      default: return "#757575";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Failed to load profile</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bear-body)" }}>
      {/* Top Bar */}
      <AppBar position="static" sx={{ backgroundColor: "var(--bear-dark-red)", borderRadius: 0 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate("/dashboard")}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: "var(--bear-white)" }}>
            👤 My Profile
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 3, flex: 1, overflow: "auto" }}>
        <Grid container spacing={3}>
          {/* Profile Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: "center", py: 4 }}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    mx: "auto",
                    mb: 2,
                    bgcolor: getRoleColor(user.role),
                    fontSize: "2.5rem",
                  }}
                >
                  {getInitials(user.firstName, user.lastName, user.username)}
                </Avatar>
                <Typography variant="h5" gutterBottom>
                  {getDisplayName(user)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    display: "inline-block",
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    backgroundColor: getRoleColor(user.role),
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  {user.role}
                </Typography>
                {user.responderType && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {user.responderType.charAt(0).toUpperCase() + user.responderType.slice(1)} Responder
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Security Card */}
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Lock /> Security
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Edit />}
                  onClick={() => setPasswordDialogOpen(true)}
                  sx={{
                    backgroundColor: "var(--bear-dark-red)",
                    "&:hover": {
                      backgroundColor: "var(--bear-red)",
                    },
                  }}
                >
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Details Card */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Profile Information
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Person color="action" />
                      <Typography variant="subtitle2" color="text.secondary">
                        Username
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ ml: 4 }}>
                      {user.username}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Email color="action" />
                      <Typography variant="subtitle2" color="text.secondary">
                        Email
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ ml: 4 }}>
                      {user.email}
                    </Typography>
                  </Grid>

                  {/* Only show these fields for User admins (not system admins) */}
                  {!user.isSystemAdmin && (
                    <>
                      {user.contact && (
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <Phone color="action" />
                            <Typography variant="subtitle2" color="text.secondary">
                              Contact Number
                            </Typography>
                          </Box>
                          <Typography variant="body1" sx={{ ml: 4 }}>
                            {user.contact}
                          </Typography>
                        </Grid>
                      )}

                      {user.birthday && (
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <Cake color="action" />
                            <Typography variant="subtitle2" color="text.secondary">
                              Birthday
                            </Typography>
                          </Box>
                          <Typography variant="body1" sx={{ ml: 4 }}>
                            {formatDate(user.birthday)}
                          </Typography>
                        </Grid>
                      )}

                      {user.verificationStatus && (
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <Badge color="action" />
                            <Typography variant="subtitle2" color="text.secondary">
                              Verification Status
                            </Typography>
                          </Box>
                          <Typography
                            variant="body1"
                            sx={{
                              ml: 4,
                              color:
                                user.verificationStatus === "Verified"
                                  ? "success.main"
                                  : user.verificationStatus === "Rejected"
                                  ? "error.main"
                                  : "warning.main",
                              fontWeight: "bold",
                            }}
                          >
                            {user.verificationStatus}
                          </Typography>
                        </Grid>
                      )}
                    </>
                  )}

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Badge color="action" />
                      <Typography variant="subtitle2" color="text.secondary">
                        {user.isSystemAdmin ? "Account Created" : "Member Since"}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ ml: 4 }}>
                      {formatDate(user.createdAt)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Current Password"
              name="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={handlePasswordFormChange}
              error={!!passwordErrors.currentPassword}
              helperText={passwordErrors.currentPassword}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      edge="end"
                    >
                      {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="New Password"
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={passwordForm.newPassword}
              onChange={handlePasswordFormChange}
              error={!!passwordErrors.newPassword}
              helperText={passwordErrors.newPassword || "Min 8 chars, 1 uppercase, 1 lowercase, 1 number"}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Confirm New Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFormChange}
              error={!!passwordErrors.confirmPassword}
              helperText={passwordErrors.confirmPassword || "Re-enter your new password"}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            sx={{
              backgroundColor: "var(--bear-dark-red)",
              "&:hover": {
                backgroundColor: "var(--bear-red)",
              },
            }}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Profile;

