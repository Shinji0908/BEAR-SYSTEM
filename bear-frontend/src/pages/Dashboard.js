import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  Button,
} from "@mui/material";
import {
  Emergency,
  People,
  TrendingUp,
  CheckCircle,
  Refresh,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "../components/DashboardSidebar";
import NotificationHistory from "../components/NotificationHistory";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const navigate = useNavigate();

  useEffect(() => {
    // Get user data from localStorage (ProtectedRoute already verified authentication)
    const userData = localStorage.getItem("user");
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (err) {
        console.error("Error parsing user data:", err);
        localStorage.clear();
        navigate("/login");
      }
    }
  }, [navigate]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          navigate("/login");
          return;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch dashboard data");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(error.message);
      showSnackbar(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [navigate]);


  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  if (!user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Dashboard...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Box sx={{ textAlign: "center", maxWidth: 500 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Dashboard Error</Typography>
            <Typography>{error}</Typography>
          </Alert>
          <Button 
            variant="outlined" 
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
          >
            Logout & Login
          </Button>
        </Box>
      </Box>
    );
  }

  const dashboardCards = [
    {
      title: "Active Incidents",
      value: dashboardData?.incidents?.active || "0",
      icon: <Emergency sx={{ fontSize: 40 }} />,
      color: "var(--bear-red)",
      description: "Emergency incidents requiring attention",
      trend: dashboardData?.incidents?.recent > 0 ? `+${dashboardData.incidents.recent} this week` : "No new incidents"
    },
    {
      title: "Total Residents",
      value: dashboardData?.users?.residents?.toLocaleString() || "0",
      icon: <People sx={{ fontSize: 40 }} />,
      color: "var(--bear-blue)",
      description: "Registered residents in the system",
      trend: dashboardData?.users?.newUsers > 0 ? `+${dashboardData.users.newUsers} new users` : "No new registrations"
    },
    {
      title: "Verified Responders",
      value: dashboardData?.users?.verifiedResponders || "0",
      icon: <CheckCircle sx={{ fontSize: 40 }} />,
      color: "var(--bear-status-approved)",
      description: "Active emergency responders",
      trend: `${dashboardData?.users?.responders || 0} total responders`
    },
    {
      title: "Response Time",
      value: `${dashboardData?.metrics?.avgResponseTime || "0"} min`,
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: "var(--bear-yellow)",
      description: "Average emergency response time",
      trend: "System performance metric"
    },
  ];

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <DashboardSidebar user={user} onLogout={handleLogout} />

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Box sx={{ p: 3, flex: 1, overflow: "auto", backgroundColor: "var(--bear-body)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Typography variant="h4" sx={{ color: "var(--bear-blue)", fontWeight: "bold" }}>
              Barangay Emergency Management Dashboard
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<Refresh />}
              onClick={fetchDashboardData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          <NotificationHistory />

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {dashboardCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  className="bear-card"
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, textAlign: "center" }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        mb: 2,
                        color: card.color,
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: "bold", mb: 1 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="h6" component="div" sx={{ mb: 1, color: "var(--bear-blue)", fontWeight: "bold" }}>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "var(--bear-black)", mb: 1 }}>
                      {card.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--bear-gray)", fontStyle: "italic" }}>
                      {card.trend}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: "center", p: 2 }}>
                <Typography variant="h6" color="primary">
                  {dashboardData?.incidents?.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Incidents
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: "center", p: 2 }}>
                <Typography variant="h6" color="success.main">
                  {dashboardData?.incidents?.resolved || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Resolved Incidents
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: "center", p: 2 }}>
                <Typography variant="h6" color="warning.main">
                  {dashboardData?.users?.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Users
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: "center", p: 2 }}>
                <Typography variant="h6" color="info.main">
                  {dashboardData?.metrics?.systemUptime || "0.0%"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  System Uptime
                </Typography>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Last updated: {dashboardData?.metrics?.lastUpdated ? 
                new Date(dashboardData.metrics.lastUpdated).toLocaleString() : 
                "Never"
              }
            </Typography>
          </Box>
        </Box>
      </Box>

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

export default Dashboard;