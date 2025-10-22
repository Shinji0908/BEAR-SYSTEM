import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Avatar,
  Menu,
  MenuItem as MenuItemComponent,
  ListItemIcon,
  ListItemText,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack,
  Search,
  Add,
  Edit,
  Delete,
  MoreVert,
  Email,
  Phone,
  Cake,
  Refresh,
  Verified,
  Warning,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import { 
  getVerificationStatusColor, 
  isUserVerified
} from '../utils/verificationUtils';
import { useNavigate } from "react-router-dom";

function Responders() {
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingResponder, setEditingResponder] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedResponder, setSelectedResponder] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    contact: "",
    birthday: "",
    role: "Responder",
    responderType: "",
    password: "",
    verificationStatus: "pending",
    verificationNotes: "",
  });

  // Fetch responders data
  const fetchResponders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter only responders
        const responderData = data.filter(user => user.role === "Responder");
        console.log("Fetched responders:", responderData); // Debug log
        setResponders(responderData);
      } else {
        throw new Error("Failed to fetch responders");
      }
    } catch (error) {
      console.error("Error fetching responders:", error);
      showSnackbar(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResponders();
  }, [fetchResponders]);

  // Filter responders based on search and status
  const filteredResponders = responders.filter((responder) => {
    // Handle empty search term - show all if no search
    const matchesSearch = searchTerm === "" || 
      (responder.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       responder.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       responder.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       responder.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       responder.responderType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       `${responder.firstName || ''} ${responder.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" || responder.verificationStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Debug logging for search functionality
  useEffect(() => {
    console.log("Search term:", searchTerm);
    console.log("Filter status:", filterStatus);
    console.log("Total responders:", responders.length);
    console.log("Filtered responders:", filteredResponders.length);
  }, [searchTerm, filterStatus, responders, filteredResponders]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle verification
  const handleVerification = async (responderId, status, notes = "") => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users/${responderId}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          verificationStatus: status,
          verificationNotes: notes,
        }),
      });

      if (response.ok) {
        showSnackbar(
          `Responder ${status === "verified" ? "verified" : "rejected"} successfully`,
          "success"
        );
        fetchResponders();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update verification status");
      }
    } catch (error) {
      console.error("Error updating verification:", error);
      showSnackbar(error.message, "error");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const url = editingResponder 
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users/${editingResponder._id}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users`;
      
      const method = editingResponder ? "PUT" : "POST";
      
      // Prepare data for submission
      const submitData = { ...formData };
      
      // For editing, only include password if it's provided
      if (editingResponder && !submitData.password) {
        delete submitData.password;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        showSnackbar(
          editingResponder ? "Responder updated successfully" : "Responder created successfully",
          "success"
        );
        setOpenDialog(false);
        resetForm();
        fetchResponders();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to save responder");
      }
    } catch (error) {
      console.error("Error saving responder:", error);
      showSnackbar(error.message, "error");
    }
  };

  // Handle delete responder
  const handleDelete = async (responderId) => {
    if (window.confirm("Are you sure you want to delete this responder?")) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users/${responderId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          showSnackbar("Responder deleted successfully", "success");
          fetchResponders();
        } else {
          throw new Error("Failed to delete responder");
        }
      } catch (error) {
        console.error("Error deleting responder:", error);
        showSnackbar("Failed to delete responder", "error");
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      contact: "",
      birthday: "",
      role: "Responder",
      responderType: "",
      password: "",
      verificationStatus: "pending",
      verificationNotes: "",
    });
    setEditingResponder(null);
  };

  // Open edit dialog
  const handleEdit = (responder) => {
    setEditingResponder(responder);
    setFormData({
      firstName: responder.firstName || "",
      lastName: responder.lastName || "",
      username: responder.username || "",
      email: responder.email || "",
      contact: responder.contact || "",
      birthday: responder.birthday ? responder.birthday.split('T')[0] : "",
      role: responder.role || "Responder",
      responderType: responder.responderType || "",
      password: "",
      verificationStatus: responder.verificationStatus || "pending",
      verificationNotes: responder.verificationNotes || "",
    });
    setOpenDialog(true);
  };

  // Open create dialog
  const handleCreate = () => {
    resetForm();
    setOpenDialog(true);
  };

  // Handle menu actions
  const handleMenuOpen = (event, responder) => {
    setAnchorEl(event.currentTarget);
    setSelectedResponder(responder);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedResponder(null);
  };

  // Show snackbar
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  // Using utility functions from verificationUtils.js

  // Get responder type color
  const getResponderTypeColor = (type) => {
    switch (type) {
      case "police": return "info";
      case "fire": return "error";
      case "hospital": return "success";
      case "barangay": return "warning";
      default: return "default";
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Get initials for avatar
  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Check if user has admin access
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  if (currentUser.role !== "Admin") {
    return (
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
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
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              🚨 Responder Management
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h5" color="error" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You need Admin privileges to access the responder management page.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <AppBar position="static" sx={{ backgroundColor: "#2c3e50" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate("/dashboard")}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🚨 Responder Management
          </Typography>
          <IconButton color="inherit" onClick={fetchResponders}>
            <Refresh />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 3, flex: 1, overflow: "hidden" }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="primary">
                  {responders.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Responders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="success.main">
                  {responders.filter(r => isUserVerified(r.verificationStatus)).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Verified
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="warning.main">
                  {responders.filter(r => r.verificationStatus === "Pending").length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="error.main">
                  {responders.filter(r => r.verificationStatus === "Rejected").length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rejected
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search responders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Filter by Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Filter by Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="Verified">Verified</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreate}
                  fullWidth
                >
                  Add Responder
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Responders Table */}
        <Card sx={{ flex: 1, overflow: "hidden" }}>
          <TableContainer sx={{ height: "100%" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Responder</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Verification Status</TableCell>
                  <TableCell>Birthday</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredResponders.map((responder) => (
                  <TableRow key={responder._id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                          {getInitials(responder.firstName, responder.lastName)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {responder.firstName} {responder.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            @{responder.username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2">{responder.email}</Typography>
                        </Box>
                        {responder.contact && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Phone fontSize="small" color="action" />
                            <Typography variant="body2">{responder.contact}</Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {responder.responderType ? (
                        <Chip
                          label={responder.responderType}
                          color={getResponderTypeColor(responder.responderType)}
                          size="small"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          N/A
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={responder.verificationStatus || "pending"}
                        color={getVerificationStatusColor(responder.verificationStatus)}
                        size="small"
                        icon={
                          isUserVerified(responder.verificationStatus) ? <CheckCircle /> :
                          responder.verificationStatus === "rejected" ? <Cancel /> :
                          <Warning />
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Cake fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDate(responder.birthday)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(responder.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                        {responder.verificationStatus === "pending" && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<Verified />}
                              onClick={() => handleVerification(responder._id, "verified")}
                            >
                              Verify
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              startIcon={<Cancel />}
                              onClick={() => handleVerification(responder._id, "rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, responder)}
                          size="small"
                        >
                          <MoreVert />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItemComponent onClick={() => {
          handleEdit(selectedResponder);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItemComponent>
        <MenuItemComponent onClick={() => {
          handleDelete(selectedResponder._id);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItemComponent>
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingResponder ? "Edit Responder" : "Add New Responder"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingResponder}
                  helperText={editingResponder ? "Leave empty to keep current password" : "Required for new responders"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Number"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Birthday"
                  name="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Responder Type</InputLabel>
                  <Select
                    name="responderType"
                    value={formData.responderType}
                    onChange={handleInputChange}
                    label="Responder Type"
                  >
                    <MenuItem value="police">Police</MenuItem>
                    <MenuItem value="fire">Fire Department</MenuItem>
                    <MenuItem value="hospital">Hospital</MenuItem>
                    <MenuItem value="barangay">Barangay</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Verification Status</InputLabel>
                  <Select
                    name="verificationStatus"
                    value={formData.verificationStatus}
                    onChange={handleInputChange}
                    label="Verification Status"
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="verified">Verified</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Verification Notes"
                  name="verificationNotes"
                  value={formData.verificationNotes}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  placeholder="Add notes about verification status..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingResponder ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </form>
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

export default Responders;
