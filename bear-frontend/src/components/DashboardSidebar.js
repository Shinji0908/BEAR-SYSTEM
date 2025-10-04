import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Emergency,
  People,
  Assessment,
  VerifiedUser,
  ExitToApp,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";

const drawerWidth = 280;

function DashboardSidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/dashboard",
      color: "var(--bear-yellow)",
    },
    {
      text: "View Incidents",
      icon: <Emergency />,
      path: "/incidents",
      color: "var(--bear-red)",
    },
    {
      text: "Manage Users",
      icon: <People />,
      path: "/residents",
      color: "var(--bear-blue)",
    },
    {
      text: "Verify Accounts",
      icon: <VerifiedUser />,
      path: "/verify-accounts",
      color: "var(--bear-status-approved)",
    },
    {
      text: "Generate Reports",
      icon: <Assessment />,
      path: "/reports",
      color: "var(--bear-yellow)",
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "var(--bear-white)",
          color: "var(--bear-black)",
          borderRadius: 0,
        },
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: 3,
          textAlign: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            mx: "auto",
            mb: 2,
            borderRadius: 0,
            backgroundColor: "var(--bear-semiwhite)",
            border: "2px solid var(--bear-blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src="/bear.jpg"
            alt="B.E.A.R Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "8px",
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
              fontSize: "2rem",
              width: "100%",
              height: "100%",
            }}
          >
            🐻
          </Box>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 0.5, color: "var(--bear-blue)" }}>
          B.E.A.R
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8, color: "var(--bear-black)" }}>
          Barangay Emergency Alert Response
        </Typography>
        
        {/* User Info */}
        {user && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: "var(--bear-semiwhite)", borderRadius: 0 }}>
            <Typography variant="body2" sx={{ color: "var(--bear-blue)", fontWeight: "bold" }}>
              Welcome, {user.username || `${user.firstName || ""} ${user.lastName || ""}`.trim()}
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--bear-black)" }}>
              {user.role}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Navigation Menu */}
      <List sx={{ pt: 2 }}>
        {menuItems.map((item, index) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              sx={{
                mx: 1,
                borderRadius: 0,
                backgroundColor: isActive(item.path) 
                  ? "var(--bear-semiwhite)" 
                  : "transparent",
                "&:hover": {
                  backgroundColor: "var(--bear-semiwhite)",
                },
                transition: "all 0.2s ease-in-out",
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item.path) ? item.color : "var(--bear-black)",
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{
                  "& .MuiListItemText-primary": {
                    fontWeight: isActive(item.path) ? 600 : 400,
                    color: isActive(item.path) ? "var(--bear-blue)" : "var(--bear-black)",
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
        
        {/* Logout Section */}
        <Box sx={{ mt: "auto", p: 2 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={onLogout}
              sx={{
                mx: 1,
                borderRadius: 0,
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "var(--bear-semiwhite)",
                },
                transition: "all 0.2s ease-in-out",
              }}
            >
              <ListItemIcon
                sx={{
                  color: "var(--bear-red)",
                  minWidth: 40,
                }}
              >
                <ExitToApp />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                sx={{
                  "& .MuiListItemText-primary": {
                    fontWeight: 400,
                    color: "var(--bear-red)",
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        </Box>
      </List>
    </Drawer>
  );
}

export default DashboardSidebar;
