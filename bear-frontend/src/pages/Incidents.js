import React, { useEffect, useState, useRef } from "react";
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert
} from "@mui/material";
import { ArrowBack, Refresh, Delete } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { io } from "socket.io-client";

// Fix marker icons (Leaflet bug with Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Small helper to recenter map
function RecenterMap({ incident }) {
  const map = useMap();
  if (incident?.location) {
    map.setView([incident.location.latitude, incident.location.longitude], 15);
  }
  return null;
}

function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const socketRef = useRef(null);
  const navigate = useNavigate();

  const normalizeType = (t) => (typeof t === "string" ? t.toLowerCase() : "barangay");
  const getTypeChipProps = (t) => {
    const type = normalizeType(t);
    switch (type) {
      case "fire":
        return { label: "Fire", color: "error" };
      case "hospital":
        return { label: "Hospital", color: "success" };
      case "police":
        return { label: "Police", color: "info" };
      default:
        return { label: "Barangay", color: "warning" };
    }
  };
  const getTypeEmoji = (t) => {
    const type = normalizeType(t);
    switch (type) {
      case "fire":
        return "🔥";
      case "hospital":
        return "🏥";
      case "police":
        return "🚓";
      default:
        return "🏘️";
    }
  };

  const fetchIncidents = () => {
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/incidents`)
      .then((res) => res.json())
      .then((data) => {
        const normalized = Array.isArray(data)
          ? data
          : Array.isArray(data?.incidents)
          ? data.incidents
          : [];
        if (!Array.isArray(data)) {
          console.warn("Unexpected incidents response shape:", data);
        }
        setIncidents(normalized);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching incidents:", err);
        setLoading(false);
      });
  };

  const handleDeleteClick = (incident, event) => {
    event.stopPropagation(); // Prevent list item selection
    setIncidentToDelete(incident);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!incidentToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/incidents/${incidentToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from local state
        setIncidents(prev => prev.filter(incident => incident._id !== incidentToDelete._id));
        
        // Clear selection if deleted incident was selected
        if (selectedIncident?._id === incidentToDelete._id) {
          setSelectedIncident(null);
        }
        
        setSnackbar({
          open: true,
          message: "Incident deleted successfully",
          severity: "success"
        });
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message: errorData.message || "Failed to delete incident",
          severity: "error"
        });
      }
    } catch (error) {
      console.error("Error deleting incident:", error);
      setSnackbar({
        open: true,
        message: "Network error. Please try again.",
        severity: "error"
      });
    } finally {
      setDeleteDialogOpen(false);
      setIncidentToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setIncidentToDelete(null);
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // Socket.IO: connect and subscribe to global updates
  useEffect(() => {
    const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5000", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket connected", socket.id);
    });

    // New incident arrives in real-time
    socket.on("incidentCreated", ({ incident }) => {
      setIncidents((prev) => (prev.some((i) => i._id === incident._id) ? prev : [incident, ...prev]));
    });

    // Real-time status updates
    socket.on("incidentStatusUpdated", ({ incident }) => {
      setIncidents((prev) =>
        prev.map((i) => (i._id === incident._id ? incident : i))
      );
      // Update selected incident if it's the one being updated
      setSelectedIncident((prev) => 
        prev?._id === incident._id ? incident : prev
      );
    });

    // Handle incident deletion from other clients
    socket.on("incidentDeleted", ({ incidentId }) => {
      setIncidents((prev) => prev.filter((i) => i._id !== incidentId));
      // Clear selection if deleted incident was selected
      setSelectedIncident((prev) => prev?._id === incidentId ? null : prev);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bear-body)" }}>
      {/* Red Top Bar */}
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
            🚨 Emergency Incidents
          </Typography>
          <IconButton color="inherit" onClick={fetchIncidents}>
            <Refresh />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ display: "flex", flex: 1, height: "calc(100vh - 64px)" }}>
        {/* Left Column - List */}
        <Box
          sx={{
            width: "35%",
            overflowY: "auto",
            borderRight: "1px solid var(--bear-semiwhite)",
            backgroundColor: "var(--bear-white)",
            p: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Reported Incidents ({incidents.length})
          </Typography>
          <List>
            {loading && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                Loading incidents...
              </Typography>
            )}
            {incidents.map((incident, index) => (
              <ListItem
                key={incident._id || index}
                divider
                button
                onClick={() => setSelectedIncident(incident)}
                sx={{
                  backgroundColor:
                    selectedIncident?._id === incident._id ? "#d1e7ff" : "inherit",
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={(e) => handleDeleteClick(incident, e)}
                    sx={{ color: "error.main" }}
                  >
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${incident.name}${incident.reportedBy ? ` (${incident.reportedBy.firstName || 'Unknown'} ${incident.reportedBy.lastName || 'User'})` : ` (${incident.contact})`}${incident.status ? ` • ${incident.status}` : ""}`}
                  secondary={
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip size="small" variant="filled" {...getTypeChipProps(incident.type)} />
                        <span>{`📍 ${incident.location?.latitude || 'N/A'}, ${incident.location?.longitude || 'N/A'}`}</span>
                      </Box>
                      {incident.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                          📝 {incident.description.length > 80 ? incident.description.substring(0, 80) + '...' : incident.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Right Column - Map */}
        <Box sx={{ flex: 1, backgroundColor: "var(--bear-white)" }}>
          <MapContainer
            center={[14.5995, 120.9842]} // Default center (Manila)
            zoom={12}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Show all markers */}
            {incidents.map((incident, index) => (
              <Marker
                key={incident._id || index}
                position={[
                  incident.location?.latitude || 14.5995,
                  incident.location?.longitude || 120.9842,
                ]}
              >
                <Popup>
                  <strong>{getTypeEmoji(incident.type)} {incident.name}</strong>
                  <br />
                  Type: {getTypeChipProps(incident.type).label}
                  <br />
                  {incident.reportedBy ? (
                    <>
                      👤 {incident.reportedBy.firstName || 'Unknown'} {incident.reportedBy.lastName || 'User'}
                      <br />
                      📞 {incident.reportedBy.contact || incident.contact}
                    </>
                  ) : (
                    <>📞 {incident.contact}</>
                  )}
                  {incident.description && (
                    <>
                      <br />
                      📝 {incident.description}
                    </>
                  )}
                  {incident.status ? (
                    <>
                      <br />
                      Status: {incident.status}
                    </>
                  ) : null}
                </Popup>
              </Marker>
            ))}

            {/* Recenter map when incident is selected */}
            {selectedIncident && <RecenterMap incident={selectedIncident} />}
          </MapContainer>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Incident
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the incident "{incidentToDelete?.name}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Incidents;