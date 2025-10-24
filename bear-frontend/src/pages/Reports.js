import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack,
  Search,
  Download,
  Refresh,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

function Reports() {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const navigate = useNavigate();

  // Fetch incidents data
  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/incidents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
        setFilteredIncidents(data);
      } else {
        throw new Error("Failed to fetch incidents");
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
      showSnackbar(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Filter incidents based on search, type, and date
  useEffect(() => {
    let filtered = incidents;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(incident => {
        const locationString = typeof incident.location === 'object' && incident.location !== null
          ? `${incident.location.latitude || ''}, ${incident.location.longitude || ''}`
          : incident.location || '';
        
        return incident.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               locationString.toLowerCase().includes(searchTerm.toLowerCase()) ||
               incident.type?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(incident => incident.type === filterType);
    }

    // Filter by date period
    if (filterPeriod === "month") {
      const selectedYear = filterDate.split("-")[0];
      const selectedMonth = filterDate.split("-")[1];
      filtered = filtered.filter(incident => {
        const incidentDate = new Date(incident.createdAt);
        return incidentDate.getFullYear() === parseInt(selectedYear) && 
               (incidentDate.getMonth() + 1) === parseInt(selectedMonth);
      });
    } else if (filterPeriod === "year") {
      const selectedYear = filterDate.split("-")[0];
      filtered = filtered.filter(incident => {
        const incidentDate = new Date(incident.createdAt);
        return incidentDate.getFullYear() === parseInt(selectedYear);
      });
    }
    // If filterPeriod is "all", no date filtering is applied

    setFilteredIncidents(filtered);
  }, [incidents, searchTerm, filterType, filterPeriod, filterDate]);

  // Show snackbar
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "open": return "error";
      case "in_progress": return "warning";
      case "resolved": return "success";
      case "closed": return "default";
      default: return "default";
    }
  };

  // Get type color
  const getTypeColor = (type) => {
    switch (type) {
      case "fire": return "error";
      case "hospital": return "success";
      case "police": return "info";
      case "barangay": return "warning";
      case "earthquake": return "error";
      case "flood": return "primary";
      default: return "default";
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleTimeString();
  };

  // Decode HTML entities
  const decodeHTMLEntities = (text) => {
    if (!text) return text;
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  };

  // Generate report data
  const generateReportData = () => {
    const totalIncidents = filteredIncidents.length;
    const openIncidents = filteredIncidents.filter(i => i.status === "open").length;
    const inProgressIncidents = filteredIncidents.filter(i => i.status === "in_progress").length;
    const resolvedIncidents = filteredIncidents.filter(i => i.status === "resolved").length;
    const closedIncidents = filteredIncidents.filter(i => i.status === "closed").length;

    const typeBreakdown = filteredIncidents.reduce((acc, incident) => {
      acc[incident.type] = (acc[incident.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalIncidents,
      openIncidents,
      inProgressIncidents,
      resolvedIncidents,
      closedIncidents,
      typeBreakdown,
      period: filterPeriod === "all" ? "All Time" :
        filterPeriod === "month" ? 
          new Date(filterDate + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" }) :
          filterDate.split("-")[0]
    };
  };

  // Download report as CSV with enhanced formatting
  const downloadReport = () => {
    const reportData = generateReportData();
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const adminName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "System Administrator";
    
    // CSV Header Section - Professional Format
    const csvContent = [
      ["═══════════════════════════════════════════════════════════════════════"],
      ["BARANGAY EMERGENCY ALERT & RESPONSE (BEAR) SYSTEM"],
      ["OFFICIAL INCIDENT MANAGEMENT REPORT"],
      ["═══════════════════════════════════════════════════════════════════════"],
      [""],
      ["REPORT INFORMATION"],
      ["Report Type:", "Incident Activity Report"],
      ["Report Period:", reportData.period],
      ["Date Generated:", new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
      ["Time Generated:", new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })],
      ["Prepared By:", adminName],
      ["Report Status:", "OFFICIAL"],
      ["Total Incidents:", reportData.totalIncidents],
      [""],
      ["═══════════════════════════════════════════════════════════════════════"],
      ["SECTION I: EXECUTIVE SUMMARY"],
      ["═══════════════════════════════════════════════════════════════════════"],
      [""],
      ["This report provides a comprehensive overview of all emergency incidents"],
      ["recorded and managed through the BEAR System during the specified period."],
      ["The data presented herein is accurate as of the generation date and time."],
      [""],
      ["INCIDENT STATUS DISTRIBUTION"],
      ["Status Category", "Total Count", "Percentage of Total", "Status Description"],
      ["Pending/Open", reportData.openIncidents, `${reportData.totalIncidents > 0 ? ((reportData.openIncidents / reportData.totalIncidents) * 100).toFixed(2) : 0}%`, "Awaiting Response"],
      ["In Progress", reportData.inProgressIncidents, `${reportData.totalIncidents > 0 ? ((reportData.inProgressIncidents / reportData.totalIncidents) * 100).toFixed(2) : 0}%`, "Currently Being Addressed"],
      ["Resolved", reportData.resolvedIncidents, `${reportData.totalIncidents > 0 ? ((reportData.resolvedIncidents / reportData.totalIncidents) * 100).toFixed(2) : 0}%`, "Successfully Completed"],
      ["Closed", reportData.closedIncidents, `${reportData.totalIncidents > 0 ? ((reportData.closedIncidents / reportData.totalIncidents) * 100).toFixed(2) : 0}%`, "Archived"],
      [""],
      ["═══════════════════════════════════════════════════════════════════════"],
      ["SECTION II: INCIDENT TYPE ANALYSIS"],
      ["═══════════════════════════════════════════════════════════════════════"],
      [""],
      ["Emergency Category", "Frequency Count", "Priority Level"],
      ...Object.entries(reportData.typeBreakdown).map(([type, count]) => {
        const priorityMap = {
          'fire': 'CRITICAL',
          'police': 'HIGH',
          'hospital': 'CRITICAL',
          'barangay': 'MODERATE',
          'earthquake': 'CRITICAL',
          'flood': 'HIGH'
        };
        return [
          type.toUpperCase(), 
          count,
          priorityMap[type.toLowerCase()] || 'STANDARD'
        ];
      }),
      [""],
      ["═══════════════════════════════════════════════════════════════════════"],
      ["SECTION III: DETAILED INCIDENT RECORDS"],
      ["═══════════════════════════════════════════════════════════════════════"],
      [""],
      [
        "Reference No.",
        "Incident Title", 
        "Emergency Category", 
        "Current Status", 
        "Reported By (Name)",
        "Contact Information",
        "Location (Latitude)", 
        "Location (Longitude)",
        "Date of Report", 
        "Time of Report",
        "Incident Description"
      ]
    ];

    // Add incident details with more fields
    filteredIncidents.forEach((incident, index) => {
      const reporterName = incident.reportedBy 
        ? `${incident.reportedBy.firstName || ''} ${incident.reportedBy.lastName || ''}`.trim()
        : "Anonymous/Unknown";
      
      const contact = incident.contact || "Not Provided";
      
      const latitude = typeof incident.location === 'object' && incident.location !== null
        ? incident.location.latitude || 'Not Available'
        : 'Not Available';
      
      const longitude = typeof incident.location === 'object' && incident.location !== null
        ? incident.location.longitude || 'Not Available'
        : 'Not Available';
      
      csvContent.push([
        `INC-${String(index + 1).padStart(4, '0')}`,
        decodeHTMLEntities(incident.name) || "Untitled Incident",
        incident.type ? incident.type.toUpperCase() : "UNCLASSIFIED",
        incident.status ? incident.status.toUpperCase().replace(/_/g, ' ') : "PENDING",
        reporterName,
        contact,
        latitude,
        longitude,
        formatDate(incident.createdAt),
        formatTime(incident.createdAt),
        decodeHTMLEntities(incident.description || "No detailed description provided").replace(/\n/g, " ").replace(/,/g, ";")
      ]);
    });

    // Footer Section
    csvContent.push(
      [""],
      ["═══════════════════════════════════════════════════════════════════════"],
      ["END OF REPORT"],
      ["═══════════════════════════════════════════════════════════════════════"],
      [""],
      ["CERTIFICATION"],
      [""],
      ["This report is hereby certified as true and accurate based on the records"],
      ["maintained by the Barangay Emergency Alert & Response (BEAR) System."],
      [""],
      ["Prepared by:", adminName],
      ["Position:", "System Administrator"],
      ["Date:", new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
      [""],
      ["_____________________________"],
      ["Digital Signature"],
      [""],
      ["═══════════════════════════════════════════════════════════════════════"],
      ["NOTICE"],
      ["This document contains confidential information intended solely for"],
      ["official barangay use. Unauthorized disclosure, copying, or distribution"],
      ["of this report is strictly prohibited."],
      ["═══════════════════════════════════════════════════════════════════════"],
      [""],
      ["Report Reference:", `RPT-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-6)}`],
      ["System Version:", "BEAR v1.0"],
      ["Generated via:", "BEAR Web Administration Portal"]
    );

    // Create CSV string
    const csvString = csvContent.map(row => 
      row.map(field => `"${String(field)}"`).join(",")
    ).join("\n");

    // Download file
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName = `BEAR-Official-Report-${reportData.period.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSnackbar("Official report downloaded successfully", "success");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
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
            Incident Reports
          </Typography>
          <IconButton color="inherit" onClick={fetchIncidents}>
            <Refresh />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 3, flex: 1, overflow: "hidden" }}>

        {/* Filters and Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  placeholder="Search incidents..."
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
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    label="Type"
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="barangay">Barangay</MenuItem>
                    <MenuItem value="fire">Fire</MenuItem>
                    <MenuItem value="hospital">Hospital</MenuItem>
                    <MenuItem value="police">Police</MenuItem>
                    <MenuItem value="earthquake">Earthquake</MenuItem>
                    <MenuItem value="flood">Flood</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Period</InputLabel>
                  <Select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                    label="Period"
                  >
                    <MenuItem value="all">All Time</MenuItem>
                    <MenuItem value="month">Month</MenuItem>
                    <MenuItem value="year">Year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {filterPeriod !== "all" && (
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type={filterPeriod === "month" ? "month" : "number"}
                    label={filterPeriod === "month" ? "Select Month" : "Select Year"}
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={downloadReport}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  Download Report
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Incidents Table */}
        <Card sx={{ flex: 1, overflow: "hidden" }}>
          <CardContent>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredIncidents.map((incident) => (
                    <TableRow key={incident._id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {decodeHTMLEntities(incident.name) || "Untitled"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {incident.description ? (
                            decodeHTMLEntities(incident.description).substring(0, 50) + 
                            (decodeHTMLEntities(incident.description).length > 50 ? "..." : "")
                          ) : ""}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.type || "Unknown"}
                          color={getTypeColor(incident.type)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.status || "Unknown"}
                          color={getStatusColor(incident.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {typeof incident.location === 'object' && incident.location !== null
                            ? `${incident.location.latitude || 'N/A'}, ${incident.location.longitude || 'N/A'}`
                            : incident.location || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(incident.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatTime(incident.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

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

export default Reports;
