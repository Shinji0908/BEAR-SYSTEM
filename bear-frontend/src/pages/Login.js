import React, { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  Login as LoginIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear errors when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Login successful! Redirecting...");
        
        // Store token in localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Small delay to ensure localStorage is set before redirect
        setTimeout(() => {
          navigate("/dashboard");
        }, 100);
      } else {
        // Show more detailed error information
        const errorMsg = data.message || "Login failed. Please try again.";
        setError(`${errorMsg} (Status: ${response.status})`);
        console.error("Login failed:", data);
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bear-body)",
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            padding: 4,
            borderRadius: 3,
            background: "var(--bear-white)",
            backdropFilter: "blur(10px)",
            border: "2px solid var(--bear-yellow)",
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            {/* Logo */}
            <Box
              sx={{
                width: 120,
                height: 120,
                mx: "auto",
                mb: 3,
                borderRadius: 3,
                backgroundColor: "var(--bear-semiwhite)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                boxShadow: 2,
                border: "3px solid var(--bear-blue)",
              }}
            >
              <img
                src="/bear.jpg"
                alt="B.E.A.R Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "12px",
                }}
                onError={(e) => {
                  // Fallback to emoji if image fails to load
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <Box
                sx={{
                  display: "none",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "3rem",
                  width: "100%",
                  height: "100%",
                }}
              >
                🐻
              </Box>
            </Box>
            
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: "bold",
                color: "var(--bear-blue)",
                mb: 1,
              }}
            >
            B.E.A.R
            </Typography>
            <Typography variant="h6" sx={{ mb: 2, color: "var(--bear-blue)" }}>
              Barangay Emergency Alert Response
            </Typography>
            <Typography variant="body2" sx={{ color: "var(--bear-black)" }}>
              Sign in to access the emergency management dashboard
            </Typography>
          </Box>

          {/* Error/Success Messages */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              margin="normal"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              required
              margin="normal"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={togglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              className="bear-primary-button"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontSize: "1.1rem",
                fontWeight: "bold",
              }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </Box>
        </Paper>
        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Typography variant="body2" sx={{ color: "var(--bear-blue)", opacity: 0.8 }}>
            © 2025 B.E.A.R. Barangay Emergency Alert Response System
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default Login;
