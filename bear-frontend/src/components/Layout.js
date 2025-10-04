import React from "react";
import { Link } from "react-router-dom";
import { Drawer, List, ListItem, ListItemText, Toolbar, AppBar, Typography, Box } from "@mui/material";

const drawerWidth = 240;

function Layout({ children }) {
  return (
    <Box sx={{ display: "flex" }}>
      {/* Top App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap>
            🚨 BEAR System
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            <ListItem button component={Link} to="/">
              <ListItemText primary="Home" />
            </ListItem>
            <ListItem button component={Link} to="/incidents">
              <ListItemText primary="Incidents" />
            </ListItem>
            <ListItem button component={Link} to="/users">
              <ListItemText primary="Users" />
            </ListItem>
            <ListItem button component={Link} to="/reports">
              <ListItemText primary="Reports" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout;